import type { HttpClient } from '../client.js';
import type {
  Link,
  CreateLinkParams,
  UpdateLinkParams,
  ListLinksParams,
  BulkCreateParams,
  BulkCreateResult,
  LinkStats,
  PaginatedResponse,
} from '../types.js';

/**
 * Manage short links through the QCK API.
 *
 * @description Provides methods to create, retrieve, update, delete, and
 * bulk-create short links. Also supports fetching per-link click statistics
 * and managing OG images.
 *
 * @example
 * ```ts
 * const qck = new QCK({ apiKey: 'qck_...' });
 *
 * // Create a link with a custom alias
 * const link = await qck.links.create({
 *   url: 'https://example.com',
 *   custom_alias: 'my-link',
 *   tags: ['marketing'],
 * });
 *
 * // List links with filtering
 * const { data, total, total_pages } = await qck.links.list({
 *   search: 'example',
 *   sort_by: 'total_clicks',
 *   sort_order: 'desc',
 * });
 * ```
 */
export class LinksResource {
  /**
   * @param client - The HTTP client used for making API requests.
   */
  constructor(private readonly client: HttpClient) {}

  /**
   * Create a new short link.
   *
   * @param params - Link creation parameters including the destination URL.
   * @returns The newly created link object.
   * @throws {ValidationError} If the URL is invalid or required fields are missing.
   * @throws {AuthenticationError} If the API key is invalid.
   *
   * @example
   * ```ts
   * const link = await qck.links.create({
   *   url: 'https://example.com/landing',
   *   custom_alias: 'promo',
   *   utm_source: 'newsletter',
   *   utm_medium: 'email',
   * });
   * console.log(link.short_url); // 'https://qck.sh/promo'
   * ```
   */
  async create(params: CreateLinkParams): Promise<Link> {
    return this.client.post<Link>('/links', params);
  }

  /**
   * List links with optional filtering, pagination, and sorting.
   *
   * @param params - Optional filtering and pagination parameters.
   * @returns A paginated response containing an array of links and metadata.
   *
   * @example
   * ```ts
   * const result = await qck.links.list({
   *   page: 1,
   *   per_page: 50,
   *   tags: ['marketing'],
   *   is_active: true,
   * });
   * console.log(`${result.total} links found across ${result.total_pages} pages`);
   * ```
   */
  async list(params?: ListLinksParams): Promise<PaginatedResponse<Link>> {
    // The API returns the links as a bare array in `data`, with pagination
    // fields in the envelope's `meta` block.
    const { data, meta } = await this.client.getWithMeta<Link[]>('/links', {
      params: params as Record<string, string | number | boolean | string[] | undefined>,
    });

    const items = data ?? [];
    return {
      data: items,
      page: meta?.page ?? params?.page ?? 1,
      per_page: meta?.per_page ?? params?.per_page ?? items.length,
      total: meta?.total ?? items.length,
      total_pages: meta?.total_pages ?? 1,
    };
  }

  /**
   * Get a single link by ID.
   *
   * @param id - The unique identifier (UUID) of the link.
   * @returns The link object.
   * @throws {NotFoundError} If the link does not exist.
   *
   * @example
   * ```ts
   * const link = await qck.links.get('550e8400-e29b-41d4-a716-446655440000');
   * ```
   */
  async get(id: string): Promise<Link> {
    return this.client.get<Link>(`/links/${id}`);
  }

  /**
   * Update an existing link.
   *
   * @param id - The unique identifier (UUID) of the link to update.
   * @param params - Fields to update. Only provided fields are modified.
   * @returns The updated link object.
   * @throws {NotFoundError} If the link does not exist.
   * @throws {ValidationError} If the update payload is invalid.
   *
   * @example
   * ```ts
   * const updated = await qck.links.update('550e8400-...', {
   *   title: 'New Title',
   *   is_active: false,
   * });
   * ```
   */
  async update(id: string, params: UpdateLinkParams): Promise<Link> {
    return this.client.patch<Link>(`/links/${id}`, params);
  }

  /**
   * Delete a link.
   *
   * @param id - The unique identifier (UUID) of the link to delete.
   * @throws {NotFoundError} If the link does not exist.
   *
   * @example
   * ```ts
   * await qck.links.delete('550e8400-...');
   * ```
   */
  async delete(id: string): Promise<void> {
    return this.client.delete(`/links/${id}`);
  }

  /**
   * Bulk create multiple links at once.
   *
   * @description Supports partial success: the API responds with HTTP 201
   * when every link is created, 207 when some links fail, and 422 when all
   * fail. In all three cases this method returns the {@link BulkCreateResult}
   * describing per-item outcomes — inspect `created` and `failed` rather
   * than relying on a thrown error.
   *
   * @param params - Object containing an array of link creation payloads.
   * @returns The bulk operation result with created links and per-item failures.
   * @throws {ValidationError} If the request itself is invalid (e.g. empty
   *   batch or batch size over your tier limit).
   *
   * @example
   * ```ts
   * const result = await qck.links.bulkCreate({
   *   links: [
   *     { url: 'https://example.com/page-1' },
   *     { url: 'https://example.com/page-2', custom_alias: 'p2' },
   *   ],
   * });
   * console.log(`${result.success_count}/${result.total_requested} created`);
   * for (const failure of result.failed) {
   *   console.warn(`#${failure.index} ${failure.url}: ${failure.error}`);
   * }
   * ```
   */
  async bulkCreate(params: BulkCreateParams): Promise<BulkCreateResult> {
    // 422 (all items failed) still carries the result payload — return it
    // so callers can inspect per-item errors. 207 (partial) is handled by
    // the HTTP layer's envelope logic.
    return this.client.post<BulkCreateResult>('/links/bulk', params.links, {
      acceptErrorStatuses: [422],
    });
  }

  /**
   * Get click statistics for a specific link.
   *
   * @param id - The unique identifier (UUID) of the link.
   * @returns Click statistics broken down by country, device, and referrer.
   * @throws {NotFoundError} If the link does not exist.
   *
   * @example
   * ```ts
   * const stats = await qck.links.getStats('550e8400-...');
   * console.log(`Total clicks: ${stats.total_clicks}`);
   * console.log(`Unique visitors: ${stats.unique_visitors}`);
   * ```
   */
  async getStats(id: string): Promise<LinkStats> {
    return this.client.get<LinkStats>(`/links/${id}/stats`);
  }

  /**
   * Upload or replace the OG image for a link.
   * Accepts a File, Blob, ArrayBuffer, or Uint8Array containing the image data.
   *
   * @param id - The unique identifier (UUID) of the link.
   * @param file - The image data to upload. The MIME type is auto-detected from Blobs.
   * @returns An object containing the public URL of the uploaded OG image.
   * @throws {NotFoundError} If the link does not exist.
   * @throws {ValidationError} If the file format is unsupported.
   *
   * @example
   * ```ts
   * const imageBuffer = await fetch('https://example.com/image.png')
   *   .then(r => r.arrayBuffer());
   * const result = await qck.links.uploadOgImage('550e8400-...', imageBuffer);
   * console.log(result.og_image); // Public URL
   * ```
   */
  async uploadOgImage(
    id: string,
    file: Blob | ArrayBuffer | Uint8Array,
  ): Promise<{ og_image: string }> {
    const contentType =
      file instanceof Blob
        ? file.type || 'application/octet-stream'
        : 'application/octet-stream';

    return this.client.putRaw<{ og_image: string }>(
      `/links/${id}/og-image`,
      file,
      contentType,
    );
  }

  /**
   * Delete the OG image for a link.
   *
   * @param id - The unique identifier (UUID) of the link.
   * @throws {NotFoundError} If the link does not exist.
   *
   * @example
   * ```ts
   * await qck.links.deleteOgImage('550e8400-...');
   * ```
   */
  async deleteOgImage(id: string): Promise<void> {
    return this.client.delete(`/links/${id}/og-image`);
  }
}
