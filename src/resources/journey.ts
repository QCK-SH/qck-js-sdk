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
 */
export class JourneyResource {
  constructor(private readonly client: HttpClient) {}

  /**
   * Ingest a batch of journey events.
   * Events are queued for processing asynchronously.
   */
  async ingest(params: IngestEventsParams): Promise<void> {
    return this.client.post('/journey/events', params);
  }

  /**
   * Get journey summary for a specific link.
   */
  async getSummary(linkId: string, params?: JourneyQueryParams): Promise<JourneyLinkSummary> {
    return this.client.get<JourneyLinkSummary>(`/journey/links/${linkId}/summary`, {
      params: params as Record<string, string | number | undefined>,
    });
  }

  /**
   * Get funnel analysis for a specific link.
   * Steps are matched against event_type or event_name.
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
