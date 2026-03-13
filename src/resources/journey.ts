import type { HttpClient } from '../client.js';
import type {
  JourneyEvent,
  IngestEventsParams,
  JourneyLinkSummary,
  FunnelResult,
  FunnelParams,
  JourneyQueryParams,
  SessionSummary,
  ListJourneySessionsParams,
  ListJourneyEventsParams,
  PaginatedResponse,
} from '../types.js';

/**
 * Track and analyze visitor journeys through the QCK API.
 *
 * @description Provides methods to ingest journey events (page views, scroll
 * depth, custom events) and query visitor journey data including summaries,
 * funnel analysis, session listings, and raw event logs.
 *
 * @example
 * ```ts
 * const qck = new QCK({ apiKey: 'qck_...' });
 *
 * // Ingest events from your server
 * await qck.journey.ingest({
 *   events: [
 *     {
 *       link_id: 'link-uuid',
 *       visitor_id: 'vis_123',
 *       session_id: 'ses_456',
 *       event_type: 'page_view',
 *       page_url: 'https://example.com/landing',
 *     },
 *   ],
 * });
 *
 * // Get journey summary for a link
 * const summary = await qck.journey.getSummary('link-uuid', { period: '30d' });
 * ```
 */
export class JourneyResource {
  /**
   * @param client - The HTTP client used for making API requests.
   */
  constructor(private readonly client: HttpClient) {}

  /**
   * Ingest a batch of journey events.
   * Events are queued for processing asynchronously.
   *
   * @param params - Object containing the array of events to ingest.
   * @throws {ValidationError} If any event in the batch is invalid.
   *
   * @example
   * ```ts
   * await qck.journey.ingest({
   *   events: [
   *     {
   *       link_id: 'link-uuid',
   *       visitor_id: 'vis_123',
   *       session_id: 'ses_456',
   *       event_type: 'page_view',
   *       page_url: 'https://example.com/page-1',
   *       page_title: 'Page One',
   *     },
   *     {
   *       link_id: 'link-uuid',
   *       visitor_id: 'vis_123',
   *       session_id: 'ses_456',
   *       event_type: 'scroll_depth',
   *       page_url: 'https://example.com/page-1',
   *       scroll_percent: 75,
   *     },
   *   ],
   * });
   * ```
   */
  async ingest(params: IngestEventsParams): Promise<void> {
    return this.client.post('/journey/events', params);
  }

  /**
   * Get journey summary for a specific link.
   *
   * @param linkId - The unique identifier (UUID) of the link.
   * @param params - Optional period filter.
   * @returns Aggregated journey metrics including visitors, sessions, top pages, and top events.
   * @throws {NotFoundError} If the link does not exist.
   *
   * @example
   * ```ts
   * const summary = await qck.journey.getSummary('link-uuid', { period: '30d' });
   * console.log(`${summary.total_visitors} visitors, ${summary.total_sessions} sessions`);
   * console.log(`Avg session: ${summary.avg_session_duration_seconds}s`);
   * ```
   */
  async getSummary(linkId: string, params?: JourneyQueryParams): Promise<JourneyLinkSummary> {
    return this.client.get<JourneyLinkSummary>(`/journey/links/${linkId}/summary`, {
      params: params as Record<string, string | number | undefined>,
    });
  }

  /**
   * Get funnel analysis for a specific link.
   * Steps are matched against event_type or event_name.
   *
   * @param linkId - The unique identifier (UUID) of the link.
   * @param params - Funnel configuration with ordered step names and optional period.
   * @returns Funnel analysis showing visitor drop-off at each step.
   * @throws {NotFoundError} If the link does not exist.
   *
   * @example
   * ```ts
   * const funnel = await qck.journey.getFunnel('link-uuid', {
   *   steps: ['page_view', 'scroll_depth', 'conversion'],
   *   period: '30d',
   * });
   * for (const step of funnel.steps) {
   *   console.log(`${step.step_name}: ${step.visitors} visitors (${step.conversion_rate}%)`);
   * }
   * ```
   */
  async getFunnel(linkId: string, params: FunnelParams): Promise<FunnelResult> {
    return this.client.get<FunnelResult>(`/journey/links/${linkId}/funnel`, {
      params: {
        steps: params.steps.join(','),
        period: params.period,
      } as Record<string, string | number | undefined>,
    });
  }

  /**
   * List sessions for a specific link.
   *
   * @param linkId - The unique identifier (UUID) of the link.
   * @param params - Optional pagination, visitor filter, and period parameters.
   * @returns A paginated response containing session summaries.
   * @throws {NotFoundError} If the link does not exist.
   *
   * @example
   * ```ts
   * const sessions = await qck.journey.listSessions('link-uuid', {
   *   page: 1,
   *   limit: 20,
   *   period: '7d',
   * });
   * for (const session of sessions.data) {
   *   console.log(`Session ${session.session_id}: ${session.event_count} events`);
   * }
   * ```
   */
  async listSessions(
    linkId: string,
    params?: ListJourneySessionsParams,
  ): Promise<PaginatedResponse<SessionSummary>> {
    return this.client.get<PaginatedResponse<SessionSummary>>(
      `/journey/links/${linkId}/sessions`,
      {
        params: params as Record<string, string | number | undefined>,
      },
    );
  }

  /**
   * List raw events for a specific link.
   *
   * @param linkId - The unique identifier (UUID) of the link.
   * @param params - Optional pagination, event type filter, and period parameters.
   * @returns A paginated response containing raw journey events.
   * @throws {NotFoundError} If the link does not exist.
   *
   * @example
   * ```ts
   * const events = await qck.journey.listEvents('link-uuid', {
   *   event_type: 'page_view',
   *   period: '7d',
   *   limit: 100,
   * });
   * for (const event of events.data) {
   *   console.log(`${event.event_type}: ${event.page_url} at ${event.timestamp}`);
   * }
   * ```
   */
  async listEvents(
    linkId: string,
    params?: ListJourneyEventsParams,
  ): Promise<PaginatedResponse<JourneyEvent>> {
    return this.client.get<PaginatedResponse<JourneyEvent>>(
      `/journey/links/${linkId}/events`,
      {
        params: params as Record<string, string | number | undefined>,
      },
    );
  }
}
