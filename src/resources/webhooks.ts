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
 *
 * @description Provides methods to create, list, update, and delete webhook
 * endpoints, as well as view delivery history and send test deliveries.
 * Use {@link WebhookEvents} constants when specifying event types.
 *
 * @example
 * ```ts
 * import { QCK, WebhookEvents } from '@qck/sdk';
 *
 * const qck = new QCK({ apiKey: 'qck_...' });
 *
 * // Create a webhook for link events
 * const webhook = await qck.webhooks.create({
 *   url: 'https://example.com/webhooks',
 *   events: [WebhookEvents.LINK_CREATED, WebhookEvents.LINK_DELETED],
 *   description: 'Link lifecycle notifications',
 * });
 * console.log(`Webhook secret: ${webhook.secret}`);
 * ```
 */
export class WebhooksResource {
  /**
   * @param client - The HTTP client used for making API requests.
   */
  constructor(private readonly client: HttpClient) {}

  /**
   * Create a new webhook endpoint.
   *
   * @param params - Webhook creation parameters including URL and subscribed events.
   * @returns The newly created webhook endpoint, including the signing secret.
   * @throws {ValidationError} If the URL is invalid or events are empty.
   *
   * @example
   * ```ts
   * const webhook = await qck.webhooks.create({
   *   url: 'https://example.com/webhooks/qck',
   *   events: [WebhookEvents.LINK_CREATED],
   *   description: 'Notify on new links',
   * });
   * // Store webhook.secret for signature verification
   * ```
   */
  async create(params: CreateWebhookParams): Promise<WebhookEndpoint> {
    return this.client.post<WebhookEndpoint>('/webhooks', params);
  }

  /**
   * List all webhook endpoints for the authenticated account.
   *
   * @returns An array of all registered webhook endpoints.
   *
   * @example
   * ```ts
   * const webhooks = await qck.webhooks.list();
   * for (const wh of webhooks) {
   *   console.log(`${wh.url} - ${wh.is_active ? 'active' : 'paused'}`);
   * }
   * ```
   */
  async list(): Promise<WebhookEndpoint[]> {
    return this.client.get<WebhookEndpoint[]>('/webhooks');
  }

  /**
   * Get a single webhook endpoint by ID.
   *
   * @param id - The unique identifier (UUID) of the webhook endpoint.
   * @returns The webhook endpoint object.
   * @throws {NotFoundError} If the webhook does not exist.
   *
   * @example
   * ```ts
   * const webhook = await qck.webhooks.get('wh-uuid');
   * console.log(`Events: ${webhook.events.join(', ')}`);
   * ```
   */
  async get(id: string): Promise<WebhookEndpoint> {
    return this.client.get<WebhookEndpoint>(`/webhooks/${id}`);
  }

  /**
   * Update an existing webhook endpoint.
   *
   * @param id - The unique identifier (UUID) of the webhook endpoint.
   * @param params - Fields to update. Only provided fields are modified.
   * @returns The updated webhook endpoint object.
   * @throws {NotFoundError} If the webhook does not exist.
   * @throws {ValidationError} If the update payload is invalid.
   *
   * @example
   * ```ts
   * const updated = await qck.webhooks.update('wh-uuid', {
   *   events: [WebhookEvents.LINK_CREATED, WebhookEvents.LINK_UPDATED],
   *   is_active: true,
   * });
   * ```
   */
  async update(id: string, params: UpdateWebhookParams): Promise<WebhookEndpoint> {
    return this.client.patch<WebhookEndpoint>(`/webhooks/${id}`, params);
  }

  /**
   * Delete a webhook endpoint.
   *
   * @param id - The unique identifier (UUID) of the webhook endpoint.
   * @throws {NotFoundError} If the webhook does not exist.
   *
   * @example
   * ```ts
   * await qck.webhooks.delete('wh-uuid');
   * ```
   */
  async delete(id: string): Promise<void> {
    return this.client.delete(`/webhooks/${id}`);
  }

  /**
   * List delivery attempts for a webhook endpoint.
   *
   * @param id - The unique identifier (UUID) of the webhook endpoint.
   * @param params - Optional pagination parameters.
   * @returns A paginated response containing delivery attempt records.
   * @throws {NotFoundError} If the webhook does not exist.
   *
   * @example
   * ```ts
   * const deliveries = await qck.webhooks.listDeliveries('wh-uuid', {
   *   page: 1,
   *   limit: 50,
   * });
   * for (const d of deliveries.data) {
   *   console.log(`${d.event_type}: ${d.status} (HTTP ${d.http_status})`);
   * }
   * ```
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
   * Useful for verifying that your endpoint is reachable and correctly
   * configured to handle webhook payloads.
   *
   * @param id - The unique identifier (UUID) of the webhook endpoint.
   * @throws {NotFoundError} If the webhook does not exist.
   *
   * @example
   * ```ts
   * await qck.webhooks.test('wh-uuid');
   * console.log('Test delivery sent!');
   * ```
   */
  async test(id: string): Promise<void> {
    return this.client.post(`/webhooks/${id}/test`);
  }
}
