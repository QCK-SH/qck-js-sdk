import type { HttpClient } from '../client.js';
import type {
  Link,
  CreateLinkParams,
  UpdateLinkParams,
  ListLinksParams,
  BulkCreateParams,
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
 * const { data, total } = await qck.links.list({
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
   * console.log(`${result.total} links found`);
   * ```
   */
  async list(params?: ListLinksParams): Promise<PaginatedResponse<Link>> {
    return this.client.get<PaginatedResponse<Link>>('/links', {
      params: params as Record<string, string | number | boolean | string[] | undefined>,
    });
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
   * @param params - Object containing an array of link creation payloads.
   * @returns An array of the newly created link objects.
   * @throws {ValidationError} If any link payload is invalid.
   *
   * @example
   * ```ts
   * const links = await qck.links.bulkCreate({
   *   links: [
   *     { url: 'https://example.com/page-1' },
   *     { url: 'https://example.com/page-2', custom_alias: 'p2' },
   *   ],
   * });
   * ```
   */
  async bulkCreate(params: BulkCreateParams): Promise<Link[]> {
    return this.client.post<Link[]>('/links/bulk', params.links);
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
   * console.log(`Unique clicks: ${stats.unique_clicks}`);
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
