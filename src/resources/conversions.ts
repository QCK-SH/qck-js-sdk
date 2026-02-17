import type { HttpClient } from '../client.js';
import type {
  ConversionSummary,
  ConversionTimeseriesPoint,
  ConversionBreakdownEntry,
  ConversionScopeParams,
  ConversionTimeseriesParams,
  ConversionBreakdownParams,
  TrackConversionParams,
  JourneyEvent,
} from '../types.js';

/**
 * Track and query conversion analytics through the QCK API.
 */
export class ConversionsResource {
  constructor(private readonly client: HttpClient) {}

  /**
   * Track a conversion event by ingesting it as a journey event
   * with event_type set to 'conversion'.
   *
   * Use this from server-side code, mobile apps, or any HTTP client.
   * For browser-side tracking, use the qck-tracker.js snippet instead.
   */
  async track(params: TrackConversionParams): Promise<void> {
    const event: JourneyEvent = {
      link_id: params.link_id,
      visitor_id: params.visitor_id,
      session_id: params.session_id || '',
      event_type: 'custom',
      event_name: params.name,
      page_url: params.page_url || '',
      event_data: {
        ...(params.event_data || {}),
        name: params.name,
        revenue: String(params.revenue ?? '0'),
        currency: params.currency || 'USD',
        event_type_override: 'conversion',
      },
    };

    return this.client.post('/journey/events', { events: [event] });
  }

  /**
   * Get conversion summary metrics.
   * Scope by domain_id and/or link_id, or omit both for org-wide data.
   */
  async summary(params?: ConversionScopeParams): Promise<ConversionSummary> {
    return this.client.get<ConversionSummary>('/conversions/summary', {
      params: params as unknown as Record<string, string | number | undefined>,
    });
  }

  /**
   * Get conversion timeseries data.
   * Returns data points at the specified interval.
   */
  async timeseries(params?: ConversionTimeseriesParams): Promise<ConversionTimeseriesPoint[]> {
    return this.client.get<ConversionTimeseriesPoint[]>('/conversions/timeseries', {
      params: params as unknown as Record<string, string | number | undefined>,
    });
  }

  /**
   * Get conversion breakdown by a dimension.
   * Dimensions: source, device, country, link, name.
   */
  async breakdown(params: ConversionBreakdownParams): Promise<ConversionBreakdownEntry[]> {
    return this.client.get<ConversionBreakdownEntry[]>('/conversions/breakdown', {
      params: params as unknown as Record<string, string | number | undefined>,
    });
  }
}
