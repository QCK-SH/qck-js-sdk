import { HttpClient } from './client.js';
import { LinksResource } from './resources/links.js';
import { AnalyticsResource } from './resources/analytics.js';
import { DomainsResource } from './resources/domains.js';
import { WebhooksResource } from './resources/webhooks.js';
import { JourneyResource } from './resources/journey.js';
import type { QCKConfig } from './types.js';

/**
 * QCK SDK client. Initialize with your API key and use the
 * resource namespaces to interact with the QCK Developer API.
 *
 * @example
 * ```ts
 * const qck = new QCK({ apiKey: 'qck_...' });
 * const link = await qck.links.create({ url: 'https://example.com' });
 * ```
 */
export class QCK {
  public readonly links: LinksResource;
  public readonly analytics: AnalyticsResource;
  public readonly domains: DomainsResource;
  public readonly webhooks: WebhooksResource;
  public readonly journey: JourneyResource;

  constructor(config: QCKConfig) {
    if (!config.apiKey) {
      throw new Error('QCK SDK requires an API key. Pass { apiKey: "qck_..." } to the constructor.');
    }

    const client = new HttpClient({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      timeout: config.timeout,
      retries: config.retries,
    });

    this.links = new LinksResource(client);
    this.analytics = new AnalyticsResource(client);
    this.domains = new DomainsResource(client);
    this.webhooks = new WebhooksResource(client);
    this.journey = new JourneyResource(client);
  }
}

// Re-export everything consumers might need
export { HttpClient } from './client.js';
export {
  QCKError,
  AuthenticationError,
  RateLimitError,
  NotFoundError,
  ValidationError,
} from './errors.js';
export type {
  QCKConfig,
  Link,
  CreateLinkParams,
  UpdateLinkParams,
  ListLinksParams,
  BulkCreateParams,
  LinkStats,
  AnalyticsSummary,
  AnalyticsSummaryParams,
  TimeseriesParams,
  TimeseriesPoint,
  Domain,
  WebhookEndpoint,
  CreateWebhookParams,
  UpdateWebhookParams,
  WebhookDelivery,
  ListWebhookDeliveriesParams,
  PaginatedResponse,
  JourneyEvent,
  IngestEventsParams,
  JourneyLinkSummary,
  FunnelResult,
  FunnelStep,
  FunnelParams,
  JourneyQueryParams,
  SessionSummary,
  SessionEvent,
  ListJourneySessionsParams,
  ListJourneyEventsParams,
} from './types.js';
export { LinksResource } from './resources/links.js';
export { AnalyticsResource } from './resources/analytics.js';
export { DomainsResource } from './resources/domains.js';
export { WebhooksResource } from './resources/webhooks.js';
export { JourneyResource } from './resources/journey.js';
