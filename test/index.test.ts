import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { MarkdownRewriteFunction } from '../src';

function buildHandler(resources: string[]): (event: any) => any {
  const code =
    'var MD_RESOURCES=' +
    JSON.stringify(resources) +
    ';' +
    'function handler(event){' +
    'var request=event.request;' +
    'var accept=request.headers.accept?request.headers.accept.value:"";' +
    'if(accept.indexOf("text/markdown")===-1)return request;' +
    'var bare=request.uri;' +
    'if(bare.endsWith(".json"))bare=bare.substring(0,bare.length-5);' +
    'for(var i=0;i<MD_RESOURCES.length;i++){' +
    'if(bare===MD_RESOURCES[i]){request.uri=bare+".md";return request;}}' +
    'return request;}';
  const fn = new Function(code + '\nreturn handler;');
  return fn();
}

function makeEvent(uri: string, accept?: string) {
  const headers: Record<string, any> = {};
  if (accept !== undefined) {
    headers.accept = { value: accept };
  }
  return { request: { uri, headers } };
}

describe('CDK assertions', () => {
  test('creates a CloudFront Function resource', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    new MarkdownRewriteFunction(stack, 'MdRewrite', {
      resources: ['/api/roadmap-data'],
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::CloudFront::Function', 1);
  });

  test('function code contains the serialized resources array', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    const resources = ['/api/roadmap-data', '/api/products'];
    new MarkdownRewriteFunction(stack, 'MdRewrite', { resources });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::CloudFront::Function', {
      FunctionCode: Match.stringLikeRegexp(
        JSON.stringify(resources).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      ),
    });
  });

  test('empty resources array produces a valid function', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    new MarkdownRewriteFunction(stack, 'MdRewrite', { resources: [] });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::CloudFront::Function', 1);
    template.hasResourceProperties('AWS::CloudFront::Function', {
      FunctionCode: Match.stringLikeRegexp('\\[\\]'),
    });
  });
});

describe('function logic', () => {
  const handler = buildHandler(['/api/roadmap-data', '/api/products']);

  test('no Accept header → no rewrite', () => {
    const event = makeEvent('/api/roadmap-data');
    const result = handler(event);
    expect(result.uri).toBe('/api/roadmap-data');
  });

  test('Accept: text/markdown + allowlisted path → rewrites to .md', () => {
    const event = makeEvent('/api/roadmap-data', 'text/markdown');
    const result = handler(event);
    expect(result.uri).toBe('/api/roadmap-data.md');
  });

  test('Accept: text/markdown + non-allowlisted path → no rewrite', () => {
    const event = makeEvent('/api/other', 'text/markdown');
    const result = handler(event);
    expect(result.uri).toBe('/api/other');
  });

  test('Accept: text/markdown + .json URI + allowlisted → strips .json, appends .md', () => {
    const event = makeEvent('/api/products.json', 'text/markdown');
    const result = handler(event);
    expect(result.uri).toBe('/api/products.md');
  });

  test('Accept: application/json → no rewrite', () => {
    const event = makeEvent('/api/roadmap-data', 'application/json');
    const result = handler(event);
    expect(result.uri).toBe('/api/roadmap-data');
  });

  test('Accept: text/markdown, application/json → rewrites (markdown present)', () => {
    const event = makeEvent('/api/roadmap-data', 'text/markdown, application/json');
    const result = handler(event);
    expect(result.uri).toBe('/api/roadmap-data.md');
  });
});
