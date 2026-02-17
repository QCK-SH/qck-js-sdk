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
   * List all links with optional pagination and search.
   */
  async list(params?: ListLinksParams): Promise<PaginatedResponse<Link>> {
    return this.client.get<PaginatedResponse<Link>>('/links', {
      params: params as Record<string, string | number | undefined>,
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
}
