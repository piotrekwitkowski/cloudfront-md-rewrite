import { Construct } from 'constructs';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';

export interface MarkdownRewriteProps {
  readonly resources: string[];
}

export const HANDLER_SOURCE = `
function handler(event) {
  var request = event.request;
  var accept = request.headers.accept ? request.headers.accept.value : "";
  if (accept.indexOf("text/markdown") === -1) return request;
  var bare = request.uri;
  if (bare.endsWith(".json")) bare = bare.substring(0, bare.length - 5);
  for (var i = 0; i < MD_RESOURCES.length; i++) {
    if (bare === MD_RESOURCES[i]) {
      request.uri = bare + ".md";
      return request;
    }
  }
  return request;
}
`;

export class MarkdownRewrite extends Construct implements cloudfront.FunctionAssociation {
  public readonly eventType = cloudfront.FunctionEventType.VIEWER_REQUEST;
  public readonly function: cloudfront.Function;

  constructor(scope: Construct, id: string, props: MarkdownRewriteProps) {
    super(scope, id);

    for (const r of props.resources) {
      if (!r.startsWith('/')) {
        throw new Error(`Resource path must start with "/", got: "${r}"`);
      }
    }

    const code = 'var MD_RESOURCES=' + JSON.stringify(props.resources) + ';' + HANDLER_SOURCE;

    this.function = new cloudfront.Function(this, 'Function', {
      code: cloudfront.FunctionCode.fromInline(code),
      runtime: cloudfront.FunctionRuntime.JS_1_0,
    });
  }
}
