# QCK JavaScript SDK

Official TypeScript/JavaScript SDK for the [QCK](https://qck.sh) API. Create short links, track conversions, query analytics, and manage webhooks.

## Installation

```bash
npm install @qcksh/sdk
```

## Quick Start

```typescript
import { QCK } from '@qcksh/sdk';

const qck = new QCK({ apiKey: 'qck_your_api_key' });

// Create a short link
const link = await qck.links.create({ url: 'https://example.com' });
console.log(link.short_url); // https://qck.sh/abc123

// Get analytics
const summary = await qck.analytics.summary({ days: 30 });
console.log(`${summary.total_clicks} clicks, ${summary.unique_visitors} visitors`);
```

## Resources

### Links

```typescript
// Create
const link = await qck.links.create({
  url: 'https://example.com',
  custom_alias: 'my-link',
  title: 'Example',
  tags: ['marketing', 'q1'],
  expires_at: '2026-12-31T00:00:00Z',
  domain_id: 'dom_123', // optional custom domain
});

// List
const result = await qck.links.list({ page: 1, limit: 25, search: 'example' });

// Get / Update / Delete
const link = await qck.links.get('link_id');
const updated = await qck.links.update('link_id', { title: 'New Title', is_active: false });
await qck.links.delete('link_id');

// Bulk create
const links = await qck.links.bulkCreate({
  links: [
    { url: 'https://example.com/a' },
    { url: 'https://example.com/b' },
    { url: 'https://example.com/c' },
  ],
});

// Stats
const stats = await qck.links.getStats('link_id');
console.log(`${stats.total_clicks} total, ${stats.unique_clicks} unique`);
```

### Analytics

```typescript
// Summary
const summary = await qck.analytics.summary({
  days: 30,
  link_id: 'link_id', // optional, omit for org-wide
});

// Timeseries
const points = await qck.analytics.timeseries({
  days: 7,
  interval: 'day',
});
for (const point of points) {
  console.log(`${point.timestamp}: ${point.clicks} clicks`);
}
```

### Conversions

```typescript
// Track a conversion (server-side)
await qck.conversions.track({
  link_id: 'link_id',
  visitor_id: 'vis_abc123',
  name: 'purchase',
  revenue: 49.99,
  currency: 'USD',
  event_data: { plan: 'pro' },
});

// Query conversion metrics
const summary = await qck.conversions.summary({ period: '30d' });
console.log(`${summary.total_conversions} conversions, $${summary.total_revenue.toFixed(2)} revenue`);

// Timeseries
const points = await qck.conversions.timeseries({
  period: '30d',
  interval: 'day',
});

// Breakdown by dimension
const bySource = await qck.conversions.breakdown({
  dimension: 'source',
  period: '30d',
});
for (const entry of bySource) {
  console.log(`${entry.label}: ${entry.conversions} (${(entry.conversion_rate * 100).toFixed(1)}%)`);
}
```

### Journey Tracking

```typescript
// Ingest events
await qck.journey.ingest({
  events: [
    {
      link_id: 'link_id',
      visitor_id: 'vis_abc123',
      session_id: 'sess_1',
      event_type: 'page_view',
      page_url: 'https://example.com/pricing',
      page_title: 'Pricing',
    },
    {
      link_id: 'link_id',
      visitor_id: 'vis_abc123',
      session_id: 'sess_1',
      event_type: 'custom',
      event_name: 'cta_click',
      page_url: 'https://example.com/pricing',
    },
  ],
});

// Link journey summary
const summary = await qck.journey.getSummary('link_id', { period: '30d' });
console.log(`${summary.total_visitors} visitors across ${summary.total_sessions} sessions`);

// Funnel analysis
const funnel = await qck.journey.getFunnel('link_id', {
  steps: ['page_view', 'cta_click', 'purchase'],
  period: '30d',
});
for (const step of funnel.steps) {
  console.log(`${step.step_name}: ${step.visitors} (${(step.conversion_rate * 100).toFixed(1)}%)`);
}

// List sessions and events
const sessions = await qck.journey.listSessions('link_id', { period: '7d', limit: 10 });
const events = await qck.journey.listEvents('link_id', { event_type: 'custom', limit: 50 });
```

### Webhooks

```typescript
// Create
const webhook = await qck.webhooks.create({
  url: 'https://example.com/webhook',
  events: ['link.clicked', 'link.created'],
  description: 'Production webhook',
});

// List / Get / Update / Delete
const webhooks = await qck.webhooks.list();
const wh = await qck.webhooks.get('webhook_id');
const updated = await qck.webhooks.update('webhook_id', { is_active: false });
await qck.webhooks.delete('webhook_id');

// View deliveries
const deliveries = await qck.webhooks.listDeliveries('webhook_id', { limit: 20 });

// Send test event
await qck.webhooks.test('webhook_id');
```

### Domains

```typescript
const domains = await qck.domains.list('org_id');
for (const domain of domains) {
  console.log(`${domain.domain} (verified: ${domain.is_verified})`);
}
```

## Configuration

```typescript
const qck = new QCK({
  apiKey: 'qck_your_api_key',
  baseUrl: 'https://api.qck.sh/public-api/v1', // default
  timeout: 30_000, // milliseconds, default 30000
  retries: 3,      // automatic retries, default 3
});
```

## Error Handling

```typescript
import {
  QCK,
  QCKError,
  AuthenticationError,
  RateLimitError,
  NotFoundError,
  ValidationError,
} from '@qcksh/sdk';

const qck = new QCK({ apiKey: 'qck_your_api_key' });

try {
  const link = await qck.links.get('nonexistent');
} catch (err) {
  if (err instanceof NotFoundError) {
    console.log('Link not found');
  } else if (err instanceof AuthenticationError) {
    console.log('Invalid API key');
  } else if (err instanceof RateLimitError) {
    console.log(`Rate limited - retry after ${err.retryAfter}s`);
  } else if (err instanceof ValidationError) {
    console.log(`Invalid request: ${err.message}`);
  } else if (err instanceof QCKError) {
    console.log(`API error ${err.status}: ${err.code} - ${err.message}`);
  }
}
```

Errors are automatically retried for rate limits (429) and network failures with exponential backoff.

## Requirements

- Node.js 18+
- No external dependencies (uses native `fetch`)

## License

MIT
