import { Construct } from 'constructs';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';

export interface MarkdownRewriteProps {
  readonly extensions: string[];
  readonly resources: string[];
}

export const HANDLER_SOURCE = `
function handler(event) {
  var request = event.request;
  var accept = request.headers.accept ? request.headers.accept.value : "";
  if (accept.indexOf("text/markdown") === -1) return request;
  for (var i = 0; i < MD_RESOURCES.length; i++) {
    for (var j = 0; j < MD_EXTENSIONS.length; j++) {
      var suffix = MD_EXTENSIONS[j];
      if (request.uri === MD_RESOURCES[i] + suffix) {
        request.uri = MD_RESOURCES[i] + ".md";
        return request;
      }
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

    for (const ext of props.extensions) {
      if (ext !== '' && !ext.startsWith('.')) {
        throw new Error(`Extension must be "" or start with ".", got: "${ext}"`);
      }
    }

    for (const r of props.resources) {
      if (!r.startsWith('/')) {
        throw new Error(`Resource path must start with "/", got: "${r}"`);
      }
    }

    const code =
      'var MD_EXTENSIONS=' + JSON.stringify(props.extensions) + ';' +
      'var MD_RESOURCES=' + JSON.stringify(props.resources) + ';' +
      HANDLER_SOURCE;

    this.function = new cloudfront.Function(this, 'Function', {
      code: cloudfront.FunctionCode.fromInline(code),
      runtime: cloudfront.FunctionRuntime.JS_1_0,
    });
  }
}
