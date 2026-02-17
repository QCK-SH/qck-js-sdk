// ── SDK Configuration ──

export interface QCKConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

// ── API Response Wrapper ──

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: {
    code: string;
    message: string;
  };
}

// ── Paginated Response ──

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ── Links ──

export interface Link {
  id: string;
  short_code: string;
  original_url: string;
  short_url: string;
  title?: string;
  description?: string;
  tags?: string[];
  is_active: boolean;
  expires_at?: string;
  click_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateLinkParams {
  url: string;
  custom_alias?: string;
  title?: string;
  description?: string;
  tags?: string[];
  expires_at?: string;
  domain_id?: string;
}

export interface UpdateLinkParams {
  original_url?: string;
  title?: string;
  description?: string;
  tags?: string[];
  is_active?: boolean;
  expires_at?: string;
}

export interface ListLinksParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface BulkCreateParams {
  links: CreateLinkParams[];
}

export interface LinkStats {
  total_clicks: number;
  unique_clicks: number;
  clicks_by_country: Record<string, number>;
  clicks_by_device: Record<string, number>;
  clicks_by_referrer: Record<string, number>;
}

// ── Analytics ──

export interface AnalyticsSummaryParams {
  from?: string;
  to?: string;
  link_id?: string;
}

export interface AnalyticsSummary {
  total_clicks: number;
  unique_visitors: number;
  top_countries: { country: string; clicks: number }[];
  top_referrers: { referrer: string; clicks: number }[];
  top_devices: { device: string; clicks: number }[];
}

export interface TimeseriesParams {
  from?: string;
  to?: string;
  link_id?: string;
  interval?: 'hour' | 'day' | 'week' | 'month';
}

export interface TimeseriesPoint {
  timestamp: string;
  clicks: number;
  unique_visitors: number;
}

// ── Domains ──

export interface Domain {
  id: string;
  domain: string;
  is_verified: boolean;
  is_default: boolean;
  created_at: string;
}

// ── Webhooks ──

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  description?: string;
  is_active: boolean;
  consecutive_failures: number;
  created_at: string;
  updated_at: string;
}

export interface CreateWebhookParams {
  url: string;
  events: string[];
  description?: string;
}

export interface UpdateWebhookParams {
  url?: string;
  events?: string[];
  description?: string;
  is_active?: boolean;
}

export interface WebhookDelivery {
  id: string;
  event_type: string;
  status: string;
  http_status?: number;
  attempt_number: number;
  created_at: string;
  delivered_at?: string;
}

export interface ListWebhookDeliveriesParams {
  page?: number;
  limit?: number;
}

// ── Journey Tracking ──

export interface JourneyEvent {
  link_id: string;
  visitor_id: string;
  session_id: string;
  event_type: 'page_view' | 'scroll_depth' | 'time_on_page' | 'custom';
  event_name?: string;
  page_url: string;
  page_title?: string;
  referrer_url?: string;
  event_data?: Record<string, unknown>;
  scroll_percent?: number;
  time_on_page?: number;
  timestamp?: string;
}

export interface IngestEventsParams {
  events: JourneyEvent[];
}

export interface JourneyLinkSummary {
  total_visitors: number;
  total_sessions: number;
  total_events: number;
  avg_session_duration_seconds: number;
  top_pages: { url: string; count: number }[];
  top_events: { name: string; count: number }[];
}

export interface FunnelStep {
  step_name: string;
  visitors: number;
  conversion_rate: number;
}

export interface FunnelResult {
  steps: FunnelStep[];
  total_visitors: number;
}

export interface FunnelParams {
  steps: string[];
  period?: '7d' | '30d' | '90d';
}

export interface JourneyQueryParams {
  period?: '7d' | '30d' | '90d';
}

export interface SessionSummary {
  visitor_id: string;
  session_id: string;
  session_start: string;
  session_end: string;
  event_count: number;
  pages_visited: string[];
  events: SessionEvent[];
}

export interface SessionEvent {
  event_type: string;
  event_name: string;
  page_url: string;
  timestamp: string;
  scroll_percent: number;
  time_on_page: number;
}

export interface ListJourneySessionsParams {
  page?: number;
  limit?: number;
  visitor_id?: string;
  period?: '7d' | '30d' | '90d';
}

export interface ListJourneyEventsParams {
  page?: number;
  limit?: number;
  event_type?: string;
  period?: '7d' | '30d' | '90d';
}

// ── HTTP Client Internals ──

export interface RequestOptions {
  params?: Record<string, string | number | boolean | undefined>;
}
