# QCK JavaScript SDK

Official TypeScript/JavaScript SDK for the [QCK](https://qck.sh) API. Create short links, track conversions, query analytics, manage webhooks, and more.

[![npm](https://img.shields.io/npm/v/@qcksh/sdk)](https://www.npmjs.com/package/@qcksh/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Installation

```bash
npm install @qcksh/sdk
# or
pnpm add @qcksh/sdk
# or
yarn add @qcksh/sdk
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

## Configuration

```typescript
const qck = new QCK({
  apiKey: 'qck_your_api_key',                     // Required - your API key
  baseUrl: 'https://api.qck.sh/public-api/v1',    // Optional - API base URL
  timeout: 30_000,                                  // Optional - request timeout in ms (default: 30000)
  retries: 3,                                       // Optional - automatic retries (default: 3)
});
```

| Option    | Type     | Default                                    | Description                     |
|-----------|----------|--------------------------------------------|---------------------------------|
| `apiKey`  | `string` | —                                          | **Required.** Your QCK API key  |
| `baseUrl` | `string` | `'https://api.qck.sh/public-api/v1'`       | API base URL                    |
| `timeout` | `number` | `30000`                                    | Request timeout in milliseconds |
| `retries` | `number` | `3`                                        | Max automatic retries           |

## Resources

### Links

Full CRUD operations for short links, plus bulk creation, stats, and OG image management.

```typescript
// Create a link
const link = await qck.links.create({
  url: 'https://example.com',
  custom_alias: 'my-link',          // optional
  title: 'Example',                 // optional
  description: 'My link',           // optional
  tags: ['marketing', 'q1'],        // optional
  expires_at: '2026-12-31T00:00:00Z', // optional, ISO 8601
  is_password_protected: true,      // optional
  password: 's3cret',               // optional
  domain_id: 'dom_123',             // optional, custom domain
  // UTM parameters
  utm_source: 'twitter',            // optional
  utm_medium: 'social',             // optional
  utm_campaign: 'launch',           // optional
  utm_term: 'sdk',                  // optional
  utm_content: 'hero',              // optional
});

// List links (paginated)
const result = await qck.links.list({
  page: 1,
  per_page: 25,
  search: 'example',               // optional, search by URL/title/alias
  tags: ['marketing'],              // optional, filter by tags
  is_active: true,                  // optional
  has_password: false,              // optional
  domain: 'links.example.com',     // optional, filter by domain name
  domain_id: 'dom_123',            // optional, filter by domain ID
  created_after: '2026-01-01',     // optional, ISO 8601
  created_before: '2026-12-31',    // optional, ISO 8601
  sort_by: 'created_at',           // optional
  sort_order: 'desc',              // optional, 'asc' | 'desc'
});
// result.data: Link[], result.total, result.page, result.limit

// Get a single link
const link = await qck.links.get('link_id');

// Update a link
const updated = await qck.links.update('link_id', {
  title: 'New Title',
  is_active: false,
  tags: ['updated'],
  url: 'https://new-destination.com',
});

// Delete a link
await qck.links.delete('link_id');

// Bulk create
const links = await qck.links.bulkCreate({
  links: [
    { url: 'https://example.com/a' },
    { url: 'https://example.com/b', custom_alias: 'b-link' },
    { url: 'https://example.com/c', tags: ['batch'] },
  ],
});

// Get link stats
const stats = await qck.links.getStats('link_id');
// stats.total_clicks, stats.unique_clicks
// stats.clicks_by_country, stats.clicks_by_device, stats.clicks_by_referrer

// Upload OG image
const imageBlob = new Blob([imageBuffer], { type: 'image/png' });
await qck.links.uploadOgImage('link_id', imageBlob);

// Delete OG image
await qck.links.deleteOgImage('link_id');
```

#### Links API Reference

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `create(params)` | `CreateLinkParams` | `Promise<Link>` | Create a new short link |
| `list(params?)` | `ListLinksParams` | `Promise<PaginatedResponse<Link>>` | List links with filters |
| `get(id)` | `string` | `Promise<Link>` | Get a link by ID |
| `update(id, params)` | `string, UpdateLinkParams` | `Promise<Link>` | Update a link |
| `delete(id)` | `string` | `Promise<void>` | Delete a link |
| `bulkCreate(params)` | `BulkCreateParams` | `Promise<Link[]>` | Create multiple links |
| `getStats(id)` | `string` | `Promise<LinkStats>` | Get click statistics |
| `uploadOgImage(id, file)` | `string, Blob\|ArrayBuffer\|Uint8Array` | `Promise<{ og_image: string }>` | Upload OG image |
| `deleteOgImage(id)` | `string` | `Promise<void>` | Remove OG image |

### Analytics

Query aggregate analytics across all links or filtered by domain.

```typescript
// Summary stats
const summary = await qck.analytics.summary({
  days: 30,                         // last N days (shorthand)
  // OR use date range:
  // start_date: '2026-01-01',
  // end_date: '2026-01-31',
  bot_filter: 'real',              // 'real' | 'bot' | 'all' (default: 'real')
  domain_name: 'links.example.com', // optional, filter by domain
});
// summary.total_clicks, summary.unique_visitors, summary.total_links
// summary.today_clicks, summary.yesterday_clicks, summary.active_links

// Timeseries data
const points = await qck.analytics.timeseries({ days: 7 });
for (const point of points) {
  console.log(`${point.timestamp}: ${point.clicks} clicks, ${point.unique_visitors} unique`);
}

// Geographic breakdown
const geo = await qck.analytics.geo({ days: 30 });
for (const entry of geo) {
  console.log(`${entry.country} (${entry.country_code}): ${entry.clicks} clicks`);
}

// Device breakdown
const devices = await qck.analytics.devices({ days: 30 });
for (const entry of devices) {
  console.log(`${entry.device_type} / ${entry.browser} / ${entry.os}: ${entry.clicks}`);
}

// Referrer breakdown
const referrers = await qck.analytics.referrers({ days: 30 });
for (const entry of referrers) {
  console.log(`${entry.referrer}: ${entry.clicks} clicks`);
}

// Hourly distribution
const hourly = await qck.analytics.hourly({ days: 7 });
for (const entry of hourly) {
  console.log(`${entry.hour}:00 — ${entry.clicks} clicks`);
}
```

#### Analytics API Reference

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `summary(params?)` | `AnalyticsSummaryParams` | `Promise<AnalyticsSummary>` | Aggregate summary stats |
| `timeseries(params?)` | `TimeseriesParams` | `Promise<TimeseriesPoint[]>` | Clicks over time |
| `geo(params?)` | `GeoAnalyticsParams` | `Promise<GeoAnalyticsEntry[]>` | Geographic breakdown |
| `devices(params?)` | `DeviceAnalyticsParams` | `Promise<DeviceAnalyticsEntry[]>` | Device/browser/OS breakdown |
| `referrers(params?)` | `ReferrerAnalyticsParams` | `Promise<ReferrerAnalyticsEntry[]>` | Traffic source breakdown |
| `hourly(params?)` | `HourlyAnalyticsParams` | `Promise<HourlyAnalyticsEntry[]>` | Hourly click distribution |

### Conversions

Track and analyze conversion events tied to your links.

```typescript
// Track a conversion
await qck.conversions.track({
  short_code: 'abc123',            // required — link short code
  visitor_id: 'user-456',          // required — your user ID
  name: 'purchase',                // required — conversion name
  session_id: 'sess-789',          // optional — enables session analytics
  revenue: 49.99,                  // optional — dollars, converted to cents internally
  currency: 'USD',                 // optional (default: 'USD')
  page_url: '/checkout',           // optional — page or screen
  properties: { plan: 'pro' },     // optional — stored in ClickHouse JSON column
});

// Conversion summary (org-wide or scoped)
const summary = await qck.conversions.summary({
  period: '30d',                   // '7d' | '30d' | '90d'
  short_code: 'abc123',            // optional — scope to a link
});

// Conversion timeseries
const points = await qck.conversions.timeseries({
  period: '30d',
  interval: 'day',                 // 'hour' | 'day' | 'week' | 'month'
});

// Breakdown by dimension
const bySource = await qck.conversions.breakdown({
  dimension: 'name',               // 'source' | 'device' | 'country' | 'link' | 'name'
  period: '30d',
});

// Time-to-convert analysis
const ttc = await qck.conversions.timeToConvert({ period: '30d' });
// ttc.average_seconds, ttc.median_seconds, ttc.buckets
```

#### Conversions API Reference

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `track(params)` | `TrackConversionParams` | `Promise<void>` | Record a conversion event |
| `summary(params?)` | `ConversionScopeParams` | `Promise<ConversionSummary>` | Conversion summary stats |
| `timeseries(params?)` | `ConversionTimeseriesParams` | `Promise<ConversionTimeseriesPoint[]>` | Conversions over time |
| `breakdown(params)` | `ConversionBreakdownParams` | `Promise<ConversionBreakdownEntry[]>` | Breakdown by dimension |
| `timeToConvert(params?)` | `ConversionScopeParams` | `Promise<TimeToConvertData>` | Time-to-convert distribution |

### Journey Tracking

Track visitor journeys from any platform — websites, mobile apps, server-side. After a user clicks your QCK short link, they're redirected to your destination with `?qck_id=<short_code>` in the URL. Read this param to attribute journey events.

**Event types** (Enum — must be one of these):

| Type | Use for | Key fields |
|------|---------|------------|
| `page_view` | Page/screen loads | `page_url`, `page_title` |
| `scroll_depth` | Scroll tracking | `scroll_percent` (0-100) |
| `time_on_page` | Time on page/screen | `time_on_page` (seconds) |
| `custom` | Any user-defined event | `event_name`, `properties` |
| `conversion` | Purchase, signup, lead | `conversion_name`, `revenue_cents`, `currency` |

```typescript
// Read the short code from the redirect URL
const shortCode = new URLSearchParams(window.location.search).get('qck_id');

// Ingest journey events (batch up to 100 per request)
await qck.journey.ingest({
  events: [
    // Page view
    {
      short_code: 'abc123',
      visitor_id: 'user-456',
      session_id: 'sess-789',       // optional
      event_type: 'page_view',
      page_url: '/pricing',
      page_title: 'Pricing',
    },
    // Scroll depth
    {
      short_code: 'abc123',
      visitor_id: 'user-456',
      session_id: 'sess-789',
      event_type: 'scroll_depth',
      page_url: '/pricing',
      scroll_percent: 75,
    },
    // Time on page (seconds)
    {
      short_code: 'abc123',
      visitor_id: 'user-456',
      session_id: 'sess-789',
      event_type: 'time_on_page',
      page_url: '/pricing',
      time_on_page: 45,
    },
    // Custom event with properties
    {
      short_code: 'abc123',
      visitor_id: 'user-456',
      event_type: 'custom',
      event_name: 'cta_click',
      page_url: '/pricing',
      properties: { button: 'hero', variant: 'B' },
    },
    // Conversion with revenue
    {
      short_code: 'abc123',
      visitor_id: 'user-456',
      event_type: 'conversion',
      conversion_name: 'purchase',
      revenue_cents: 4999,           // $49.99
      currency: 'USD',
      page_url: '/checkout/success',
      properties: { plan: 'pro', coupon: 'SAVE20' },
    },
  ],
});

// Context fields (all optional — your data, you provide it)
await qck.journey.ingest({
  events: [{
    short_code: 'abc123',
    visitor_id: 'user-456',
    event_type: 'page_view',
    page_url: '/home',
    country_code: 'US',             // 2-char ISO 3166-1
    city: 'San Francisco',
    region: 'California',
    device_type: 'mobile',          // mobile | desktop | tablet
    browser: 'Chrome',
    browser_version: '120.0',
    os: 'iOS',
    os_version: '17.2',
  }],
});

// Journey summary for a link
const summary = await qck.journey.getSummary('abc123', { period: '30d' });

// Funnel analysis
const funnel = await qck.journey.getFunnel('abc123', {
  steps: ['page_view', 'cta_click', 'purchase'],
  period: '30d',
});

// List sessions (paginated)
const sessions = await qck.journey.listSessions('abc123', {
  period: '7d',
  limit: 10,
});

// List events (paginated)
const events = await qck.journey.listEvents('abc123', {
  event_type: 'custom',
  period: '7d',
});
```

**cURL example:**

```bash
curl -X POST https://qck.sh/public-api/v1/journey/events \
  -H "X-API-Key: qck_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "events": [{
      "short_code": "abc123",
      "visitor_id": "user-456",
      "event_type": "page_view",
      "page_url": "/pricing"
    }]
  }'
```

#### Journey API Reference

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `ingest(params)` | `IngestEventsParams` | `Promise<void>` | Batch ingest journey events (1-100) |
| `getSummary(shortCode, params?)` | `string, JourneyQueryParams` | `Promise<JourneyLinkSummary>` | Link journey summary |
| `getFunnel(shortCode, params)` | `string, FunnelParams` | `Promise<FunnelResult>` | Funnel analysis |
| `listSessions(shortCode, params?)` | `string, ListJourneySessionsParams` | `Promise<PaginatedResponse<SessionSummary>>` | List visitor sessions |
| `listEvents(shortCode, params?)` | `string, ListJourneyEventsParams` | `Promise<PaginatedResponse<JourneyEvent>>` | List journey events |

### Webhooks

Create, manage, and test webhook endpoints to receive real-time notifications.

```typescript
import { WebhookEvents, WebhookEventCategories } from '@qcksh/sdk';

// Create a webhook
const webhook = await qck.webhooks.create({
  url: 'https://example.com/webhook',
  events: [WebhookEvents.LINK_CREATED, WebhookEvents.LINK_DELETED],
  description: 'Production webhook',  // optional
});
// webhook.id, webhook.secret (for signature verification)

// Subscribe to all link events
const allLinks = await qck.webhooks.create({
  url: 'https://example.com/webhook',
  events: WebhookEventCategories.links, // ['link.created', 'link.updated', 'link.deleted', 'link.expired']
});

// List all webhooks
const webhooks = await qck.webhooks.list();

// Get a webhook
const wh = await qck.webhooks.get('webhook_id');

// Update a webhook
const updated = await qck.webhooks.update('webhook_id', {
  events: [WebhookEvents.LINK_CREATED],
  is_active: false,
});

// Delete a webhook
await qck.webhooks.delete('webhook_id');

// View delivery history (paginated)
const deliveries = await qck.webhooks.listDeliveries('webhook_id', {
  page: 1,
  limit: 20,
});
// deliveries.data: WebhookDelivery[]

// Send a test event
await qck.webhooks.test('webhook_id');
```

#### Webhook Events

| Constant | Value | Category |
|----------|-------|----------|
| `WebhookEvents.LINK_CREATED` | `link.created` | links |
| `WebhookEvents.LINK_UPDATED` | `link.updated` | links |
| `WebhookEvents.LINK_DELETED` | `link.deleted` | links |
| `WebhookEvents.LINK_EXPIRED` | `link.expired` | links |
| `WebhookEvents.DOMAIN_VERIFIED` | `domain.verified` | domains |
| `WebhookEvents.DOMAIN_EXPIRED` | `domain.expired` | domains |
| `WebhookEvents.DOMAIN_SUSPENDED` | `domain.suspended` | domains |
| `WebhookEvents.API_KEY_CREATED` | `api_key.created` | api_keys |
| `WebhookEvents.API_KEY_REVOKED` | `api_key.revoked` | api_keys |
| `WebhookEvents.TEAM_MEMBER_ADDED` | `team.member_added` | team |
| `WebhookEvents.TEAM_MEMBER_REMOVED` | `team.member_removed` | team |
| `WebhookEvents.SUBSCRIPTION_UPGRADED` | `subscription.upgraded` | billing |
| `WebhookEvents.SUBSCRIPTION_DOWNGRADED` | `subscription.downgraded` | billing |
| `WebhookEvents.BULK_IMPORT_COMPLETED` | `bulk_import.completed` | bulk |

Use `WebhookEventCategories` to subscribe to all events in a category:

```typescript
WebhookEventCategories.links    // all link events
WebhookEventCategories.domains  // all domain events
WebhookEventCategories.team     // all team events
WebhookEventCategories.billing  // all billing events
```

#### Webhooks API Reference

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `create(params)` | `CreateWebhookParams` | `Promise<WebhookEndpoint>` | Create a webhook endpoint |
| `list()` | — | `Promise<WebhookEndpoint[]>` | List all webhooks |
| `get(id)` | `string` | `Promise<WebhookEndpoint>` | Get a webhook by ID |
| `update(id, params)` | `string, UpdateWebhookParams` | `Promise<WebhookEndpoint>` | Update a webhook |
| `delete(id)` | `string` | `Promise<void>` | Delete a webhook |
| `listDeliveries(id, params?)` | `string, ListWebhookDeliveriesParams` | `Promise<PaginatedResponse<WebhookDelivery>>` | Delivery history |
| `test(id)` | `string` | `Promise<void>` | Send a test event |

### Domains

List custom domains configured for your organization.

```typescript
const domains = await qck.domains.list('org_id');
for (const domain of domains) {
  console.log(`${domain.domain} (verified: ${domain.is_verified}, default: ${domain.is_default})`);
}
```

#### Domains API Reference

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `list(organizationId)` | `string` | `Promise<Domain[]>` | List organization domains |

## Error Handling

The SDK provides typed error classes for different failure modes:

```typescript
import {
  QCK,
  QCKError,
  AuthenticationError,
  RateLimitError,
  NotFoundError,
  ValidationError,
} from '@qcksh/sdk';

try {
  const link = await qck.links.get('nonexistent');
} catch (err) {
  if (err instanceof NotFoundError) {
    console.log('Link not found');
  } else if (err instanceof AuthenticationError) {
    console.log('Invalid API key');
  } else if (err instanceof RateLimitError) {
    console.log(`Rate limited — retry after ${err.retryAfter}s`);
  } else if (err instanceof ValidationError) {
    console.log(`Invalid request: ${err.message}`);
  } else if (err instanceof QCKError) {
    console.log(`API error ${err.status}: ${err.code} — ${err.message}`);
  }
}
```

### Error Classes

| Class | HTTP Status | Code | Properties |
|-------|------------|------|------------|
| `QCKError` | any | varies | `status`, `code`, `message` |
| `AuthenticationError` | 401 | `AUTHENTICATION_ERROR` | — |
| `RateLimitError` | 429 | `RATE_LIMIT_ERROR` | `retryAfter` (seconds) |
| `NotFoundError` | 404 | `NOT_FOUND` | — |
| `ValidationError` | 400 | `VALIDATION_ERROR` | — |

### Automatic Retries

The SDK automatically retries requests on:

- **Rate limits (429)** — respects `Retry-After` header, falls back to 60s
- **Network errors** — connection failures, DNS resolution errors
- **Timeouts** — request timeout exceeded

Retries use exponential backoff: `1s → 2s → 4s` (capped at 10s). Rate limit retries respect the server's `Retry-After` header (capped at 2 minutes).

## Pagination

Methods that return lists use cursor-based pagination:

```typescript
const result = await qck.links.list({ page: 1, per_page: 25 });

console.log(result.data);   // Link[]
console.log(result.total);  // total number of items
console.log(result.page);   // current page
console.log(result.limit);  // items per page

// Iterate through all pages
let page = 1;
let allLinks: Link[] = [];
while (true) {
  const result = await qck.links.list({ page, per_page: 100 });
  allLinks.push(...result.data);
  if (allLinks.length >= result.total) break;
  page++;
}
```

## TypeScript Support

The SDK is written in TypeScript and exports all types for use in your application:

```typescript
import type {
  Link,
  CreateLinkParams,
  UpdateLinkParams,
  ListLinksParams,
  LinkStats,
  AnalyticsSummary,
  TimeseriesPoint,
  GeoAnalyticsEntry,
  DeviceAnalyticsEntry,
  ReferrerAnalyticsEntry,
  HourlyAnalyticsEntry,
  ConversionSummary,
  TrackConversionParams,
  JourneyEvent,
  FunnelResult,
  SessionSummary,
  WebhookEndpoint,
  WebhookPayload,
  Domain,
  PaginatedResponse,
  QCKConfig,
} from '@qcksh/sdk';
```

## Requirements

- **Node.js 18+** (uses native `fetch`)
- **Zero dependencies** — no external packages required

## License

MIT
