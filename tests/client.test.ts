import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QCK, AuthenticationError, RateLimitError, NotFoundError, ValidationError, QCKError, JourneyResource } from '../src/index.js';

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
    json: () => Promise.resolve(response.body),
  } as unknown as Response);
}

function apiSuccess<T>(data: T) {
  return { success: true, data };
}

function apiError(code: string, message: string) {
  return { success: false, data: null, error: { code, message } };
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
  });

  describe('error mapping', () => {
    it('throws AuthenticationError on 401', async () => {
      globalThis.fetch = mockFetch({
        status: 401,
        body: apiError('UNAUTHORIZED', 'Invalid API key'),
      });

      const qck = new QCK({ apiKey: 'qck_bad', baseUrl: 'https://api.test.com' });
      await expect(qck.links.list()).rejects.toThrow(AuthenticationError);
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

    it('throws QCKError on 500', async () => {
      globalThis.fetch = mockFetch({
        status: 500,
        body: apiError('INTERNAL_ERROR', 'Something broke'),
      });

      const qck = new QCK({ apiKey: 'qck_test', baseUrl: 'https://api.test.com' });
      await expect(qck.links.list()).rejects.toThrow(QCKError);
    });
  });

  describe('rate limiting', () => {
    it('throws RateLimitError on 429 after exhausting retries', async () => {
      globalThis.fetch = mockFetch({
        status: 429,
        body: apiError('RATE_LIMIT', 'Too many requests'),
        headers: { 'Retry-After': '5' },
      });

      const qck = new QCK({
        apiKey: 'qck_test',
        baseUrl: 'https://api.test.com',
        retries: 0,
      });

      await expect(qck.links.list()).rejects.toThrow(RateLimitError);
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
            json: () => Promise.resolve(apiError('RATE_LIMIT', 'Slow down')),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: () =>
            Promise.resolve(apiSuccess({ data: [], total: 0, page: 1, limit: 20 })),
        });
      });

      const qck = new QCK({
        apiKey: 'qck_test',
        baseUrl: 'https://api.test.com',
        retries: 3,
      });

      const result = await qck.links.list();
      expect(callCount).toBe(2);
      expect(result).toBeDefined();
    });

    it('includes retryAfter from Retry-After header', async () => {
      globalThis.fetch = mockFetch({
        status: 429,
        body: apiError('RATE_LIMIT', 'Too many requests'),
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

  describe('response unwrapping', () => {
    it('unwraps successful API responses to return data directly', async () => {
      const linkData = {
        id: 'link_123',
        short_code: 'abc',
        original_url: 'https://example.com',
        short_url: 'https://qck.sh/abc',
        is_active: true,
        click_count: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
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

  describe('query parameters', () => {
    it('appends query params to URL for list operations', async () => {
      const fetchMock = mockFetch({
        status: 200,
        body: apiSuccess({ data: [], total: 0, page: 2, limit: 10 }),
      });
      globalThis.fetch = fetchMock;

      const qck = new QCK({ apiKey: 'qck_test', baseUrl: 'https://api.test.com' });
      await qck.links.list({ page: 2, limit: 10, search: 'hello' });

      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toContain('page=2');
      expect(url).toContain('limit=10');
      expect(url).toContain('search=hello');
    });

    it('omits undefined query params', async () => {
      const fetchMock = mockFetch({
        status: 200,
        body: apiSuccess({ data: [], total: 0, page: 1, limit: 20 }),
      });
      globalThis.fetch = fetchMock;

      const qck = new QCK({ apiKey: 'qck_test', baseUrl: 'https://api.test.com' });
      await qck.links.list({ page: 1 });

      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toContain('page=1');
      expect(url).not.toContain('search=');
      expect(url).not.toContain('limit=');
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

    it('ingests journey events via POST', async () => {
      const fetchMock = mockFetch({ status: 204 });
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

    it('lists sessions for a link', async () => {
      const sessionsData = {
        data: [
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

      expect(result.data).toHaveLength(1);
      expect(result.data[0].visitor_id).toBe('v_1');
    });

    it('lists events for a link', async () => {
      const eventsData = {
        data: [
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
        limit: 20,
      };

      globalThis.fetch = mockFetch({
        status: 200,
        body: apiSuccess(eventsData),
      });

      const qck = new QCK({ apiKey: 'qck_test', baseUrl: 'https://api.test.com' });
      const result = await qck.journey.listEvents('link_1', { event_type: 'page_view' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].event_type).toBe('page_view');
    });
  });
});
