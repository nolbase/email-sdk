import type { Dispatch } from '../client';
import type { SendSmsOptions, SendSmsResponse } from '../types';

/**
 * SMS API for sending text messages
 *
 * @example
 * ```typescript
 * const dispatch = new Dispatch('dp_live_xxx...');
 *
 * // Send a simple SMS
 * await dispatch.sms.send({
 *   to: '+2348012345678',
 *   text: 'Your OTP is 123456. Valid for 10 minutes.'
 * });
 *
 * // Send using a template
 * await dispatch.sms.send({
 *   to: '+2348012345678',
 *   templateSlug: 'otp-message',
 *   templateVars: { otp: '123456' }
 * });
 * ```
 */
export class SMS {
  constructor(private readonly client: Dispatch) {}

  /**
   * Send an SMS
   *
   * @param options - SMS options
   * @returns The sent message details
   *
   * @example
   * ```typescript
   * const result = await dispatch.sms.send({
   *   to: '+2348012345678',
   *   text: 'Your verification code is 123456',
   *   priority: 'CRITICAL'
   * });
   *
   * console.log('Message ID:', result.id);
   * console.log('Segments used:', result.segments);
   * ```
   */
  async send(options: SendSmsOptions): Promise<SendSmsResponse> {
    this.validateOptions(options);

    return this.client.request<SendSmsResponse>('POST', '/v1/messages/sms', {
      to: this.normalizePhoneNumber(options.to),
      from: options.from,
      text: options.text,
      templateSlug: options.templateSlug,
      templateVars: options.templateVars,
      priority: options.priority,
      metadata: options.metadata,
    });
  }

  /**
   * Send multiple SMS messages in a batch
   *
   * @param messages - Array of SMS options
   * @returns Array of sent message details
   *
   * @example
   * ```typescript
   * const results = await dispatch.sms.sendBatch([
   *   { to: '+2348012345678', text: 'Hello User 1' },
   *   { to: '+2348087654321', text: 'Hello User 2' },
   * ]);
   * ```
   */
  async sendBatch(messages: SendSmsOptions[]): Promise<SendSmsResponse[]> {
    if (!messages || messages.length === 0) {
      throw new Error('At least one message is required');
    }

    if (messages.length > 100) {
      throw new Error('Maximum 100 messages per batch');
    }

    messages.forEach((msg, index) => {
      try {
        this.validateOptions(msg);
      } catch (error) {
        throw new Error(`Message at index ${index}: ${error instanceof Error ? error.message : 'validation failed'}`);
      }
    });

    const results = await this.client.request<{ messages: SendSmsResponse[] }>('POST', '/v1/messages/sms/batch', {
      messages: messages.map((msg) => ({
        to: this.normalizePhoneNumber(msg.to),
        from: msg.from,
        text: msg.text,
        templateSlug: msg.templateSlug,
        templateVars: msg.templateVars,
        priority: msg.priority,
        metadata: msg.metadata,
      })),
    });

    return results.messages;
  }

  /**
   * Calculate the number of SMS segments for a message
   *
   * @param text - The message text
   * @returns The number of segments required
   *
   * @example
   * ```typescript
   * const segments = dispatch.sms.calculateSegments('Hello World!');
   * console.log('Segments:', segments); // 1
   * ```
   */
  calculateSegments(text: string): number {
    if (!text) return 0;

    // Check for non-GSM characters (requires UCS-2 encoding)
    const isUnicode = this.containsUnicodeCharacters(text);

    if (isUnicode) {
      // UCS-2: 70 chars for single segment, 67 for multi-part
      if (text.length <= 70) return 1;
      return Math.ceil(text.length / 67);
    } else {
      // GSM-7: 160 chars for single segment, 153 for multi-part
      if (text.length <= 160) return 1;
      return Math.ceil(text.length / 153);
    }
  }

  private validateOptions(options: SendSmsOptions): void {
    if (!options.to) {
      throw new Error('Recipient (to) is required');
    }

    if (!this.isValidPhoneNumber(options.to)) {
      throw new Error('Invalid phone number. Must be in E.164 format (e.g., +2348012345678)');
    }

    // Must have either text or template
    if (!options.text && !options.templateSlug) {
      throw new Error('Either text or templateSlug is required');
    }

    // Check text length
    if (options.text && options.text.length > 1600) {
      throw new Error('Text message exceeds maximum length of 1600 characters');
    }
  }

  private isValidPhoneNumber(phone: string): boolean {
    // E.164 format: + followed by 10-15 digits
    const e164Regex = /^\+[1-9]\d{9,14}$/;
    return e164Regex.test(this.normalizePhoneNumber(phone));
  }

  private normalizePhoneNumber(phone: string): string {
    // Remove spaces, dashes, and parentheses
    let normalized = phone.replace(/[\s\-()]/g, '');

    // Add + if not present and starts with country code
    if (!normalized.startsWith('+') && /^\d{10,15}$/.test(normalized)) {
      // Assume Nigerian number if 11 digits starting with 0
      if (normalized.startsWith('0') && normalized.length === 11) {
        normalized = '+234' + normalized.substring(1);
      } else {
        normalized = '+' + normalized;
      }
    }

    return normalized;
  }

  private containsUnicodeCharacters(text: string): boolean {
    // GSM-7 character set
    const gsm7Chars = '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
    const gsm7Extension = '|^€{}[]~\\';

    for (const char of text) {
      if (!gsm7Chars.includes(char) && !gsm7Extension.includes(char)) {
        return true;
      }
    }

    return false;
  }
}
