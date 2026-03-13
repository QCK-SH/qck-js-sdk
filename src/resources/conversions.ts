import type { HttpClient } from '../client.js';
import type {
  ConversionSummary,
  ConversionTimeseriesPoint,
  ConversionBreakdownEntry,
  ConversionScopeParams,
  ConversionTimeseriesParams,
  ConversionBreakdownParams,
  TrackConversionParams,
  TimeToConvertData,
  JourneyEvent,
} from '../types.js';

/**
 * Track and query conversion analytics through the QCK API.
 *
 * @description Provides methods to track conversion events and query
 * conversion metrics including summaries, timeseries, breakdowns by
 * dimension, and time-to-convert distributions.
 *
 * @example
 * ```ts
 * const qck = new QCK({ apiKey: 'qck_...' });
 *
 * // Track a purchase conversion
 * await qck.conversions.track({
 *   link_id: 'link-uuid',
 *   visitor_id: 'vis_123',
 *   session_id: 'ses_456',
 *   name: 'purchase',
 *   revenue: 99.99,
 *   currency: 'USD',
 * });
 *
 * // Get conversion summary
 * const summary = await qck.conversions.summary({ period: '30d' });
 * console.log(`${summary.total_conversions} conversions, $${summary.total_revenue} revenue`);
 * ```
 */
export class ConversionsResource {
  /**
   * @param client - The HTTP client used for making API requests.
   */
  constructor(private readonly client: HttpClient) {}

  /**
   * Track a conversion event by ingesting it as a journey event
   * with event_type set to 'conversion'.
   *
   * Use this from server-side code, mobile apps, or any HTTP client.
   * For browser-side tracking, use the qck-tracker.js snippet instead.
   *
   * @param params - Conversion event details including link, visitor, and revenue data.
   * @throws {ValidationError} If required fields are missing.
   * @throws {AuthenticationError} If the API key is invalid.
   *
   * @example
   * ```ts
   * await qck.conversions.track({
   *   link_id: 'link-uuid',
   *   visitor_id: 'vis_abc',
   *   session_id: 'ses_xyz',
   *   name: 'signup',
   *   page_url: 'https://example.com/thank-you',
   *   event_data: { plan: 'pro' },
   * });
   * ```
   */
  async track(params: TrackConversionParams): Promise<void> {
    const event: JourneyEvent = {
      link_id: params.link_id,
      visitor_id: params.visitor_id,
      session_id: params.session_id,
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
   *
   * @param params - Optional scope and period parameters.
   * @returns Aggregated conversion metrics including totals, revenue, and conversion rate.
   *
   * @example
   * ```ts
   * // Org-wide summary for the last 30 days
   * const summary = await qck.conversions.summary({ period: '30d' });
   *
   * // Summary for a specific link
   * const linkSummary = await qck.conversions.summary({
   *   link_id: 'link-uuid',
   *   period: '7d',
   * });
   * ```
   */
  async summary(params?: ConversionScopeParams): Promise<ConversionSummary> {
    return this.client.get<ConversionSummary>('/conversions/summary', {
      params: params as unknown as Record<string, string | number | undefined>,
    });
  }

  /**
   * Get conversion timeseries data.
   * Returns data points at the specified interval.
   *
   * @param params - Optional scope, period, and interval parameters.
   * @returns An array of timeseries data points with conversion counts and revenue.
   *
   * @example
   * ```ts
   * const points = await qck.conversions.timeseries({
   *   period: '30d',
   *   interval: 'day',
   * });
   * for (const point of points) {
   *   console.log(`${point.timestamp}: ${point.conversions} conversions, $${point.revenue}`);
   * }
   * ```
   */
  async timeseries(params?: ConversionTimeseriesParams): Promise<ConversionTimeseriesPoint[]> {
    return this.client.get<ConversionTimeseriesPoint[]>('/conversions/timeseries', {
      params: params as unknown as Record<string, string | number | undefined>,
    });
  }

  /**
   * Get conversion breakdown by a dimension.
   * Dimensions: source, device, country, link, name.
   *
   * @param params - Breakdown parameters including the required dimension.
   * @returns An array of breakdown entries, each with conversions, revenue, and rate.
   *
   * @example
   * ```ts
   * // Break down conversions by traffic source
   * const breakdown = await qck.conversions.breakdown({
   *   dimension: 'source',
   *   period: '30d',
   * });
   * for (const entry of breakdown) {
   *   console.log(`${entry.label}: ${entry.conversions} (${entry.conversion_rate}%)`);
   * }
   * ```
   */
  async breakdown(params: ConversionBreakdownParams): Promise<ConversionBreakdownEntry[]> {
    return this.client.get<ConversionBreakdownEntry[]>('/conversions/breakdown', {
      params: params as unknown as Record<string, string | number | undefined>,
    });
  }

  /**
   * Get time-to-convert distribution.
   * Shows how long visitors take from first click to conversion.
   *
   * @param params - Optional scope and period parameters.
   * @returns Distribution buckets with average and median conversion times.
   *
   * @example
   * ```ts
   * const ttc = await qck.conversions.timeToConvert({ period: '30d' });
   * console.log(`Average: ${ttc.average_seconds}s, Median: ${ttc.median_seconds}s`);
   * for (const bucket of ttc.buckets) {
   *   console.log(`${bucket.label}: ${bucket.count} conversions`);
   * }
   * ```
   */
  async timeToConvert(params?: ConversionScopeParams): Promise<TimeToConvertData> {
    return this.client.get<TimeToConvertData>('/conversions/time-to-convert', {
      params: params as unknown as Record<string, string | number | undefined>,
    });
  }
}
