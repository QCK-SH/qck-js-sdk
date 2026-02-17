# @qcksh/sdk

Official TypeScript SDK for the [QCK](https://qck.sh) URL shortener API.

## Install

```bash
pnpm add @qcksh/sdk
```

## Quick Start

```ts
import { QCK } from '@qcksh/sdk';

const qck = new QCK({ apiKey: 'qck_...' });

// Create a short link
const link = await qck.links.create({ url: 'https://example.com' });
console.log(link.short_url);

// List links
const { data: links } = await qck.links.list({ page: 1, limit: 20 });

// Get analytics
const summary = await qck.analytics.summary({ from: '2024-01-01', to: '2024-12-31' });
```

## Resources

| Resource | Methods |
|----------|---------|
| `qck.links` | `create`, `list`, `get`, `update`, `delete`, `bulkCreate`, `getStats` |
| `qck.analytics` | `summary`, `timeseries` |
| `qck.domains` | `list` |
| `qck.webhooks` | `create`, `list`, `get`, `update`, `delete`, `listDeliveries`, `test` |

## Configuration

```ts
const qck = new QCK({
  apiKey: 'qck_...',                                  // required
  baseUrl: 'https://api.qck.sh/api/v1/developer',    // optional
  timeout: 30000,                                      // optional (ms)
  retries: 3,                                          // optional
});
```

## Error Handling

```ts
import { QCK, AuthenticationError, RateLimitError, NotFoundError, ValidationError } from '@qcksh/sdk';

try {
  await qck.links.get('nonexistent');
} catch (err) {
  if (err instanceof NotFoundError) {
    console.log('Link not found');
  } else if (err instanceof RateLimitError) {
    console.log(`Retry after ${err.retryAfter}s`);
  }
}
```

## License

MIT
