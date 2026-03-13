import type { HttpClient } from '../client.js';
import type { Domain } from '../types.js';

/**
 * List custom domains through the QCK API.
 *
 * @description Provides methods to query custom domains configured for an
 * organization. Custom domains allow short links to be hosted on your own
 * domain (e.g. `links.example.com`) instead of the default `qck.sh`.
 *
 * @example
 * ```ts
 * const qck = new QCK({ apiKey: 'qck_...' });
 *
 * const domains = await qck.domains.list('org-uuid');
 * for (const domain of domains) {
 *   console.log(`${domain.domain} - verified: ${domain.is_verified}`);
 * }
 * ```
 */
export class DomainsResource {
  /**
   * @param client - The HTTP client used for making API requests.
   */
  constructor(private readonly client: HttpClient) {}

  /**
   * List all custom domains for the specified organization.
   *
   * @param organizationId - The unique identifier (UUID) of the organization.
   * @returns An array of custom domain objects.
   * @throws {AuthenticationError} If the API key is invalid.
   *
   * @example
   * ```ts
   * const domains = await qck.domains.list('org-uuid');
   * const verified = domains.filter(d => d.is_verified);
   * console.log(`${verified.length} verified domains`);
   * ```
   */
  async list(organizationId: string): Promise<Domain[]> {
    return this.client.get<Domain[]>('/domains', {
      params: { organizationId },
    });
  }
}
