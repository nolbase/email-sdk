/**
 * @nolbase/dispatch - Official Node.js SDK for NolBase Dispatch
 *
 * Send transactional emails and SMS with ease.
 *
 * @example
 * ```typescript
 * import { Dispatch } from '@nolbase/dispatch';
 *
 * const dispatch = new Dispatch('dp_live_xxx...');
 *
 * // Send an email
 * await dispatch.email.send({
 *   to: 'user@example.com',
 *   subject: 'Welcome!',
 *   html: '<h1>Hello World</h1>'
 * });
 *
 * // Send an SMS
 * await dispatch.sms.send({
 *   to: '+2348012345678',
 *   text: 'Your OTP is 123456'
 * });
 * ```
 */

export { Dispatch } from './client';
export { Email } from './resources/email';
export { SMS } from './resources/sms';
export { Templates } from './resources/templates';

// Types
export type {
  DispatchConfig,
  SendEmailOptions,
  SendEmailResponse,
  SendSmsOptions,
  SendSmsResponse,
  MessageStatus,
  MessageStatusResponse,
  Template,
  TemplateRenderOptions,
  TemplateRenderResponse,
  DispatchError,
  RateLimitInfo,
} from './types';
