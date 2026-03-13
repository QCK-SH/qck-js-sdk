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
 */
export class LinksResource {
  constructor(private readonly client: HttpClient) {}

  /**
   * Create a new short link.
   */
  async create(params: CreateLinkParams): Promise<Link> {
    return this.client.post<Link>('/links', params);
  }

  /**
   * List links with optional filtering, pagination, and sorting.
   */
  async list(params?: ListLinksParams): Promise<PaginatedResponse<Link>> {
    return this.client.get<PaginatedResponse<Link>>('/links', {
      params: params as Record<string, string | number | boolean | string[] | undefined>,
    });
  }

  /**
   * Get a single link by ID.
   */
  async get(id: string): Promise<Link> {
    return this.client.get<Link>(`/links/${id}`);
  }

  /**
   * Update an existing link.
   */
  async update(id: string, params: UpdateLinkParams): Promise<Link> {
    return this.client.patch<Link>(`/links/${id}`, params);
  }

  /**
   * Delete a link.
   */
  async delete(id: string): Promise<void> {
    return this.client.delete(`/links/${id}`);
  }

  /**
   * Bulk create multiple links at once.
   */
  async bulkCreate(params: BulkCreateParams): Promise<Link[]> {
    return this.client.post<Link[]>('/links/bulk', params.links);
  }

  /**
   * Get click statistics for a specific link.
   */
  async getStats(id: string): Promise<LinkStats> {
    return this.client.get<LinkStats>(`/links/${id}/stats`);
  }

  /**
   * Upload or replace the OG image for a link.
   * Accepts a File, Blob, ArrayBuffer, or Uint8Array containing the image data.
   *
   * @returns The public URL of the uploaded OG image.
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
   */
  async deleteOgImage(id: string): Promise<void> {
    return this.client.delete(`/links/${id}/og-image`);
  }
}
