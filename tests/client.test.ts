import { describe, it, expect, vi, afterEach } from 'vitest';
import { QCK, AuthenticationError, RateLimitError, NotFoundError, ValidationError, QCKError, JourneyResource } from '../src/index.js';
import type { ResponseMeta } from '../src/index.js';

// ── Helpers ──

function mockFetch(response: {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
}) {
  const status = response.status ?? 200;
  const ok = status >= 200 && status < 300;
  const headers = new Headers(response.headers);

  if (response.body === undefined && status === 204) {
    headers.set('content-length', '0');
  }

  return vi.fn().mockResolvedValue({
    ok,
    status,
    headers,
    json: () =>
      response.body === undefined
        ? Promise.reject(new SyntaxError('Unexpected end of JSON input'))
        : Promise.resolve(response.body),
  } as unknown as Response);
}

function meta(extra?: Partial<ResponseMeta>): ResponseMeta {
  return {
    request_id: '01900000-0000-7000-8000-000000000000',
    timestamp: '2026-06-11T00:00:00Z',
    ...extra,
  };
}

/** Standard success envelope, as built by the backend's ApiResponse::success. */
function apiSuccess<T>(data: T, metaExtra?: Partial<ResponseMeta>) {
  return { success: true, data, meta: meta(metaExtra) };
}

/** Standard error envelope (handler-level errors). */
function apiError(code: string, message: string) {
  return { success: false, error: { code, message }, meta: meta() };
}

/** Flat middleware error shape (API key auth, rate limiter). */
function flatError(code: string, message: string) {
  return { success: false, error: code, message };
}

// ── Tests ──

describe('QCK SDK', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('instantiation', () => {
    it('requires an API key', () => {
      expect(() => new QCK({ apiKey: '' })).toThrow('API key');
    });

    it('creates resource namespaces', () => {
      const qck = new QCK({ apiKey: 'qck_test' });
      expect(qck.links).toBeDefined();
      expect(qck.analytics).toBeDefined();
      expect(qck.domains).toBeDefined();
      expect(qck.webhooks).toBeDefined();
      expect(qck.conversions).toBeDefined();
    });
  });

  describe('authentication', () => {
    it('sends X-API-Key header on every request', async () => {
      const fetchMock = mockFetch({
        status: 200,
        body: apiSuccess({ id: '1', short_code: 'abc' }),
      });
      globalThis.fetch = fetchMock;

      const qck = new QCK({ apiKey: 'qck_my_secret_key', baseUrl: 'https://api.test.com' });
      await qck.links.get('1');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers['X-API-Key']).toBe('qck_my_secret_key');
    });

    it('defaults the base URL to https://qck.sh/public-api/v1', async () => {
      const fetchMock = mockFetch({
        status: 200,
        body: apiSuccess({ id: '1', short_code: 'abc' }),
      });
      globalThis.fetch = fetchMock;

      const qck = new QCK({ apiKey: 'qck_test' });
      await qck.links.get('1');

      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toBe('https://qck.sh/public-api/v1/links/1');
    });
  });

  describe('error mapping', () => {
    it('throws AuthenticationError on 401 with envelope error', async () => {
      globalThis.fetch = mockFetch({
        status: 401,
        body: apiError('UNAUTHORIZED', 'Invalid API key'),
      });

      const qck = new QCK({ apiKey: 'qck_bad', baseUrl: 'https://api.test.com' });
      await expect(qck.links.list()).rejects.toThrow(AuthenticationError);
    });

    it('throws AuthenticationError on 401 with flat middleware error shape', async () => {
      globalThis.fetch = mockFetch({
        status: 401,
        body: flatError('INVALID_API_KEY', 'Invalid or expired API key'),
      });

      const qck = new QCK({ apiKey: 'qck_bad_key_format_padding', baseUrl: 'https://api.test.com' });

      try {
        await qck.links.list();
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AuthenticationError);
        expect((err as QCKError).message).toBe('Invalid or expired API key');
      }
    });

    it('throws ValidationError on 400', async () => {
      globalThis.fetch = mockFetch({
        status: 400,
        body: apiError('VALIDATION_ERROR', 'URL is required'),
      });

      const qck = new QCK({ apiKey: 'qck_test', baseUrl: 'https://api.test.com' });
      await expect(qck.links.create({ url: '' })).rejects.toThrow(ValidationError);
    });

    it('throws NotFoundError on 404', async () => {
      globalThis.fetch = mockFetch({
        status: 404,
        body: apiError('NOT_FOUND', 'Link not found'),
      });

      const qck = new QCK({ apiKey: 'qck_test', baseUrl: 'https://api.test.com' });
      await expect(qck.links.get('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('throws QCKError with code on 500', async () => {
      globalThis.fetch = mockFetch({
        status: 500,
        body: apiError('INTERNAL_ERROR', 'Something broke'),
      });

      const qck = new QCK({ apiKey: 'qck_test', baseUrl: 'https://api.test.com' });

      try {
        await qck.links.list();
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(QCKError);
        expect((err as QCKError).code).toBe('INTERNAL_ERROR');
        expect((err as QCKError).status).toBe(500);
      }
    });
  });

  describe('rate limiting', () => {
    it('throws RateLimitError on 429 after exhausting retries', async () => {
      globalThis.fetch = mockFetch({
        status: 429,
        body: apiError('RATE_LIMIT_EXCEEDED', 'Too many requests'),
        headers: { 'Retry-After': '5' },
      });

      const qck = new QCK({
        apiKey: 'qck_test',
        baseUrl: 'https://api.test.com',
        retries: 0,
      });

      await expect(qck.links.list()).rejects.toThrow(RateLimitError);
    });

    it('handles flat middleware error shape on 429', async () => {
      globalThis.fetch = mockFetch({
        status: 429,
        body: flatError('RATE_LIMITED', 'Rate limit exceeded. Try again later.'),
        headers: { 'Retry-After': '30' },
      });

      const qck = new QCK({
        apiKey: 'qck_test',
        baseUrl: 'https://api.test.com',
        retries: 0,
      });

      try {
        await qck.links.list();
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(RateLimitError);
        expect((err as QCKError).message).toBe('Rate limit exceeded. Try again later.');
        expect((err as RateLimitError).retryAfter).toBe(30);
      }
    });

    it('retries on 429 and succeeds', async () => {
      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 429,
            headers: new Headers({ 'Retry-After': '0' }),
            json: () => Promise.resolve(apiError('RATE_LIMIT_EXCEEDED', 'Slow down')),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: () =>
            Promise.resolve(apiSuccess([], { page: 1, per_page: 20, total: 0, total_pages: 0 })),
        });
      });

      const qck = new QCK({
        apiKey: 'qck_test',
        baseUrl: 'https://api.test.com',
        retries: 3,
      });

      const result = await qck.links.list();
      expect(callCount).toBe(2);
      expect(result.data).toEqual([]);
    });

    it('retries POST requests on 429 (server confirmed not processed)', async () => {
      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 429,
            headers: new Headers({ 'Retry-After': '0' }),
            json: () => Promise.resolve(flatError('RATE_LIMITED', 'Slow down')),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: () => Promise.resolve(apiSuccess({ id: '1', short_code: 'abc' })),
        });
      });

      const qck = new QCK({ apiKey: 'qck_test', baseUrl: 'https://api.test.com', retries: 2 });
      const link = await qck.links.create({ url: 'https://example.com' });
      expect(callCount).toBe(2);
      expect(link.short_code).toBe('abc');
    });

    it('includes retryAfter from Retry-After header', async () => {
      globalThis.fetch = mockFetch({
        status: 429,
        body: apiError('RATE_LIMIT_EXCEEDED', 'Too many requests'),
        headers: { 'Retry-After': '42' },
      });

      const qck = new QCK({
        apiKey: 'qck_test',
        baseUrl: 'https://api.test.com',
        retries: 0,
      });

      try {
        await qck.links.list();
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(RateLimitError);
        expect((err as RateLimitError).retryAfter).toBe(42);
      }
    });
  });

  describe('network error retry policy', () => {
    it('retries GET requests on network errors', async () => {
      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new TypeError('fetch failed'));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: () => Promise.resolve(apiSuccess({ id: '1', short_code: 'abc' })),
        });
      });

      const qck = new QCK({ apiKey: 'qck_test', baseUrl: 'https://api.test.com', retries: 2 });
      const link = await qck.links.get('1');
      expect(callCount).toBe(2);
      expect(link.short_code).toBe('abc');
    });

    it('does NOT retry POST requests on network errors (non-idempotent)', async () => {
      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.reject(new TypeError('fetch failed'));
      });

      const qck = new QCK({ apiKey: 'qck_test', baseUrl: 'https://api.test.com', retries: 3 });

      try {
        await qck.links.create({ url: 'https://example.com' });
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(QCKError);
        expect((err as QCKError).code).toBe('NETWORK_ERROR');
      }
      expect(callCount).toBe(1);
    });

    it('retries journey ingest on network errors (carries X-Idempotency-Key)', async () => {
      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new TypeError('fetch failed'));
        }
        return Promise.resolve({
          ok: true,
          status: 202,
          headers: new Headers(),
          json: () => Promise.resolve(apiSuccess({ accepted: 1 }, { status: 202 })),
        });
      });

      const qck = new QCK({ apiKey: 'qck_test', baseUrl: 'https://api.test.com', retries: 2 });
      await qck.journey.ingest({
        events: [
          {
            link_id: 'link_1',
            visitor_id: 'v_1',
            event_type: 'page_view',
            page_url: 'https://example.com',
          },
        ],
      });
      expect(callCount).toBe(2);

      // Same idempotency key on both attempts
      const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const headers1 = (calls[0][1] as RequestInit).headers as Record<string, string>;
      const headers2 = (calls[1][1] as RequestInit).headers as Record<string, string>;
      expect(headers1['X-Idempotency-Key']).toBeDefined();
      expect(headers1['X-Idempotency-Key']).toBe(headers2['X-Idempotency-Key']);
    });
  });

  describe('response unwrapping', () => {
    it('unwraps successful API responses to return data directly', async () => {
      const linkData = {
        id: 'link_123',
        short_code: 'abc',
        original_url: 'https://example.com',
        short_url: 'https://qck.sh/abc',
        is_active: true,
        total_clicks: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        campaign_id: null,
        campaign_name: null,
        utm_source: null,
        utm_medium: null,
        utm_campaign: null,
        utm_term: null,
        utm_content: null,
      };

      globalThis.fetch = mockFetch({
        status: 200,
        body: apiSuccess(linkData),
      });

      const qck = new QCK({ apiKey: 'qck_test', baseUrl: 'https://api.test.com' });
      const result = await qck.links.get('link_123');
      expect(result).toEqual(linkData);
    });

    it('handles 204 No Content for delete operations', async () => {
      globalThis.fetch = mockFetch({ status: 204 });

      const qck = new QCK({ apiKey: 'qck_test', baseUrl: 'https://api.test.com' });
      await expect(qck.links.delete('link_123')).resolves.toBeUndefined();
    });
  });

  describe('pagination (links.list)', () => {
    it('builds the paginated response from meta', async () => {
      const links = [
        { id: '1', short_code: 'aaa' },
        { id: '2', short_code: 'bbb' },
      ];
      globalThis.fetch = mockFetch({
        status: 200,
        body: apiSuccess(links, { page: 2, per_page: 2, total: 5, total_pages: 3 }),
      });

      const qck = new QCK({ apiKey: 'qck_test', baseUrl: 'https://api.test.com' });
      const result = await qck.links.list({ page: 2, per_page: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].short_code).toBe('aaa');
      expect(result.page).toBe(2);
      expect(result.per_page).toBe(2);
      expect(result.total).toBe(5);
      expect(result.total_pages).toBe(3);
    });
  });

  describe('bulk create', () => {
    const partialResult = {
      created: [
        { index: 0, link: { id: '1', short_code: 'ok1' } },
      ],
      failed: [
        { index: 1, url: 'https://bad.example', error: 'Blocked URL', error_type: 'security' },
      ],
      total_requested: 2,
      success_count: 1,
      failure_count: 1,
    };

    it('returns the result on 201 full success', async () => {
      const fullResult = {
        created: [
          { index: 0, link: { id: '1', short_code: 'ok1' } },
          { index: 1, link: { id: '2', short_code: 'ok2' } },
        ],
        failed: [],
        total_requested: 2,
        success_count: 2,
        failure_count: 0,
      };
      globalThis.fetch = mockFetch({
        status: 201,
        body: apiSuccess(fullResult, { status: 201 }),
      });

      const qck = new QCK({ apiKey: 'qck_test', baseUrl: 'https://api.test.com' });
      const result = await qck.links.bulkCreate({
        links: [{ url: 'https://a.example' }, { url: 'https://b.example' }],
      });
      expect(result.success_count).toBe(2);
      expect(result.failed).toHaveLength(0);
    });

    it('returns the result on 207 partial success (success=false, data present)', async () => {
      // Backend sets success=false but includes the result payload on 207
      globalThis.fetch = mockFetch({
        status: 207,
        body: { success: false, data: partialResult, meta: meta({ status: 207 }) },
      });

      const qck = new QCK({ apiKey: 'qck_test', baseUrl: 'https://api.test.com' });
      const result = await qck.links.bulkCreate({
        links: [{ url: 'https://a.example' }, { url: 'https://bad.example' }],
      });
      expect(result.success_count).toBe(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error_type).toBe('security');
    });

    it('returns the result on 422 complete failure when data is present', async () => {
      const allFailed = {
        created: [],
        failed: [
          { index: 0, url: 'https://bad.example', error: 'Blocked URL', error_type: 'security' },
        ],
        total_requested: 1,
        success_count: 0,
        failure_count: 1,
      };
      globalThis.fetch = mockFetch({
        status: 422,
        body: { success: false, data: allFailed, meta: meta({ status: 422 }) },
      });

      const qck = new QCK({ apiKey: 'qck_test', baseUrl: 'https://api.test.com' });
      const result = await qck.links.bulkCreate({ links: [{ url: 'https://bad.example' }] });
      expect(result.success_count).toBe(0);
      expect(result.failure_count).toBe(1);
    });

    it('throws on 422 without a data payload', async () => {
      globalThis.fetch = mockFetch({
        status: 422,
        body: apiError('UNPROCESSABLE', 'Cannot process'),
      });

      const qck = new QCK({ apiKey: 'qck_test', baseUrl: 'https://api.test.com' });
      await expect(
        qck.links.bulkCreate({ links: [{ url: 'https://a.example' }] }),
      ).rejects.toThrow(QCKError);
    });

    it('sends the links array as the request body', async () => {
      const fetchMock = mockFetch({
        status: 201,
        body: apiSuccess({
          created: [], failed: [], total_requested: 1, success_count: 1, failure_count: 0,
        }),
      });
      globalThis.fetch = fetchMock;

      const qck = new QCK({ apiKey: 'qck_test', baseUrl: 'https://api.test.com' });
      await qck.links.bulkCreate({ links: [{ url: 'https://a.example' }] });

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/links/bulk');
      expect(JSON.parse(init.body as string)).toEqual([{ url: 'https://a.example' }]);
    });
  });

  describe('analytics', () => {
    const usage = {
      clicks_this_month: 1200,
      click_limit: 5000,
      limit_exceeded: false,
      tier: 'free',
      retention_days: 180,
    };

    it('returns { analytics, usage } for summary', async () => {
      const summary = {
        total_clicks: 100,
        unique_visitors: 80,
        total_links: 5,
        last_click_at: null,
        today_clicks: 3,
        yesterday_clicks: 7,
        active_links: 5,
        total_links_count: 6,
        links_this_month: 2,
        clicks_this_month: 1200,
      };
      globalThis.fetch = mockFetch({
        status: 200,
        body: apiSuccess({ analytics: summary, usage }),
      });

      const qck = new QCK({ apiKey: 'qck_test', baseUrl: 'https://api.test.com' });
      const result = await qck.analytics.summary({ days: 30 });

      expect(result.analytics.total_clicks).toBe(100);
      expect(result.analytics.links_this_month).toBe(2);
      expect(result.usage.tier).toBe('free');
      expect(result.usage.click_limit).toBe(5000);
    });

    it('returns { analytics, usage } for timeseries with date field', async () => {
      const points = [
        { date: '2026-06-10', clicks: 10, unique_visitors: 8 },
        { date: '2026-06-11', clicks: 12, unique_visitors: 9 },
      ];
      globalThis.fetch = mockFetch({
        status: 200,
        body: apiSuccess({ analytics: points, usage }),
      });

      const qck = new QCK({ apiKey: 'qck_test', baseUrl: 'https://api.test.com' });
      const result = await qck.analytics.timeseries({ days: 7 });

      expect(result.analytics).toHaveLength(2);
      expect(result.analytics[0].date).toBe('2026-06-10');
      expect(result.usage.retention_days).toBe(180);
    });

    it('returns geo entries with country_code only', async () => {
      const geo = [{ country_code: 'US', clicks: 50, unique_visitors: 40 }];
      globalThis.fetch = mockFetch({
        status: 200,
        body: apiSuccess({ analytics: geo, usage: { ...usage, limit_exceeded: true, cutoff_date: '2026-06-01' } }),
      });

      const qck = new QCK({ apiKey: 'qck_test', baseUrl: 'https://api.test.com' });
      const result = await qck.analytics.geo({ days: 30 });

      expect(result.analytics[0].country_code).toBe('US');
      expect(result.usage.limit_exceeded).toBe(true);
      expect(result.usage.cutoff_date).toBe('2026-06-01');
    });
  });

  describe('webhooks', () => {
    it('lists deliveries as a bare array', async () => {
      const deliveries = [
        {
          id: 'd1',
          endpoint_id: 'wh1',
          event_type: 'link.created',
          payload: { event: 'link.created' },
          status: 'delivered',
          attempt_number: 1,
          max_attempts: 5,
          http_status: 200,
          response_body: 'ok',
          error_message: null,
          next_retry_at: null,
          delivered_at: '2026-06-11T00:00:01Z',
          created_at: '2026-06-11T00:00:00Z',
        },
      ];
      const fetchMock = mockFetch({ status: 200, body: apiSuccess(deliveries) });
      globalThis.fetch = fetchMock;

      const qck = new QCK({ apiKey: 'qck_test', baseUrl: 'https://api.test.com' });
      const result = await qck.webhooks.listDeliveries('wh1');

      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toContain('/webhooks/wh1/deliveries');
      expect(url).not.toContain('page=');
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('delivered');
      expect(result[0].max_attempts).toBe(5);
    });
  });

  describe('domains', () => {
    it('unwraps the { domains, total } payload', async () => {
      const domain = {
        id: 'dom1',
        organizationId: 'org1',
        domain: 'links.example.com',
        status: 'active',
        verificationToken: 'tok',
        dnsVerifiedAt: '2026-06-01T00:00:00Z',
        rejectionReason: null,
        createdAt: '2026-05-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
        sslExpiryAt: null,
        healthStatus: 'healthy',
        npmProxyHostId: 1,
        npmCertificateId: 2,
        sslStatus: 'active',
        provisioningError: null,
      };
      globalThis.fetch = mockFetch({
        status: 200,
        body: apiSuccess({ domains: [domain], total: 1 }),
      });

      const qck = new QCK({ apiKey: 'qck_test', baseUrl: 'https://api.test.com' });
      const result = await qck.domains.list();

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('active');
      expect(result[0].organizationId).toBe('org1');
    });
  });

  describe('query parameters', () => {
    it('appends query params to URL for list operations', async () => {
      const fetchMock = mockFetch({
        status: 200,
        body: apiSuccess([], { page: 2, per_page: 10, total: 0, total_pages: 0 }),
      });
      globalThis.fetch = fetchMock;

      const qck = new QCK({ apiKey: 'qck_test', baseUrl: 'https://api.test.com' });
      await qck.links.list({ page: 2, per_page: 10, search: 'hello' });

      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toContain('page=2');
      expect(url).toContain('per_page=10');
      expect(url).toContain('search=hello');
    });

    it('omits undefined query params', async () => {
      const fetchMock = mockFetch({
        status: 200,
        body: apiSuccess([], { page: 1, per_page: 20, total: 0, total_pages: 0 }),
      });
      globalThis.fetch = fetchMock;

      const qck = new QCK({ apiKey: 'qck_test', baseUrl: 'https://api.test.com' });
      await qck.links.list({ page: 1 });

      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toContain('page=1');
      expect(url).not.toContain('search=');
      expect(url).not.toContain('per_page=');
    });
  });

  describe('request body', () => {
    it('sends JSON body with Content-Type header for POST', async () => {
      const fetchMock = mockFetch({
        status: 200,
        body: apiSuccess({ id: 'link_new', short_code: 'xyz' }),
      });
      globalThis.fetch = fetchMock;

      const qck = new QCK({ apiKey: 'qck_test', baseUrl: 'https://api.test.com' });
      await qck.links.create({ url: 'https://example.com', title: 'Test' });

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(init.body as string)).toEqual({
        url: 'https://example.com',
        title: 'Test',
      });
    });
  });

  describe('journey resource', () => {
    it('exposes journey namespace on client', () => {
      const qck = new QCK({ apiKey: 'qck_test' });
      expect(qck.journey).toBeDefined();
      expect(qck.journey).toBeInstanceOf(JourneyResource);
    });

    it('ingests journey events via POST with an idempotency key', async () => {
      const fetchMock = mockFetch({
        status: 202,
        body: apiSuccess({ accepted: 1 }, { status: 202 }),
      });
      globalThis.fetch = fetchMock;

      const qck = new QCK({ apiKey: 'qck_test', baseUrl: 'https://api.test.com' });
      await qck.journey.ingest({
        events: [
          {
            link_id: 'link_1',
            visitor_id: 'v_1',
            session_id: 's_1',
            event_type: 'page_view',
            page_url: 'https://example.com/landing',
          },
        ],
      });

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/journey/events');
      expect(init.method).toBe('POST');
      const headers = init.headers as Record<string, string>;
      expect(headers['X-Idempotency-Key']).toBeDefined();
      const body = JSON.parse(init.body as string);
      expect(body.events).toHaveLength(1);
      expect(body.events[0].event_type).toBe('page_view');
    });

    it('fetches journey summary for a link', async () => {
      const summaryData = {
        total_visitors: 150,
        total_sessions: 200,
        total_events: 1000,
        avg_session_duration_seconds: 45,
        top_pages: [{ url: 'https://example.com', count: 80 }],
        top_events: [{ name: 'page_view', count: 500 }],
      };

      globalThis.fetch = mockFetch({
        status: 200,
        body: apiSuccess(summaryData),
      });

      const qck = new QCK({ apiKey: 'qck_test', baseUrl: 'https://api.test.com' });
      const result = await qck.journey.getSummary('link_1', { period: '30d' });

      expect(result.total_visitors).toBe(150);
      expect(result.top_pages).toHaveLength(1);
    });

    it('fetches funnel analysis with steps joined as comma-separated string', async () => {
      const funnelData = {
        steps: [
          { step_name: 'page_view', visitors: 100, conversion_rate: 1.0 },
          { step_name: 'scroll_depth', visitors: 60, conversion_rate: 0.6 },
        ],
        total_visitors: 100,
      };

      const fetchMock = mockFetch({
        status: 200,
        body: apiSuccess(funnelData),
      });
      globalThis.fetch = fetchMock;

      const qck = new QCK({ apiKey: 'qck_test', baseUrl: 'https://api.test.com' });
      await qck.journey.getFunnel('link_1', {
        steps: ['page_view', 'scroll_depth'],
        period: '7d',
      });

      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toContain('/journey/links/link_1/funnel');
      expect(url).toContain('steps=page_view%2Cscroll_depth');
      expect(url).toContain('period=7d');
    });

    it('lists sessions for a link using the sessions key', async () => {
      const sessionsData = {
        sessions: [
          {
            visitor_id: 'v_1',
            session_id: 's_1',
            session_start: '2026-01-01T00:00:00Z',
            session_end: '2026-01-01T00:05:00Z',
            event_count: 5,
            pages_visited: ['https://example.com/a', 'https://example.com/b'],
            events: [],
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      };

      globalThis.fetch = mockFetch({
        status: 200,
        body: apiSuccess(sessionsData),
      });

      const qck = new QCK({ apiKey: 'qck_test', baseUrl: 'https://api.test.com' });
      const result = await qck.journey.listSessions('link_1', { page: 1, limit: 20 });

      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].visitor_id).toBe('v_1');
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('lists events for a link using the events key', async () => {
      const eventsData = {
        events: [
          {
            link_id: 'link_1',
            visitor_id: 'v_1',
            session_id: 's_1',
            event_type: 'page_view',
            page_url: 'https://example.com',
          },
        ],
        total: 1,
        page: 1,
        limit: 50,
      };

      globalThis.fetch = mockFetch({
        status: 200,
        body: apiSuccess(eventsData),
      });

      const qck = new QCK({ apiKey: 'qck_test', baseUrl: 'https://api.test.com' });
      const result = await qck.journey.listEvents('link_1', { event_type: 'page_view' });

      expect(result.events).toHaveLength(1);
      expect(result.events[0].event_type).toBe('page_view');
      expect(result.limit).toBe(50);
    });
  });
});
