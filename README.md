# cloudfront-md-rewrite

CDK construct that creates a CloudFront Function to rewrite request URIs to `.md` when the client sends `Accept: text/markdown`, for a configurable allowlist of resource paths.

## Install

```sh
npm install @piotrekwitkowski/cloudfront-md-rewrite
```

## Usage

```ts
import { MarkdownRewrite } from '@piotrekwitkowski/cloudfront-md-rewrite';

const mdRewrite = new MarkdownRewrite(this, 'MdRewrite', {
  extensions: ['', '.json'],
  resources: ['/api/pricing', '/api/status'],
});

// Attach to a CloudFront behavior
{
  origin,
  functionAssociations: [mdRewrite],
}
```

## How it works

The construct creates a CloudFront Function (cloudfront-js-1.0, ES5) that inspects the `Accept` header on viewer requests:

| Condition | Result |
|---|---|
| Path not in `resources` | Pass through unchanged |
| No `text/markdown` in Accept | Pass through unchanged |
| Extension not in `extensions` | Pass through unchanged |
| Extension in `extensions` | Strips extension, appends `.md` |

## API

### `MarkdownRewrite`

Implements `cloudfront.FunctionAssociation`, so instances can be passed directly to `functionAssociations`.

### `MarkdownRewriteProps`

- `extensions` (`string[]`) — URI extensions to match (e.g. `['', '.json']`). Use `''` for extensionless paths.
- `resources` (`string[]`) — Resource paths that have `.md` versions in the origin (e.g. `['/api/pricing']`).

## License

MIT
