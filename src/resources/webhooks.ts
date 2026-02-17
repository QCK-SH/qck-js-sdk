import type { HttpClient } from '../client.js';
import type {
  WebhookEndpoint,
  CreateWebhookParams,
  UpdateWebhookParams,
  WebhookDelivery,
  ListWebhookDeliveriesParams,
  PaginatedResponse,
} from '../types.js';

/**
 * Manage webhook endpoints through the QCK API.
 */
export class WebhooksResource {
  constructor(private readonly client: HttpClient) {}

  /**
   * Create a new webhook endpoint.
   */
  async create(params: CreateWebhookParams): Promise<WebhookEndpoint> {
    return this.client.post<WebhookEndpoint>('/webhooks', params);
  }

  /**
   * List all webhook endpoints.
   */
  async list(): Promise<WebhookEndpoint[]> {
    return this.client.get<WebhookEndpoint[]>('/webhooks');
  }

  /**
   * Get a single webhook endpoint by ID.
   */
  async get(id: string): Promise<WebhookEndpoint> {
    return this.client.get<WebhookEndpoint>(`/webhooks/${id}`);
  }

  /**
   * Update an existing webhook endpoint.
   */
  async update(id: string, params: UpdateWebhookParams): Promise<WebhookEndpoint> {
    return this.client.patch<WebhookEndpoint>(`/webhooks/${id}`, params);
  }

  /**
   * Delete a webhook endpoint.
   */
  async delete(id: string): Promise<void> {
    return this.client.delete(`/webhooks/${id}`);
  }

  /**
   * List delivery attempts for a webhook endpoint.
   */
  async listDeliveries(
    id: string,
    params?: ListWebhookDeliveriesParams,
  ): Promise<PaginatedResponse<WebhookDelivery>> {
    return this.client.get<PaginatedResponse<WebhookDelivery>>(
      `/webhooks/${id}/deliveries`,
      {
        params: params as Record<string, string | number | undefined>,
      },
    );
  }

  /**
   * Send a test delivery to a webhook endpoint.
   */
  async test(id: string): Promise<void> {
    return this.client.post(`/webhooks/${id}/test`);
  }
}
