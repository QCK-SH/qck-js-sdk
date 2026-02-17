import type { HttpClient } from '../client.js';
import type { Domain } from '../types.js';

/**
 * List custom domains through the QCK API.
 */
export class DomainsResource {
  constructor(private readonly client: HttpClient) {}

  /**
   * List all custom domains for the authenticated account.
   */
  async list(organizationId: string): Promise<Domain[]> {
    return this.client.get<Domain[]>('/domains', {
      params: { organizationId },
    });
  }
}
