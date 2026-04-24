# cloudfront-md-rewrite

CDK construct that creates a CloudFront Function to rewrite request URIs to `.md` when the client sends `Accept: text/markdown`, for a configurable allowlist of resource paths.

## Install

```sh
npm install @piotrekwitkowski/cloudfront-md-rewrite
```

## Usage

```ts
import { MarkdownRewriteFunction } from '@piotrekwitkowski/cloudfront-md-rewrite';

const mdRewrite = new MarkdownRewriteFunction(this, 'MdRewrite', {
  resources: ['/api/docs', '/api/products'],
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
| No `text/markdown` in Accept | Pass through unchanged |
| Allowlisted path, extensionless | Appends `.md` |
| Allowlisted path, `.json` extension | Strips `.json`, appends `.md` |
| Path not in allowlist | Pass through unchanged |

Only paths you explicitly list in `resources` are rewritten. Unlisted paths are never touched — no risk of 404s from missing `.md` files on the origin.

## API

### `MarkdownRewriteFunctionProps`

| Property | Type | Description |
|---|---|---|
| `resources` | `string[]` | Resource paths that have `.md` versions in the origin (e.g. `['/api/docs']`) |

### `MarkdownRewriteFunction`

Implements `cloudfront.FunctionAssociation`, so instances can be passed directly to `functionAssociations`.

## License

MIT
