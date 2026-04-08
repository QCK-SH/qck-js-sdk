// ── SDK Configuration ──

/** Configuration options for initializing the QCK SDK client. */
export interface QCKConfig {
  /** API key for authentication. Obtain yours at https://qck.sh/app/api */
  apiKey: string;
  /** Base URL for the QCK API. @default 'https://api.qck.sh/public-api/v1' */
  baseUrl?: string;
  /** Request timeout in milliseconds. @default 30000 */
  timeout?: number;
  /** Number of automatic retries on transient failures (network errors, 429s). @default 3 */
  retries?: number;
}

// ── API Response Wrapper ──

/**
 * Standard envelope returned by every QCK API endpoint.
 * On success, `data` contains the result; on failure, `error` is populated.
 *
 * @typeParam T - The shape of the data payload.
 */
export interface ApiResponse<T> {
  /** Whether the request succeeded. */
  success: boolean;
  /** The response payload, or `null` on error. */
  data: T | null;
  /** Error details, present only when `success` is `false`. */
  error?: {
    /** Machine-readable error code (e.g. `'VALIDATION_ERROR'`). */
    code: string;
    /** Human-readable error message. */
    message: string;
  };
}

// ── Paginated Response ──

/**
 * Paginated list response returned by endpoints that support pagination.
 *
 * @typeParam T - The type of each item in the list.
 */
export interface PaginatedResponse<T> {
  /** Array of items for the current page. */
  data: T[];
  /** Total number of items across all pages. */
  total: number;
  /** Current page number (1-indexed). */
  page: number;
  /** Maximum number of items per page. */
  limit: number;
}

// ── Links ──

/** Metadata extracted or configured for a short link. */
export interface LinkMetadata {
  /** Page title scraped from the destination URL. */
  title?: string;
  /** Meta description scraped from the destination URL. */
  description?: string;
  /** URL of the Open Graph image. */
  og_image?: string;
  /** Domain on which the short link is hosted. */
  domain: string;
  /** Whether the destination URL passed safety checks. */
  is_safe: boolean;
  /** User-assigned tags for organizing links. */
  tags: string[];
}

/** A short link object as returned by the QCK API. */
export interface Link {
  /** Unique identifier for the link (UUID). */
  id: string;
  /** The generated or custom short code (e.g. `'abc123'`). */
  link_id: string;
  /** The destination URL that the short link redirects to. */
  original_url: string;
  /** The full short URL including the domain (e.g. `'https://qck.sh/abc123'`). */
  short_url: string;
  /** Custom title for the link, used in OG tags. */
  title?: string;
  /** Custom description for the link, used in OG tags. */
  description?: string;
  /** ISO 8601 timestamp when the link expires, or `undefined` if it never expires. */
  expires_at?: string;
  /** ISO 8601 timestamp when the link was created. */
  created_at: string;
  /** ISO 8601 timestamp when the link was last updated. */
  updated_at: string;
  /** Whether the link is currently active and accepting clicks. */
  is_active: boolean;
  /** User-assigned tags for organizing links. */
  tags: string[];
  /** Whether the link requires a password to access. */
  is_password_protected: boolean;
  /** Scraped and configured metadata for the link. */
  metadata: LinkMetadata;
  /** Total number of clicks recorded on this link. */
  total_clicks: number;
  /** Number of unique visitors who clicked this link. */
  unique_visitors: number;
  /** Number of clicks identified as bot traffic. */
  bot_clicks: number;
  /** ISO 8601 timestamp of the most recent click, or `undefined` if never clicked. */
  last_accessed_at?: string;
  /** ID of the custom domain this link is associated with. */
  domain_id?: string;
  /** Hostname of the custom domain (e.g. `'links.example.com'`). */
  domain_name?: string;
}

/** Parameters for creating a new short link. */
export interface CreateLinkParams {
  /** The destination URL to shorten. Must be a valid HTTP/HTTPS URL. */
  url: string;
  /** Custom alias for the short code (e.g. `'my-link'`). Requires Basic tier or above. */
  custom_alias?: string;
  /** Custom title for OG tags and link management. */
  title?: string;
  /** Custom description for OG tags and link management. */
  description?: string;
  /** URL of a custom Open Graph image. */
  og_image?: string;
  /** Tags to assign to the link for organization. */
  tags?: string[];
  /** ISO 8601 timestamp when the link should expire. */
  expires_at?: string;
  /** Whether to require a password to access the link. */
  is_password_protected?: boolean;
  /** Password required to access the link. Only used when `is_password_protected` is `true`. */
  password?: string;
  /** UTM source parameter appended to the destination URL. */
  utm_source?: string;
  /** UTM medium parameter appended to the destination URL. */
  utm_medium?: string;
  /** UTM campaign parameter appended to the destination URL. */
  utm_campaign?: string;
  /** UTM term parameter appended to the destination URL. */
  utm_term?: string;
  /** UTM content parameter appended to the destination URL. */
  utm_content?: string;
  /** ID of the custom domain to host this link on. */
  domain_id?: string;
}

/** Parameters for updating an existing short link. All fields are optional. */
export interface UpdateLinkParams {
  /** New custom alias for the short code. */
  custom_alias?: string;
  /** New title for OG tags. */
  title?: string;
  /** New description for OG tags. */
  description?: string;
  /** New Open Graph image URL. */
  og_image?: string;
  /** New expiration timestamp, or `null` to remove expiration. */
  expires_at?: string | null;
  /** Whether the link should be active. Set to `false` to disable. */
  is_active?: boolean;
  /** New set of tags (replaces existing tags). */
  tags?: string[];
  /** Whether the link should require a password. */
  is_password_protected?: boolean;
  /** New password. Only used when `is_password_protected` is `true`. */
  password?: string;
}

/** Parameters for listing links with filtering, pagination, and sorting. */
export interface ListLinksParams {
  /** Page number (1-indexed). @default 1 */
  page?: number;
  /** Number of links per page. @default 20 */
  per_page?: number;
  /** Search query matched against URL, title, and short code. */
  search?: string;
  /** Filter to links that have any of these tags. */
  tags?: string[];
  /** Filter by active/inactive status. */
  is_active?: boolean;
  /** Filter by password protection status. */
  has_password?: boolean;
  /** Filter by custom domain hostname. */
  domain?: string;
  /** Filter by custom domain ID. */
  domain_id?: string;
  /** Return only links created after this ISO 8601 timestamp. */
  created_after?: string;
  /** Return only links created before this ISO 8601 timestamp. */
  created_before?: string;
  /** Return only links last accessed after this ISO 8601 timestamp. */
  last_active_after?: string;
  /** Field to sort results by (e.g. `'created_at'`, `'total_clicks'`). */
  sort_by?: string;
  /** Sort direction. @default 'desc' */
  sort_order?: 'asc' | 'desc';
}

/** Parameters for bulk-creating multiple short links in one request. */
export interface BulkCreateParams {
  /** Array of link creation payloads. Maximum batch size depends on your subscription tier. */
  links: CreateLinkParams[];
}

/** Click statistics for a specific link. */
export interface LinkStats {
  /** The link's short code (e.g. `'abc123'`). */
  short_code: string;
  /** The destination URL the short link redirects to. */
  original_url: string;
  /** Total number of clicks on the link. */
  total_clicks: number;
  /** Number of unique visitors who clicked this link. */
  unique_visitors: number;
  /** Number of clicks identified as bot traffic. */
  bot_clicks: number;
  /** Total clicks minus bot clicks. */
  human_clicks: number;
  /** ISO 8601 timestamp when the link was created. */
  created_at: string;
  /** ISO 8601 timestamp of the most recent click, or `null` if never clicked. */
  last_accessed_at: string | null;
  /** Whether the link is currently active. */
  is_active: boolean;
  /** Number of days since the link was created. */
  days_active: number;
  /** Average clicks per day since creation. */
  average_clicks_per_day: number;
  /** Ratio of unique visitors to total clicks (0-1). */
  conversion_rate: number;
}

// ── Analytics ──

/** Parameters for retrieving an analytics summary. */
export interface AnalyticsSummaryParams {
  /** Start of the date range in ISO 8601 format. */
  start_date?: string;
  /** End of the date range in ISO 8601 format. */
  end_date?: string;
  /** Shortcut for date range: number of days to look back from today. Overridden by explicit dates. */
  days?: number;
  /** Filter by traffic type. @default 'real' */
  bot_filter?: 'real' | 'bot' | 'all';
  /** Filter analytics to a specific custom domain. */
  domain_name?: string;
}

/** Aggregated analytics summary for the account or a filtered scope. */
export interface AnalyticsSummary {
  /** Total clicks in the selected period. */
  total_clicks: number;
  /** Unique visitors in the selected period. */
  unique_visitors: number;
  /** Total number of links that received clicks. */
  total_links: number;
  /** ISO 8601 timestamp of the most recent click, or `null` if none. */
  last_click_at: string | null;
  /** Number of clicks recorded today. */
  today_clicks: number;
  /** Number of clicks recorded yesterday. */
  yesterday_clicks: number;
  /** Number of currently active links. */
  active_links: number;
  /** Total number of links in the account. */
  total_links_count: number;
}

/** Parameters for retrieving timeseries analytics data. */
export interface TimeseriesParams {
  /** Start of the date range in ISO 8601 format. */
  start_date?: string;
  /** End of the date range in ISO 8601 format. */
  end_date?: string;
  /** Shortcut for date range: number of days to look back from today. */
  days?: number;
  /** Filter by traffic type. @default 'real' */
  bot_filter?: 'real' | 'bot' | 'all';
  /** Filter timeseries data to a specific custom domain. */
  domain_name?: string;
}

/** A single data point in a timeseries analytics response. */
export interface TimeseriesPoint {
  /** ISO 8601 timestamp for this data point. */
  timestamp: string;
  /** Total clicks in this time bucket. */
  clicks: number;
  /** Unique visitors in this time bucket. */
  unique_visitors: number;
}

/** Parameters for retrieving geographic analytics data. */
export interface GeoAnalyticsParams {
  /** Number of days to look back from today. */
  days?: number;
  /** Start of the date range in ISO 8601 format. */
  start_date?: string;
  /** End of the date range in ISO 8601 format. */
  end_date?: string;
  /** Filter by traffic type. @default 'real' */
  bot_filter?: 'real' | 'bot' | 'all';
  /** Filter to a specific custom domain. */
  domain_name?: string;
}

/** A geographic analytics entry showing click data for a single country. */
export interface GeoAnalyticsEntry {
  /** Full country name (e.g. `'United States'`). */
  country: string;
  /** ISO 3166-1 alpha-2 country code (e.g. `'US'`). */
  country_code: string;
  /** Total clicks from this country. */
  clicks: number;
  /** Unique visitors from this country. */
  unique_visitors: number;
}

/** Parameters for retrieving device/browser analytics data. */
export interface DeviceAnalyticsParams {
  /** Number of days to look back from today. */
  days?: number;
  /** Start of the date range in ISO 8601 format. */
  start_date?: string;
  /** End of the date range in ISO 8601 format. */
  end_date?: string;
  /** Filter by traffic type. @default 'real' */
  bot_filter?: 'real' | 'bot' | 'all';
  /** Filter to a specific custom domain. */
  domain_name?: string;
}

/** A device analytics entry showing click data for a specific device/browser/OS combination. */
export interface DeviceAnalyticsEntry {
  /** Device category (e.g. `'desktop'`, `'mobile'`, `'tablet'`). */
  device_type: string;
  /** Browser name (e.g. `'Chrome'`, `'Safari'`). */
  browser: string;
  /** Operating system (e.g. `'Windows'`, `'macOS'`, `'iOS'`). */
  os: string;
  /** Total clicks from this device/browser/OS combination. */
  clicks: number;
}

/** Parameters for retrieving referrer analytics data. */
export interface ReferrerAnalyticsParams {
  /** Number of days to look back from today. */
  days?: number;
  /** Start of the date range in ISO 8601 format. */
  start_date?: string;
  /** End of the date range in ISO 8601 format. */
  end_date?: string;
  /** Filter by traffic type. @default 'real' */
  bot_filter?: 'real' | 'bot' | 'all';
  /** Filter to a specific custom domain. */
  domain_name?: string;
}

/** A referrer analytics entry showing click data from a specific traffic source. */
export interface ReferrerAnalyticsEntry {
  /** Referrer domain or URL (e.g. `'google.com'`, `'direct'`). */
  referrer: string;
  /** Total clicks from this referrer. */
  clicks: number;
  /** Unique visitors from this referrer. */
  unique_visitors: number;
}

/** Parameters for retrieving hourly analytics data. */
export interface HourlyAnalyticsParams {
  /** Number of days to look back from today. */
  days?: number;
  /** Start of the date range in ISO 8601 format. */
  start_date?: string;
  /** End of the date range in ISO 8601 format. */
  end_date?: string;
  /** Filter by traffic type. @default 'real' */
  bot_filter?: 'real' | 'bot' | 'all';
  /** Filter to a specific custom domain. */
  domain_name?: string;
}

/** An hourly analytics entry showing click distribution for a specific hour of the day. */
export interface HourlyAnalyticsEntry {
  /** Hour of the day in UTC (0-23). */
  hour: number;
  /** Total clicks during this hour. */
  clicks: number;
  /** Unique visitors during this hour. */
  unique_visitors: number;
}

// ── Domains ──

/** A custom domain configured for short link hosting. */
export interface Domain {
  /** Unique identifier for the domain (UUID). */
  id: string;
  /** The domain hostname (e.g. `'links.example.com'`). */
  domain: string;
  /** Whether DNS verification has been completed. */
  is_verified: boolean;
  /** Whether this is the default domain for new links. */
  is_default: boolean;
  /** ISO 8601 timestamp when the domain was added. */
  created_at: string;
}

// ── Webhook Event Types ──

/**
 * All supported webhook event types.
 * Use these constants when creating or updating webhook endpoints
 * instead of raw strings.
 *
 * @example
 * ```ts
 * import { WebhookEvents } from '@qck/sdk';
 *
 * await qck.webhooks.create({
 *   url: 'https://example.com/webhooks',
 *   events: [WebhookEvents.LINK_CREATED, WebhookEvents.LINK_DELETED],
 * });
 * ```
 */
export const WebhookEvents = {
  // Links
  /** Fired when a new short link is created. */
  LINK_CREATED: 'link.created',
  /** Fired when a short link is updated. */
  LINK_UPDATED: 'link.updated',
  /** Fired when a short link is deleted. */
  LINK_DELETED: 'link.deleted',
  /** Fired when a short link expires. */
  LINK_EXPIRED: 'link.expired',
  // Domains
  /** Fired when a custom domain passes DNS verification. */
  DOMAIN_VERIFIED: 'domain.verified',
  /** Fired when a custom domain's verification expires. */
  DOMAIN_EXPIRED: 'domain.expired',
  /** Fired when a custom domain is suspended. */
  DOMAIN_SUSPENDED: 'domain.suspended',
  // API Keys
  /** Fired when a new API key is created. */
  API_KEY_CREATED: 'api_key.created',
  /** Fired when an API key is revoked. */
  API_KEY_REVOKED: 'api_key.revoked',
  // Team
  /** Fired when a new member is added to the team. */
  TEAM_MEMBER_ADDED: 'team.member_added',
  /** Fired when a member is removed from the team. */
  TEAM_MEMBER_REMOVED: 'team.member_removed',
  // Billing
  /** Fired when the subscription is upgraded to a higher tier. */
  SUBSCRIPTION_UPGRADED: 'subscription.upgraded',
  /** Fired when the subscription is downgraded to a lower tier. */
  SUBSCRIPTION_DOWNGRADED: 'subscription.downgraded',
  // Bulk
  /** Fired when a bulk import operation completes. */
  BULK_IMPORT_COMPLETED: 'bulk_import.completed',
  // Journey
  /** Fired when a conversion event is tracked via the journey SDK. */
  CONVERSION: 'conversion',
} as const;

/** Union type of all valid webhook event type strings. */
export type WebhookEventType = (typeof WebhookEvents)[keyof typeof WebhookEvents];

/**
 * Webhook events grouped by category for convenient bulk-subscription.
 *
 * @example
 * ```ts
 * import { WebhookEventCategories } from '@qck/sdk';
 *
 * // Subscribe to all link-related events
 * await qck.webhooks.create({
 *   url: 'https://example.com/webhooks',
 *   events: [...WebhookEventCategories.links],
 * });
 * ```
 */
export const WebhookEventCategories = {
  /** All link lifecycle events (created, updated, deleted, expired). */
  links: [
    WebhookEvents.LINK_CREATED,
    WebhookEvents.LINK_UPDATED,
    WebhookEvents.LINK_DELETED,
    WebhookEvents.LINK_EXPIRED,
  ],
  /** All custom domain events (verified, expired, suspended). */
  domains: [
    WebhookEvents.DOMAIN_VERIFIED,
    WebhookEvents.DOMAIN_EXPIRED,
    WebhookEvents.DOMAIN_SUSPENDED,
  ],
  /** All API key events (created, revoked). */
  api_keys: [
    WebhookEvents.API_KEY_CREATED,
    WebhookEvents.API_KEY_REVOKED,
  ],
  /** All team management events (member added, member removed). */
  team: [
    WebhookEvents.TEAM_MEMBER_ADDED,
    WebhookEvents.TEAM_MEMBER_REMOVED,
  ],
  /** All billing/subscription events (upgraded, downgraded). */
  billing: [
    WebhookEvents.SUBSCRIPTION_UPGRADED,
    WebhookEvents.SUBSCRIPTION_DOWNGRADED,
  ],
  /** All bulk operation events (import completed). */
  bulk: [
    WebhookEvents.BULK_IMPORT_COMPLETED,
  ],
  /** All journey events (conversion). */
  journey: [
    WebhookEvents.CONVERSION,
  ],
} as const;

/**
 * Shape of a webhook delivery payload received at your endpoint.
 * Your webhook handler should validate the signature and parse
 * the `data` field according to the `event` type.
 *
 * @typeParam T - The shape of the event-specific data payload.
 */
export interface WebhookPayload<T = unknown> {
  /** The event type that triggered this delivery. */
  event: WebhookEventType;
  /** ISO 8601 timestamp when the event occurred. */
  timestamp: string;
  /** Event-specific data payload. */
  data: T;
}

// ── Webhooks ──

/** A registered webhook endpoint that receives event deliveries. */
export interface WebhookEndpoint {
  /** Unique identifier for the webhook endpoint (UUID). */
  id: string;
  /** The URL that receives webhook POST requests. */
  url: string;
  /** List of event types this endpoint is subscribed to. */
  events: string[];
  /** Whether the endpoint is currently active and receiving deliveries. */
  is_active: boolean;
  /** Human-readable description of the endpoint's purpose. */
  description?: string;
  /** Number of consecutive delivery failures. Endpoint is auto-disabled after repeated failures. */
  consecutive_failures: number;
  /** ISO 8601 timestamp of the most recent delivery failure. */
  last_failure_at?: string;
  /** ISO 8601 timestamp when the endpoint was created. */
  created_at: string;
  /** ISO 8601 timestamp when the endpoint was last updated. */
  updated_at: string;
  /** Signing secret used to verify webhook payloads. Only returned on creation. */
  secret?: string;
}

/** Parameters for creating a new webhook endpoint. */
export interface CreateWebhookParams {
  /** The URL that will receive webhook POST requests. Must be HTTPS. */
  url: string;
  /** Event types to subscribe to. Use {@link WebhookEvents} constants. */
  events: string[];
  /** Human-readable description of the endpoint's purpose. */
  description?: string;
}

/** Parameters for updating an existing webhook endpoint. All fields are optional. */
export interface UpdateWebhookParams {
  /** New URL for the endpoint. */
  url?: string;
  /** New set of subscribed event types (replaces existing). */
  events?: string[];
  /** New description. */
  description?: string;
  /** Whether the endpoint should be active. Set to `false` to pause deliveries. */
  is_active?: boolean;
}

/** A record of a single webhook delivery attempt. */
export interface WebhookDelivery {
  /** Unique identifier for the delivery attempt (UUID). */
  id: string;
  /** The event type that was delivered. */
  event_type: string;
  /** Delivery status (e.g. `'success'`, `'failed'`, `'pending'`). */
  status: string;
  /** HTTP status code returned by the endpoint, if available. */
  http_status?: number;
  /** Which attempt number this was (1-based). */
  attempt_number: number;
  /** ISO 8601 timestamp when the delivery was initiated. */
  created_at: string;
  /** ISO 8601 timestamp when the delivery was successfully received. */
  delivered_at?: string;
}

/** Parameters for listing webhook delivery attempts. */
export interface ListWebhookDeliveriesParams {
  /** Page number (1-indexed). @default 1 */
  page?: number;
  /** Number of deliveries per page. @default 20 */
  limit?: number;
}

// ── Journey Tracking ──

/** A single visitor journey event to be ingested or returned from queries. */
export interface JourneyEvent {
  /** Link UUID. Read from `?qck_link=` URL param after redirect. */
  link_id: string;
  /** Unique visitor identifier (user-managed — your user ID, device UUID, etc.). */
  visitor_id: string;
  /** Session identifier (optional — enables session analytics and funnel analysis when provided). */
  session_id?: string;
  /** Type of event being tracked. */
  event_type: 'page_view' | 'scroll_depth' | 'time_on_page' | 'custom' | 'conversion';
  /** Event name for custom/conversion events (e.g. "signup", "purchase"). */
  event_name?: string;
  /** Page URL (web) or screen/route name (mobile/server). */
  page_url: string;
  /** Page title or screen title. */
  page_title?: string;
  /** Scroll depth percentage (0-100) for `'scroll_depth'` events. */
  scroll_percent?: number;
  /** Time spent on the page in seconds for `'time_on_page'` events. */
  time_on_page?: number;
  /** ISO 8601 timestamp. Defaults to server time if omitted. */
  timestamp?: string;
  /** Conversion name (e.g. "purchase"). Set for conversion events. */
  conversion_name?: string;
  /** Revenue in cents (integer). $49.99 → 4999. */
  revenue_cents?: number;
  /** ISO 4217 currency code. @default 'USD' */
  currency?: string;
  /** Country code (2-char ISO 3166-1, e.g. "US"). */
  country_code?: string;
  /** City name. */
  city?: string;
  /** State/province. */
  region?: string;
  /** Device type (e.g. "mobile", "desktop", "tablet"). */
  device_type?: string;
  /** Browser name (e.g. "Chrome", "Safari"). */
  browser?: string;
  /** Browser version. */
  browser_version?: string;
  /** OS name (e.g. "iOS", "Windows"). */
  os?: string;
  /** OS version (e.g. "17.0", "11"). */
  os_version?: string;
  /** Arbitrary properties. Stored in ClickHouse JSON column with auto-indexed sub-columns. */
  properties?: Record<string, unknown>;
}

/** Parameters for ingesting a batch of journey events. */
export interface IngestEventsParams {
  /** Array of journey events to ingest. Processed asynchronously. */
  events: JourneyEvent[];
}

/** Aggregated journey summary for a specific link. */
export interface JourneyLinkSummary {
  /** Total number of unique visitors who interacted with this link. */
  total_visitors: number;
  /** Total number of sessions recorded. */
  total_sessions: number;
  /** Total number of events tracked. */
  total_events: number;
  /** Average session duration in seconds. */
  avg_session_duration_seconds: number;
  /** Most visited pages, sorted by visit count descending. */
  top_pages: { url: string; count: number }[];
  /** Most triggered events, sorted by count descending. */
  top_events: { name: string; count: number }[];
}

/** A single step in a funnel analysis result. */
export interface FunnelStep {
  /** Name of the funnel step (matches an event_type or event_name). */
  step_name: string;
  /** Number of visitors who reached this step. */
  visitors: number;
  /** Percentage of the initial visitors who reached this step (0-100). */
  conversion_rate: number;
}

/** Result of a funnel analysis query. */
export interface FunnelResult {
  /** Ordered list of funnel steps with visitor counts and conversion rates. */
  steps: FunnelStep[];
  /** Total number of visitors who entered the funnel (step 1). */
  total_visitors: number;
}

/** Parameters for building a funnel analysis. */
export interface FunnelParams {
  /** Ordered list of event names or types that define the funnel steps. */
  steps: string[];
  /** Time period to analyze. @default '30d' */
  period?: '7d' | '30d' | '90d';
}

/** Common query parameters for journey data. */
export interface JourneyQueryParams {
  /** Time period to query. @default '30d' */
  period?: '7d' | '30d' | '90d';
}

/** Summary of a single visitor session on a journey. */
export interface SessionSummary {
  /** Unique identifier for the visitor. */
  visitor_id: string;
  /** Unique identifier for the session. */
  session_id: string;
  /** ISO 8601 timestamp when the session started. */
  session_start: string;
  /** ISO 8601 timestamp when the session ended. */
  session_end: string;
  /** Total number of events recorded in this session. */
  event_count: number;
  /** List of page URLs visited during this session, in order. */
  pages_visited: string[];
  /** All events recorded during this session, in chronological order. */
  events: SessionEvent[];
}

/** A single event within a visitor session. */
export interface SessionEvent {
  /** Type of event (e.g. `'page_view'`, `'custom'`). */
  event_type: string;
  /** Custom event name. */
  event_name: string;
  /** URL of the page where the event occurred. */
  page_url: string;
  /** ISO 8601 timestamp when the event occurred. */
  timestamp: string;
  /** Scroll depth percentage (0-100) at the time of the event. */
  scroll_percent: number;
  /** Time spent on the page in seconds at the time of the event. */
  time_on_page: number;
}

/** Parameters for listing journey sessions. */
export interface ListJourneySessionsParams {
  /** Page number (1-indexed). @default 1 */
  page?: number;
  /** Number of sessions per page. @default 20 */
  limit?: number;
  /** Filter to sessions from a specific visitor. */
  visitor_id?: string;
  /** Time period to query. @default '30d' */
  period?: '7d' | '30d' | '90d';
}

/** Parameters for listing raw journey events. */
export interface ListJourneyEventsParams {
  /** Page number (1-indexed). @default 1 */
  page?: number;
  /** Number of events per page. @default 20 */
  limit?: number;
  /** Filter to a specific event type. */
  event_type?: string;
  /** Time period to query. @default '30d' */
  period?: '7d' | '30d' | '90d';
}

// ── Conversions ──

/** Time period for scoping conversion queries. */
export type ConversionPeriod = '7d' | '30d' | '90d';

/** Interval granularity for conversion timeseries data. */
export type ConversionInterval = 'hour' | 'day' | 'week' | 'month';

/** Dimension for breaking down conversion data. */
export type ConversionDimension = 'device' | 'country' | 'link' | 'name';

/** Common scope parameters for conversion queries. */
export interface ConversionScopeParams {
  /** Time period to query. @default '30d' */
  period?: ConversionPeriod;
  /** Filter conversions to a specific custom domain. */
  domain_id?: string;
  /** Filter conversions to a specific link by short code. */
  link_id?: string;
}

/** Parameters for retrieving conversion timeseries data. */
export interface ConversionTimeseriesParams extends ConversionScopeParams {
  /** Granularity of each data point. @default 'day' */
  interval?: ConversionInterval;
}

/** Parameters for retrieving a conversion breakdown by dimension. */
export interface ConversionBreakdownParams extends ConversionScopeParams {
  /** The dimension to break down conversions by. */
  dimension: ConversionDimension;
}

/** Parameters for tracking a conversion event via the SDK. */
export interface TrackConversionParams {
  /** Link UUID. */
  link_id: string;
  /** Unique visitor identifier (your user ID, device UUID, etc.). */
  visitor_id: string;
  /** Session identifier (optional). */
  session_id?: string;
  /** Conversion event name (e.g. `'purchase'`, `'signup'`). */
  name: string;
  /** Revenue amount in dollars (e.g. 49.99). Converted to cents internally. @default 0 */
  revenue?: number;
  /** ISO 4217 currency code for the revenue. @default 'USD' */
  currency?: string;
  /** URL or screen/route where the conversion occurred. */
  page_url?: string;
  /** Arbitrary properties to attach to the conversion event. */
  properties?: Record<string, unknown>;
}

/** Aggregated conversion summary metrics. */
export interface ConversionSummary {
  /** Total number of conversion events recorded. */
  total_conversions: number;
  /** Number of unique visitors who converted. */
  unique_converters: number;
  /** Total revenue from all conversions. */
  total_revenue: number;
  /** Average revenue per conversion (total_revenue / total_conversions). */
  average_order_value: number;
  /** Conversion rate as a percentage (unique_converters / total_visitors * 100). */
  conversion_rate: number;
}

/** A single data point in a conversion timeseries response. */
export interface ConversionTimeseriesPoint {
  /** ISO 8601 timestamp for this data point. */
  timestamp: string;
  /** Number of conversions in this time bucket. */
  conversions: number;
  /** Total revenue in this time bucket. */
  revenue: number;
}

/** A single entry in a conversion breakdown response. */
export interface ConversionBreakdownEntry {
  /** Label for this breakdown segment (varies by dimension). */
  label: string;
  /** Number of conversions in this segment. */
  conversions: number;
  /** Total revenue from this segment. */
  revenue: number;
  /** Conversion rate for this segment as a percentage. */
  conversion_rate: number;
}

/** A single bucket in a time-to-convert distribution. */
export interface TimeToConvertBucket {
  /** Human-readable label for the bucket (e.g. `'< 1 hour'`, `'1-24 hours'`). */
  label: string;
  /** Number of conversions that fell into this time bucket. */
  count: number;
}

/** Distribution data showing how long visitors take from first click to conversion. */
export interface TimeToConvertData {
  /** Ordered list of time buckets with conversion counts. */
  buckets: TimeToConvertBucket[];
  /** Mean time from click to conversion in seconds. */
  average_seconds: number;
  /** Median time from click to conversion in seconds. */
  median_seconds: number;
}

// ── HTTP Client Internals ──

/** Options passed to individual HTTP requests. */
export interface RequestOptions {
  /** Query string parameters to append to the request URL. `undefined` values are omitted. */
  params?: Record<string, string | number | boolean | string[] | undefined>;
  /** Additional HTTP headers to include in the request. */
  headers?: Record<string, string>;
}
