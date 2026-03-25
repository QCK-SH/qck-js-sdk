import { HttpClient } from './client.js';
import { LinksResource } from './resources/links.js';
import { AnalyticsResource } from './resources/analytics.js';
import { DomainsResource } from './resources/domains.js';
import { WebhooksResource } from './resources/webhooks.js';
import { JourneyResource } from './resources/journey.js';
import { ConversionsResource } from './resources/conversions.js';
import type { QCKConfig } from './types.js';

/**
 * QCK SDK client. Initialize with your API key and use the
 * resource namespaces to interact with the QCK Developer API.
 *
 * @description The main entry point for the QCK JavaScript/TypeScript SDK.
 * Each resource namespace (`links`, `analytics`, `domains`, `webhooks`,
 * `journey`, `conversions`) provides methods for the corresponding API
 * endpoints.
 *
 * @example
 * ```ts
 * import { QCK } from '@qck/sdk';
 *
 * const qck = new QCK({ apiKey: 'qck_...' });
 *
 * // Create a short link
 * const link = await qck.links.create({ url: 'https://example.com' });
 *
 * // Get analytics
 * const summary = await qck.analytics.summary({ days: 30 });
 *
 * // Track a conversion
 * await qck.conversions.track({
 *   link_id: link.id,
 *   visitor_id: 'user-123',
 *   name: 'purchase',
 *   revenue: 49.99,
 * });
 * ```
 */
export class QCK {
  /** Resource for creating, listing, updating, and deleting short links. */
  public readonly links: LinksResource;
  /** Resource for querying click analytics, timeseries, geo, device, referrer, and hourly data. */
  public readonly analytics: AnalyticsResource;
  /** Resource for listing custom domains. */
  public readonly domains: DomainsResource;
  /** Resource for managing webhook endpoints and viewing delivery history. */
  public readonly webhooks: WebhooksResource;
  /** Resource for ingesting journey events and analyzing visitor sessions and funnels. */
  public readonly journey: JourneyResource;
  /** Resource for tracking and querying conversion analytics. */
  public readonly conversions: ConversionsResource;

  /**
   * Create a new QCK SDK client.
   *
   * @param config - Configuration options including the API key.
   * @throws {Error} If `apiKey` is not provided.
   *
   * @example
   * ```ts
   * const qck = new QCK({
   *   apiKey: 'qck_live_abc123',
   *   timeout: 10_000,   // 10 second timeout
   *   retries: 5,        // retry up to 5 times
   * });
   * ```
   */
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
    this.conversions = new ConversionsResource(client);
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
export {
  WebhookEvents,
  WebhookEventCategories,
} from './types.js';
export type {
  QCKConfig,
  Link,
  LinkMetadata,
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
  WebhookEventType,
  WebhookPayload,
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
  ConversionSummary,
  ConversionTimeseriesPoint,
  ConversionBreakdownEntry,
  ConversionScopeParams,
  ConversionTimeseriesParams,
  ConversionBreakdownParams,
  TrackConversionParams,
  ConversionPeriod,
  ConversionInterval,
  ConversionDimension,
  TimeToConvertData,
  TimeToConvertBucket,
  GeoAnalyticsEntry,
  GeoAnalyticsParams,
  DeviceAnalyticsEntry,
  DeviceAnalyticsParams,
  ReferrerAnalyticsEntry,
  ReferrerAnalyticsParams,
  HourlyAnalyticsEntry,
  HourlyAnalyticsParams,
} from './types.js';
export { LinksResource } from './resources/links.js';
export { AnalyticsResource } from './resources/analytics.js';
export { DomainsResource } from './resources/domains.js';
export { WebhooksResource } from './resources/webhooks.js';
export { JourneyResource } from './resources/journey.js';
export { ConversionsResource } from './resources/conversions.js';
