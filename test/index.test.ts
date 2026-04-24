import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { MarkdownRewriteFunction, HANDLER_SOURCE } from '../src';

function buildHandler(resources: string[]): (event: any) => any {
  const code = 'var MD_RESOURCES=' + JSON.stringify(resources) + ';' + HANDLER_SOURCE;
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
      resources: ['/api/docs'],
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::CloudFront::Function', 1);
  });

  test('function code contains the serialized resources array', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    const resources = ['/api/docs', '/api/products'];
    new MarkdownRewriteFunction(stack, 'MdRewrite', { resources });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::CloudFront::Function', {
      FunctionCode: Match.stringLikeRegexp(
        JSON.stringify(resources).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      ),
    });
  });

  test('throws if a resource path does not start with /', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    expect(() => {
      new MarkdownRewriteFunction(stack, 'MdRewrite', {
        resources: ['api/docs'],
      });
    }).toThrow(/must start with "\/"/);
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
  const handler = buildHandler(['/api/docs', '/api/products']);

  test('no Accept header → no rewrite', () => {
    const event = makeEvent('/api/docs');
    const result = handler(event);
    expect(result.uri).toBe('/api/docs');
  });

  test('Accept: text/markdown + allowlisted path → rewrites to .md', () => {
    const event = makeEvent('/api/docs', 'text/markdown');
    const result = handler(event);
    expect(result.uri).toBe('/api/docs.md');
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
    const event = makeEvent('/api/docs', 'application/json');
    const result = handler(event);
    expect(result.uri).toBe('/api/docs');
  });

  test('Accept: text/markdown, application/json → rewrites (markdown present)', () => {
    const event = makeEvent('/api/docs', 'text/markdown, application/json');
    const result = handler(event);
    expect(result.uri).toBe('/api/docs.md');
  });
});
