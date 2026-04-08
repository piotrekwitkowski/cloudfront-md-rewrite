# cloudfront-md-rewrite

CDK construct that creates a CloudFront Function to rewrite request URIs to `.md` when the client sends `Accept: text/markdown`, for a configurable allowlist of resource paths.

## Install

```sh
npm install @piotrekwitkowski/cloudfront-md-rewrite
```

## Usage

```ts
import { MarkdownRewriteFunction } from '@piotrekwitkowski/cloudfront-md-rewrite';
import { FunctionEventType } from 'aws-cdk-lib/aws-cloudfront';

const mdRewrite = new MarkdownRewriteFunction(this, 'MdRewrite', {
  resources: ['/api/roadmap-data', '/api/products'],
});

// Attach to a CloudFront behavior
{
  origin,
  functionAssociations: [{
    eventType: FunctionEventType.VIEWER_REQUEST,
    function: mdRewrite.function,
  }],
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
| `resources` | `string[]` | Resource paths that have `.md` versions in the origin (e.g. `['/api/roadmap-data']`) |

### `MarkdownRewriteFunction`

| Property | Type | Description |
|---|---|---|
| `function` | `cloudfront.Function` | The CloudFront Function — attach to a behavior's `functionAssociations` |

## License

MIT
