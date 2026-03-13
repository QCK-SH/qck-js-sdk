import type { HttpClient } from '../client.js';
import type {
  AnalyticsSummary,
  AnalyticsSummaryParams,
  DeviceAnalyticsEntry,
  DeviceAnalyticsParams,
  GeoAnalyticsEntry,
  GeoAnalyticsParams,
  HourlyAnalyticsEntry,
  HourlyAnalyticsParams,
  ReferrerAnalyticsEntry,
  ReferrerAnalyticsParams,
  TimeseriesParams,
  TimeseriesPoint,
} from '../types.js';

/**
 * Access analytics data through the QCK API.
 *
 * @description Provides methods for querying aggregate analytics, timeseries
 * click data, geographic distribution, device/browser breakdown, referrer
 * sources, and hourly click patterns.
 *
 * @example
 * ```ts
 * const qck = new QCK({ apiKey: 'qck_...' });
 *
 * // Get a 30-day summary
 * const summary = await qck.analytics.summary({ days: 30 });
 * console.log(`${summary.total_clicks} clicks from ${summary.unique_visitors} visitors`);
 *
 * // Get daily timeseries
 * const points = await qck.analytics.timeseries({ days: 7 });
 * ```
 */
export class AnalyticsResource {
  /**
   * @param client - The HTTP client used for making API requests.
   */
  constructor(private readonly client: HttpClient) {}

  /**
   * Get an analytics summary with optional date range and domain filter.
   *
   * @param params - Optional date range and filter parameters.
   * @returns Aggregated analytics metrics for the selected scope.
   *
   * @example
   * ```ts
   * const summary = await qck.analytics.summary({
   *   start_date: '2026-01-01',
   *   end_date: '2026-01-31',
   *   bot_filter: 'real',
   * });
   * ```
   */
  async summary(params?: AnalyticsSummaryParams): Promise<AnalyticsSummary> {
    return this.client.get<AnalyticsSummary>('/analytics/summary', {
      params: params as Record<string, string | number | undefined>,
    });
  }

  /**
   * Get timeseries click data with configurable date range.
   *
   * @param params - Optional date range and filter parameters.
   * @returns An array of timeseries data points with click and visitor counts.
   *
   * @example
   * ```ts
   * const points = await qck.analytics.timeseries({ days: 14 });
   * for (const point of points) {
   *   console.log(`${point.timestamp}: ${point.clicks} clicks`);
   * }
   * ```
   */
  async timeseries(params?: TimeseriesParams): Promise<TimeseriesPoint[]> {
    return this.client.get<TimeseriesPoint[]>('/analytics/timeseries', {
      params: params as Record<string, string | number | undefined>,
    });
  }

  /**
   * Get geographic analytics (clicks by country).
   *
   * @param params - Optional date range and filter parameters.
   * @returns An array of entries, each representing click data for one country.
   *
   * @example
   * ```ts
   * const geo = await qck.analytics.geo({ days: 30 });
   * for (const entry of geo) {
   *   console.log(`${entry.country} (${entry.country_code}): ${entry.clicks} clicks`);
   * }
   * ```
   */
  async geo(params?: GeoAnalyticsParams): Promise<GeoAnalyticsEntry[]> {
    return this.client.get<GeoAnalyticsEntry[]>('/analytics/geo', {
      params: params as Record<string, string | number | undefined>,
    });
  }

  /**
   * Get device/browser analytics (clicks by device type, browser, OS).
   *
   * @param params - Optional date range and filter parameters.
   * @returns An array of entries, each representing click data for a device/browser/OS combination.
   *
   * @example
   * ```ts
   * const devices = await qck.analytics.devices({ days: 30 });
   * for (const entry of devices) {
   *   console.log(`${entry.device_type} / ${entry.browser} / ${entry.os}: ${entry.clicks}`);
   * }
   * ```
   */
  async devices(params?: DeviceAnalyticsParams): Promise<DeviceAnalyticsEntry[]> {
    return this.client.get<DeviceAnalyticsEntry[]>('/analytics/devices', {
      params: params as Record<string, string | number | undefined>,
    });
  }

  /**
   * Get referrer analytics (clicks by traffic source).
   *
   * @param params - Optional date range and filter parameters.
   * @returns An array of entries, each representing click data from a referrer source.
   *
   * @example
   * ```ts
   * const referrers = await qck.analytics.referrers({ days: 30 });
   * for (const entry of referrers) {
   *   console.log(`${entry.referrer}: ${entry.clicks} clicks, ${entry.unique_visitors} unique`);
   * }
   * ```
   */
  async referrers(params?: ReferrerAnalyticsParams): Promise<ReferrerAnalyticsEntry[]> {
    return this.client.get<ReferrerAnalyticsEntry[]>('/analytics/referrers', {
      params: params as Record<string, string | number | undefined>,
    });
  }

  /**
   * Get hourly analytics (click distribution by hour of day, 0-23 UTC).
   *
   * @param params - Optional date range and filter parameters.
   * @returns An array of 24 entries, one per hour, with click and visitor counts.
   *
   * @example
   * ```ts
   * const hourly = await qck.analytics.hourly({ days: 7 });
   * const peakHour = hourly.reduce((max, h) => h.clicks > max.clicks ? h : max);
   * console.log(`Peak hour: ${peakHour.hour}:00 UTC with ${peakHour.clicks} clicks`);
   * ```
   */
  async hourly(params?: HourlyAnalyticsParams): Promise<HourlyAnalyticsEntry[]> {
    return this.client.get<HourlyAnalyticsEntry[]>('/analytics/hourly', {
      params: params as Record<string, string | number | undefined>,
    });
  }
}
