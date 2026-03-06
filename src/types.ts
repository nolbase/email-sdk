/**
 * Configuration options for the Dispatch client
 */
export interface DispatchConfig {
  /**
   * API key for authentication (starts with dp_live_ or dp_test_)
   */
  apiKey: string;

  /**
   * Base URL for the API (defaults to https://api.dispatch.nolbase.io)
   */
  baseUrl?: string;

  /**
   * Request timeout in milliseconds (defaults to 30000)
   */
  timeout?: number;

  /**
   * Number of retry attempts for failed requests (defaults to 3)
   */
  maxRetries?: number;

  /**
   * Custom headers to include in all requests
   */
  headers?: Record<string, string>;
}

/**
 * Message priority levels
 */
export type MessagePriority = 'CRITICAL' | 'HIGH' | 'NORMAL';

/**
 * Message delivery status
 */
export type MessageStatus = 'QUEUED' | 'SENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED' | 'COMPLAINED';

/**
 * Options for sending an email
 */
export interface SendEmailOptions {
  /**
   * Recipient email address
   */
  to: string;

  /**
   * Sender email address (must be from a verified domain)
   * If not provided, uses the default sender
   */
  from?: string;

  /**
   * Email subject line
   */
  subject?: string;

  /**
   * Plain text content
   */
  text?: string;

  /**
   * HTML content
   */
  html?: string;

  /**
   * Template slug to use instead of subject/text/html
   */
  templateSlug?: string;

  /**
   * Variables to substitute in the template
   */
  templateVars?: Record<string, unknown>;

  /**
   * Message priority (affects delivery order)
   */
  priority?: MessagePriority;

  /**
   * Custom metadata to attach to the message
   */
  metadata?: Record<string, unknown>;

  /**
   * Reply-to email address
   */
  replyTo?: string;

  /**
   * CC recipients
   */
  cc?: string[];

  /**
   * BCC recipients
   */
  bcc?: string[];

  /**
   * Custom headers
   */
  headers?: Record<string, string>;
}

/**
 * Response from sending an email
 */
export interface SendEmailResponse {
  /**
   * Unique message ID
   */
  id: string;

  /**
   * Current message status
   */
  status: MessageStatus;

  /**
   * Recipient email address
   */
  to: string;

  /**
   * Sender email address
   */
  from: string;

  /**
   * Timestamp when the message was queued
   */
  queuedAt: string;
}

/**
 * Options for sending an SMS
 */
export interface SendSmsOptions {
  /**
   * Recipient phone number in E.164 format (e.g., +2348012345678)
   */
  to: string;

  /**
   * Sender ID (must be registered and approved)
   * If not provided, uses the default sender
   */
  from?: string;

  /**
   * SMS text content (max 1600 characters)
   */
  text?: string;

  /**
   * Template slug to use instead of text
   */
  templateSlug?: string;

  /**
   * Variables to substitute in the template
   */
  templateVars?: Record<string, unknown>;

  /**
   * Message priority (affects delivery order)
   */
  priority?: MessagePriority;

  /**
   * Custom metadata to attach to the message
   */
  metadata?: Record<string, unknown>;
}

/**
 * Response from sending an SMS
 */
export interface SendSmsResponse {
  /**
   * Unique message ID
   */
  id: string;

  /**
   * Current message status
   */
  status: MessageStatus;

  /**
   * Recipient phone number
   */
  to: string;

  /**
   * Sender ID
   */
  from: string;

  /**
   * Number of SMS segments used
   */
  segments: number;

  /**
   * Timestamp when the message was queued
   */
  queuedAt: string;
}

/**
 * Response when checking message status
 */
export interface MessageStatusResponse {
  /**
   * Unique message ID
   */
  id: string;

  /**
   * Message channel (EMAIL or SMS)
   */
  channel: 'EMAIL' | 'SMS';

  /**
   * Current message status
   */
  status: MessageStatus;

  /**
   * Recipient address
   */
  to: string;

  /**
   * Sender address
   */
  from: string;

  /**
   * Timestamp when the message was queued
   */
  queuedAt: string;

  /**
   * Timestamp when the message was sent
   */
  sentAt?: string;

  /**
   * Timestamp when the message was delivered
   */
  deliveredAt?: string;

  /**
   * Timestamp when the message failed
   */
  failedAt?: string;

  /**
   * Error message if failed
   */
  error?: string;

  /**
   * Message events/history
   */
  events: Array<{
    type: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
  }>;
}

/**
 * Template definition
 */
export interface Template {
  /**
   * Template ID
   */
  id: string;

  /**
   * Template slug (used for sending)
   */
  slug: string;

  /**
   * Template name
   */
  name: string;

  /**
   * Template channel (EMAIL or SMS)
   */
  channel: 'EMAIL' | 'SMS';

  /**
   * Email subject template (email only)
   */
  subject?: string;

  /**
   * Template content
   */
  content: string;

  /**
   * Template variables
   */
  variables: Array<{
    name: string;
    type?: string;
    required?: boolean;
    default?: string;
  }>;

  /**
   * Whether template is active
   */
  isActive: boolean;

  /**
   * Template version
   */
  version: number;
}

/**
 * Options for rendering a template
 */
export interface TemplateRenderOptions {
  /**
   * Template slug
   */
  slug: string;

  /**
   * Template channel
   */
  channel: 'EMAIL' | 'SMS';

  /**
   * Variables to substitute
   */
  variables: Record<string, unknown>;
}

/**
 * Response from rendering a template
 */
export interface TemplateRenderResponse {
  /**
   * Rendered subject (email only)
   */
  subject?: string;

  /**
   * Rendered plain text content
   */
  text?: string;

  /**
   * Rendered HTML content (email only)
   */
  html?: string;
}

/**
 * Dispatch API error
 */
export interface DispatchError {
  /**
   * Error code
   */
  code: string;

  /**
   * Error message
   */
  message: string;

  /**
   * HTTP status code
   */
  statusCode: number;

  /**
   * Additional error details
   */
  details?: Record<string, unknown>;

  /**
   * Rate limit info (if rate limited)
   */
  rateLimit?: RateLimitInfo;
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  /**
   * Maximum requests per window
   */
  limit: number;

  /**
   * Remaining requests in current window
   */
  remaining: number;

  /**
   * Timestamp when the rate limit resets
   */
  resetAt: string;

  /**
   * Seconds until the rate limit resets
   */
  retryAfter: number;
}
