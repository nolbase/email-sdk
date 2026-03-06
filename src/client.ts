import { Email } from './resources/email';
import { SMS } from './resources/sms';
import { Templates } from './resources/templates';
import type { DispatchConfig, DispatchError, RateLimitInfo, MessageStatusResponse } from './types';

const DEFAULT_BASE_URL = 'https://api.dispatch.nolbase.io';
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_MAX_RETRIES = 3;

/**
 * Dispatch API client for sending transactional emails and SMS
 *
 * @example
 * ```typescript
 * const dispatch = new Dispatch('dp_live_xxx...');
 *
 * await dispatch.email.send({
 *   to: 'user@example.com',
 *   subject: 'Welcome!',
 *   html: '<h1>Hello</h1>'
 * });
 * ```
 */
export class Dispatch {
  private readonly config: Required<DispatchConfig>;

  /**
   * Email API for sending transactional emails
   */
  readonly email: Email;

  /**
   * SMS API for sending text messages
   */
  readonly sms: SMS;

  /**
   * Templates API for managing message templates
   */
  readonly templates: Templates;

  /**
   * Create a new Dispatch client
   *
   * @param apiKey - Your Dispatch API key (starts with dp_live_ or dp_test_)
   * @param config - Optional configuration options
   */
  constructor(apiKey: string, config?: Partial<Omit<DispatchConfig, 'apiKey'>>) {
    if (!apiKey) {
      throw new Error('API key is required');
    }

    if (!apiKey.startsWith('dp_live_') && !apiKey.startsWith('dp_test_')) {
      throw new Error('Invalid API key format. API keys should start with dp_live_ or dp_test_');
    }

    this.config = {
      apiKey,
      baseUrl: config?.baseUrl || DEFAULT_BASE_URL,
      timeout: config?.timeout || DEFAULT_TIMEOUT,
      maxRetries: config?.maxRetries || DEFAULT_MAX_RETRIES,
      headers: config?.headers || {},
    };

    // Initialize resources
    this.email = new Email(this);
    this.sms = new SMS(this);
    this.templates = new Templates(this);
  }

  /**
   * Check if using test mode
   */
  get isTestMode(): boolean {
    return this.config.apiKey.startsWith('dp_test_');
  }

  /**
   * Get the status of a message by ID
   *
   * @param messageId - The message ID to check
   * @returns The message status
   */
  async getMessageStatus(messageId: string): Promise<MessageStatusResponse> {
    return this.request<MessageStatusResponse>('GET', `/v1/messages/${messageId}`);
  }

  /**
   * Make an API request
   *
   * @internal
   */
  async request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
    retryCount = 0
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': '@nolbase/dispatch-sdk/1.0.0',
      ...this.config.headers,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle rate limiting
      if (response.status === 429) {
        const rateLimitInfo = this.parseRateLimitHeaders(response.headers);

        if (retryCount < this.config.maxRetries) {
          const retryAfter = rateLimitInfo?.retryAfter || Math.pow(2, retryCount) * 1000;
          await this.sleep(retryAfter * 1000);
          return this.request<T>(method, path, body, retryCount + 1);
        }

        throw this.createError({
          code: 'RATE_LIMITED',
          message: 'Rate limit exceeded',
          statusCode: 429,
          rateLimit: rateLimitInfo,
        });
      }

      // Handle server errors with retry
      if (response.status >= 500 && retryCount < this.config.maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000;
        await this.sleep(delay);
        return this.request<T>(method, path, body, retryCount + 1);
      }

      // Parse response
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (await response.json()) as any;

      if (!response.ok) {
        throw this.createError({
          code: (data.code as string) || 'API_ERROR',
          message: (data.message as string) || 'An error occurred',
          statusCode: response.status,
          details: data.details as Record<string, unknown> | undefined,
        });
      }

      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw this.createError({
          code: 'TIMEOUT',
          message: 'Request timed out',
          statusCode: 0,
        });
      }

      if (this.isDispatchError(error)) {
        throw error;
      }

      throw this.createError({
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network error',
        statusCode: 0,
      });
    }
  }

  private parseRateLimitHeaders(headers: Headers): RateLimitInfo | undefined {
    const limit = headers.get('X-RateLimit-Limit');
    const remaining = headers.get('X-RateLimit-Remaining');
    const resetAt = headers.get('X-RateLimit-Reset');
    const retryAfter = headers.get('Retry-After');

    if (limit && remaining && resetAt) {
      return {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        resetAt,
        retryAfter: retryAfter ? parseInt(retryAfter, 10) : 60,
      };
    }

    return undefined;
  }

  private createError(error: DispatchError): Error & DispatchError {
    const err = new Error(error.message) as Error & DispatchError;
    err.code = error.code;
    err.statusCode = error.statusCode;
    err.details = error.details;
    err.rateLimit = error.rateLimit;
    err.name = 'DispatchError';
    return err;
  }

  private isDispatchError(error: unknown): error is Error & DispatchError {
    return error instanceof Error && 'code' in error && 'statusCode' in error;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
