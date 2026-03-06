import type { Dispatch } from '../client';
import type { SendEmailOptions, SendEmailResponse } from '../types';

/**
 * Email API for sending transactional emails
 *
 * @example
 * ```typescript
 * const dispatch = new Dispatch('dp_live_xxx...');
 *
 * // Send a simple email
 * await dispatch.email.send({
 *   to: 'user@example.com',
 *   subject: 'Welcome!',
 *   html: '<h1>Hello World</h1>'
 * });
 *
 * // Send using a template
 * await dispatch.email.send({
 *   to: 'user@example.com',
 *   templateSlug: 'welcome-email',
 *   templateVars: { name: 'John', company: 'Acme' }
 * });
 * ```
 */
export class Email {
  constructor(private readonly client: Dispatch) {}

  /**
   * Send an email
   *
   * @param options - Email options
   * @returns The sent message details
   *
   * @example
   * ```typescript
   * // Send with HTML content
   * const result = await dispatch.email.send({
   *   to: 'user@example.com',
   *   subject: 'Your order confirmation',
   *   html: '<h1>Order #12345</h1><p>Thank you for your order!</p>',
   *   priority: 'HIGH'
   * });
   *
   * console.log('Message ID:', result.id);
   * ```
   */
  async send(options: SendEmailOptions): Promise<SendEmailResponse> {
    this.validateOptions(options);

    return this.client.request<SendEmailResponse>('POST', '/v1/messages/email', {
      to: options.to,
      from: options.from,
      subject: options.subject,
      text: options.text,
      html: options.html,
      templateSlug: options.templateSlug,
      templateVars: options.templateVars,
      priority: options.priority,
      metadata: options.metadata,
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
      headers: options.headers,
    });
  }

  /**
   * Send multiple emails in a batch
   *
   * @param emails - Array of email options
   * @returns Array of sent message details
   *
   * @example
   * ```typescript
   * const results = await dispatch.email.sendBatch([
   *   { to: 'user1@example.com', subject: 'Hello', html: '<p>Hi User 1</p>' },
   *   { to: 'user2@example.com', subject: 'Hello', html: '<p>Hi User 2</p>' },
   * ]);
   * ```
   */
  async sendBatch(emails: SendEmailOptions[]): Promise<SendEmailResponse[]> {
    if (!emails || emails.length === 0) {
      throw new Error('At least one email is required');
    }

    if (emails.length > 100) {
      throw new Error('Maximum 100 emails per batch');
    }

    emails.forEach((email, index) => {
      try {
        this.validateOptions(email);
      } catch (error) {
        throw new Error(`Email at index ${index}: ${error instanceof Error ? error.message : 'validation failed'}`);
      }
    });

    const results = await this.client.request<{ messages: SendEmailResponse[] }>('POST', '/v1/messages/email/batch', {
      messages: emails.map((email) => ({
        to: email.to,
        from: email.from,
        subject: email.subject,
        text: email.text,
        html: email.html,
        templateSlug: email.templateSlug,
        templateVars: email.templateVars,
        priority: email.priority,
        metadata: email.metadata,
        replyTo: email.replyTo,
        cc: email.cc,
        bcc: email.bcc,
        headers: email.headers,
      })),
    });

    return results.messages;
  }

  private validateOptions(options: SendEmailOptions): void {
    if (!options.to) {
      throw new Error('Recipient (to) is required');
    }

    if (!this.isValidEmail(options.to)) {
      throw new Error('Invalid recipient email address');
    }

    if (options.from && !this.isValidEmail(options.from)) {
      throw new Error('Invalid sender email address');
    }

    // Must have either content or template
    const hasContent = options.subject || options.text || options.html;
    const hasTemplate = options.templateSlug;

    if (!hasContent && !hasTemplate) {
      throw new Error('Either subject/text/html or templateSlug is required');
    }

    // Validate CC/BCC
    if (options.cc) {
      options.cc.forEach((email) => {
        if (!this.isValidEmail(email)) {
          throw new Error(`Invalid CC email address: ${email}`);
        }
      });
    }

    if (options.bcc) {
      options.bcc.forEach((email) => {
        if (!this.isValidEmail(email)) {
          throw new Error(`Invalid BCC email address: ${email}`);
        }
      });
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
