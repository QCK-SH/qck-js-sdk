import type { HttpClient } from '../client.js';
import type {
  AnalyticsSummary,
  AnalyticsSummaryParams,
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
}
