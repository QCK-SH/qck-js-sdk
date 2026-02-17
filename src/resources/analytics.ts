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
 */
export class AnalyticsResource {
  constructor(private readonly client: HttpClient) {}

  /**
   * Get an analytics summary with optional date range and link filter.
   */
  async summary(params?: AnalyticsSummaryParams): Promise<AnalyticsSummary> {
    return this.client.get<AnalyticsSummary>('/analytics/summary', {
      params: params as Record<string, string | number | undefined>,
    });
  }

  /**
   * Get timeseries click data with configurable interval.
   */
  async timeseries(params?: TimeseriesParams): Promise<TimeseriesPoint[]> {
    return this.client.get<TimeseriesPoint[]>('/analytics/timeseries', {
      params: params as Record<string, string | number | undefined>,
    });
  }

  /**
   * Get geographic analytics (clicks by country).
   */
  async geo(params?: GeoAnalyticsParams): Promise<GeoAnalyticsEntry[]> {
    return this.client.get<GeoAnalyticsEntry[]>('/analytics/geo', {
      params: params as Record<string, string | number | undefined>,
    });
  }

  /**
   * Get device/browser analytics (clicks by device type, browser, OS).
   */
  async devices(params?: DeviceAnalyticsParams): Promise<DeviceAnalyticsEntry[]> {
    return this.client.get<DeviceAnalyticsEntry[]>('/analytics/devices', {
      params: params as Record<string, string | number | undefined>,
    });
  }

  /**
   * Get referrer analytics (clicks by traffic source).
   */
  async referrers(params?: ReferrerAnalyticsParams): Promise<ReferrerAnalyticsEntry[]> {
    return this.client.get<ReferrerAnalyticsEntry[]>('/analytics/referrers', {
      params: params as Record<string, string | number | undefined>,
    });
  }

  /**
   * Get hourly analytics (click distribution by hour of day, 0-23).
   */
  async hourly(params?: HourlyAnalyticsParams): Promise<HourlyAnalyticsEntry[]> {
    return this.client.get<HourlyAnalyticsEntry[]>('/analytics/hourly', {
      params: params as Record<string, string | number | undefined>,
    });
  }
}
