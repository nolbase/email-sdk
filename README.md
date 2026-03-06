# @nolbase/dispatch

Official Node.js SDK for NolBase Dispatch — transactional email and SMS delivery API.

## Installation

```bash
npm install @nolbase/dispatch
# or
pnpm add @nolbase/dispatch
```

**Requirements:** Node.js 18+

## Quick Start

```typescript
import { Dispatch } from '@nolbase/dispatch';

const dispatch = new Dispatch('dp_live_xxx...');

// Send an email
const result = await dispatch.email.send({
  to: 'user@example.com',
  subject: 'Welcome!',
  html: '<h1>Hello!</h1><p>Thanks for signing up.</p>',
});

console.log('Message ID:', result.id);    // "msg_xxxxx"
console.log('Status:', result.status);     // "QUEUED"
```

## Getting Your API Key

1. Log in to your NolBase workspace
2. Navigate to **Dispatch > API Keys**
3. Click **Create API Key**
4. Choose environment:
   - `dp_live_*` — delivers real messages
   - `dp_test_*` — sandbox mode, nothing sent
5. Store the key securely — it's only shown once

## Domain Setup

Before sending emails, verify your sending domain:

1. Navigate to **Dispatch > Domains** and add your domain
2. Add these DNS records:

| Record | Host | Type | Value |
|--------|------|------|-------|
| Verification | `yourdomain.com` | TXT | `nolbase-verify=<token>` |
| SPF | `yourdomain.com` | TXT | `v=spf1 include:_spf.nolbase.io ~all` |
| DKIM | `nolbase._domainkey.yourdomain.com` | TXT | `v=DKIM1; k=rsa; p=<public-key>` |
| DMARC | `_dmarc.yourdomain.com` | TXT | `v=DMARC1; p=none; rua=mailto:dmarc@nolbase.io` |

3. Click **Verify** — the system checks all records automatically

## Configuration

```typescript
const dispatch = new Dispatch('dp_live_xxx...', {
  baseUrl: 'https://api.dispatch.nolbase.io', // default
  timeout: 30000,                               // 30s default
  maxRetries: 3,                                // default
  headers: {},                                  // custom headers
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | `string` | `https://api.dispatch.nolbase.io` | API base URL |
| `timeout` | `number` | `30000` | Request timeout (ms) |
| `maxRetries` | `number` | `3` | Retry attempts for 429/5xx errors |
| `headers` | `object` | `{}` | Custom HTTP headers |

## Email API

### Send an Email

```typescript
const result = await dispatch.email.send({
  to: 'recipient@example.com',
  from: 'hello@yourdomain.com',   // optional, uses workspace default
  subject: 'Order Confirmed',
  html: '<h1>Order #12345</h1><p>Your order is on its way.</p>',
  text: 'Order #12345 — Your order is on its way.', // plain text fallback
  priority: 'HIGH',                // CRITICAL | HIGH | NORMAL
  replyTo: 'support@yourdomain.com',
  cc: ['manager@yourdomain.com'],
  bcc: ['archive@yourdomain.com'],
  metadata: { orderId: '12345' },  // custom data for your reference
  headers: { 'X-Entity-Ref-ID': 'order-12345' },
});
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | `string` | Yes | Recipient email |
| `from` | `string` | No | Sender email (must be on a verified domain) |
| `subject` | `string` | Conditional | Required unless using `templateSlug` |
| `html` | `string` | Conditional | HTML content (or use `templateSlug`) |
| `text` | `string` | No | Plain text fallback |
| `templateSlug` | `string` | Conditional | Use a saved template instead of inline content |
| `templateVars` | `object` | No | Variables for template substitution |
| `priority` | `string` | No | `CRITICAL`, `HIGH`, or `NORMAL` (default) |
| `replyTo` | `string` | No | Reply-to address |
| `cc` | `string[]` | No | CC recipients |
| `bcc` | `string[]` | No | BCC recipients |
| `metadata` | `object` | No | Custom key-value data attached to the message |
| `headers` | `object` | No | Custom email headers |

**Response:**

```typescript
{
  id: "msg_abc123",
  status: "QUEUED",
  to: "recipient@example.com",
  from: "hello@yourdomain.com",
  queuedAt: "2026-03-05T10:30:00.000Z"
}
```

### Send with a Template

```typescript
await dispatch.email.send({
  to: 'user@example.com',
  templateSlug: 'welcome-email',
  templateVars: {
    name: 'John Doe',
    company: 'Acme Inc',
    activationLink: 'https://example.com/activate/xyz',
  },
});
```

### Batch Send (up to 100)

```typescript
const results = await dispatch.email.sendBatch([
  { to: 'user1@example.com', subject: 'Hello', html: '<p>Hi User 1</p>' },
  { to: 'user2@example.com', subject: 'Hello', html: '<p>Hi User 2</p>' },
  // ... up to 100 emails per batch
]);

console.log(`Sent ${results.length} emails`);
```

## SMS API

### Send an SMS

```typescript
const result = await dispatch.sms.send({
  to: '+2348012345678',
  text: 'Your verification code is 123456. Valid for 10 minutes.',
  priority: 'CRITICAL',
});

console.log('Segments used:', result.segments);
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | `string` | Yes | Phone number in E.164 format (`+234...`) |
| `from` | `string` | No | Registered sender ID |
| `text` | `string` | Conditional | SMS body (max 1600 chars), or use `templateSlug` |
| `templateSlug` | `string` | Conditional | Use a saved template |
| `templateVars` | `object` | No | Template variables |
| `priority` | `string` | No | `CRITICAL`, `HIGH`, or `NORMAL` |
| `metadata` | `object` | No | Custom data |

**Phone number formats accepted:**

| Input | Normalized |
|-------|-----------|
| `+2348012345678` | `+2348012345678` |
| `08012345678` | `+2348012345678` |
| `234-801-234-5678` | `+2348012345678` |

### Batch Send SMS

```typescript
const results = await dispatch.sms.sendBatch([
  { to: '+2348012345678', text: 'Your OTP is 111111' },
  { to: '+2349012345678', text: 'Your OTP is 222222' },
]);
```

### Calculate SMS Segments

Check how many segments a message will use before sending:

```typescript
const segments = dispatch.sms.calculateSegments('Your order has shipped.');
console.log(segments); // 1

const longMsg = dispatch.sms.calculateSegments('A'.repeat(200));
console.log(longMsg); // 2 (GSM-7: 160 per segment, 153 per part in multipart)
```

**Segment limits:**

| Encoding | Single SMS | Per segment (multipart) |
|----------|-----------|------------------------|
| GSM-7 (ASCII) | 160 chars | 153 chars |
| UCS-2 (Unicode/emoji) | 70 chars | 67 chars |

## Templates API

### List Templates

```typescript
const templates = await dispatch.templates.list();

// Filter by channel
const emailTemplates = await dispatch.templates.list({ channel: 'EMAIL' });
const smsTemplates = await dispatch.templates.list({ channel: 'SMS' });

// Search
const results = await dispatch.templates.list({ search: 'welcome' });
```

### Get a Template

```typescript
const template = await dispatch.templates.get('welcome-email', 'EMAIL');
console.log('Variables:', template.variables);
// [{ name: 'name', type: 'string', required: true }, ...]
```

### Render a Template (Preview)

```typescript
const rendered = await dispatch.templates.render({
  slug: 'welcome-email',
  channel: 'EMAIL',
  variables: { name: 'John', company: 'Acme' },
});

console.log('Subject:', rendered.subject);
console.log('HTML:', rendered.html);
```

### Validate Template Variables

Check if your variables satisfy the template requirements before sending:

```typescript
const result = await dispatch.templates.validate(
  'welcome-email',
  'EMAIL',
  { name: 'John' },
);

console.log(result.valid);    // false
console.log(result.missing);  // ['company', 'activationLink']
console.log(result.extra);    // []
```

## Message Status

### Check Delivery Status

```typescript
const status = await dispatch.getMessageStatus('msg_abc123');

console.log('Status:', status.status);
console.log('Delivered at:', status.deliveredAt);
console.log('Events:', status.events);
```

**Response:**

```typescript
{
  id: "msg_abc123",
  channel: "EMAIL",
  status: "DELIVERED",
  to: "user@example.com",
  from: "hello@yourdomain.com",
  queuedAt: "2026-03-05T10:30:00.000Z",
  sentAt: "2026-03-05T10:30:01.000Z",
  deliveredAt: "2026-03-05T10:30:03.000Z",
  events: [
    { type: "QUEUED", timestamp: "2026-03-05T10:30:00.000Z" },
    { type: "SENT", timestamp: "2026-03-05T10:30:01.000Z" },
    { type: "DELIVERED", timestamp: "2026-03-05T10:30:03.000Z" }
  ]
}
```

### Message Lifecycle

```
QUEUED → SENDING → SENT → DELIVERED
                       ↘ BOUNCED
                       ↘ FAILED
                       ↘ REJECTED
                       ↘ DEFERRED → SENT → DELIVERED
```

| Status | Description |
|--------|-------------|
| `QUEUED` | In queue, waiting to be processed |
| `SENDING` | Being transmitted to mail server |
| `SENT` | Accepted by receiving mail server |
| `DELIVERED` | Confirmed delivered to recipient inbox |
| `BOUNCED` | Permanently or temporarily rejected |
| `FAILED` | Delivery failed after all retries |
| `REJECTED` | Rejected by sending server (suppressed address, etc.) |
| `DEFERRED` | Temporarily delayed, will retry |

## Error Handling

```typescript
try {
  await dispatch.email.send({
    to: 'user@example.com',
    subject: 'Test',
    html: '<p>Test</p>',
  });
} catch (error) {
  if (error.name === 'DispatchError') {
    console.log('Code:', error.code);
    console.log('Message:', error.message);
    console.log('HTTP Status:', error.statusCode);

    if (error.code === 'RATE_LIMITED') {
      console.log('Retry after:', error.rateLimit?.retryAfter, 'seconds');
    }
  }
}
```

**Error codes:**

| Code | HTTP Status | Description |
|------|------------|-------------|
| `RATE_LIMITED` | 429 | Rate limit exceeded. Check `retryAfter`. |
| `TIMEOUT` | — | Request timed out (default 30s) |
| `NETWORK_ERROR` | — | Could not connect to API |
| `API_ERROR` | 4xx/5xx | Server returned an error. Check `message` and `details`. |

**Automatic retries:** The SDK automatically retries on 429 and 5xx errors with exponential backoff (2s, 4s, 8s). After `maxRetries` attempts, the error is thrown.

## Rate Limits

API keys have three tiers of rate limits:

| Tier | Default | Resets |
|------|---------|--------|
| Per-minute | 100 requests | Every 60 seconds |
| Per-day | 10,000 messages | Midnight UTC |
| Per-month | 100,000 messages | 1st of month UTC |

When rate limited, the SDK automatically retries. If retries are exhausted, a `RATE_LIMITED` error is thrown with `retryAfter` indicating seconds to wait.

Limits can be adjusted in **Dispatch > API Keys** settings.

## Webhooks

Set up webhooks in **Dispatch > Webhooks** to receive real-time delivery events.

**Available events:**

| Event | Trigger |
|-------|---------|
| `EMAIL_QUEUED` | Email added to send queue |
| `EMAIL_SENT` | Accepted by receiving server |
| `EMAIL_DELIVERED` | Delivered to inbox |
| `EMAIL_BOUNCED` | Hard or soft bounce |
| `EMAIL_REJECTED` | Rejected (suppressed, etc.) |
| `EMAIL_DEFERRED` | Temporarily delayed |
| `EMAIL_OPENED` | Recipient opened email |
| `EMAIL_CLICKED` | Recipient clicked a link |
| `EMAIL_COMPLAINT` | Marked as spam |
| `SMS_QUEUED` | SMS added to queue |
| `SMS_SENT` | SMS sent to carrier |
| `SMS_DELIVERED` | SMS delivered |
| `SMS_FAILED` | SMS delivery failed |
| `SMS_EXPIRED` | SMS expired before delivery |

**Webhook payload:**

```json
{
  "event": "EMAIL_DELIVERED",
  "timestamp": "2026-03-05T10:30:03.000Z",
  "messageId": "msg_abc123",
  "to": "user@example.com",
  "channel": "EMAIL",
  "status": "DELIVERED",
  "deliveredAt": "2026-03-05T10:30:03.000Z",
  "metadata": { "orderId": "12345" }
}
```

**Verifying webhook signatures:** Each webhook endpoint has a secret. Validate incoming requests by comparing the HMAC-SHA256 signature in the request headers against the payload signed with your webhook secret.

## Test Mode

Use test API keys (`dp_test_*`) for development. Messages are validated but never actually sent.

```typescript
const dispatch = new Dispatch('dp_test_xxx...');

// Validates input, returns mock response — nothing is sent
await dispatch.email.send({
  to: 'test@example.com',
  subject: 'Test',
  html: '<p>This is a test</p>',
});

console.log(dispatch.isTestMode); // true
```

## TypeScript

The SDK includes full type definitions. All request/response types are exported:

```typescript
import {
  Dispatch,
  SendEmailOptions,
  SendEmailResponse,
  SendSmsOptions,
  SendSmsResponse,
  MessageStatus,
  MessageStatusResponse,
  Template,
  TemplateRenderOptions,
  TemplateRenderResponse,
  DispatchConfig,
  DispatchError,
  RateLimitInfo,
} from '@nolbase/dispatch';
```

## Self-Hosting

If you're running your own NolBase instance, point the SDK to your backend:

```typescript
const dispatch = new Dispatch('dp_live_xxx...', {
  baseUrl: 'https://your-nolbase-instance.com/api/v1',
});
```

## License

MIT
