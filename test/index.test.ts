import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { MarkdownRewrite, HANDLER_SOURCE } from '../src';

function buildHandler(extensions: string[], resources: string[]): (event: any) => any {
  const code =
    'var MD_EXTENSIONS=' + JSON.stringify(extensions) + ';' +
    'var MD_RESOURCES=' + JSON.stringify(resources) + ';' +
    HANDLER_SOURCE;
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
    new MarkdownRewrite(stack, 'MdRewrite', {
      extensions: ['', '.json'],
      resources: ['/api/pricing'],
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::CloudFront::Function', 1);
  });

  test('function code contains the serialized arrays', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    const extensions = ['', '.json'];
    const resources = ['/api/pricing', '/api/status'];
    new MarkdownRewrite(stack, 'MdRewrite', { extensions, resources });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::CloudFront::Function', {
      FunctionCode: Match.stringLikeRegexp(
        JSON.stringify(extensions).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      ),
    });
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
      new MarkdownRewrite(stack, 'MdRewrite', {
        extensions: [''],
        resources: ['api/pricing'],
      });
    }).toThrow(/must start with "\/"/);
  });

  test('throws if an extension is not "" and does not start with "."', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    expect(() => {
      new MarkdownRewrite(stack, 'MdRewrite', {
        extensions: ['json'],
        resources: ['/api/pricing'],
      });
    }).toThrow(/must be "" or start with "\."/);
  });

  test('empty resources array produces a valid function', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    new MarkdownRewrite(stack, 'MdRewrite', { extensions: [''], resources: [] });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::CloudFront::Function', 1);
  });
});

describe('function logic', () => {
  const handler = buildHandler(['', '.json'], ['/api/pricing', '/api/status']);

  test('no Accept header → no rewrite', () => {
    const event = makeEvent('/api/pricing');
    const result = handler(event);
    expect(result.uri).toBe('/api/pricing');
  });

  test('Accept: text/markdown + extensionless path → rewrites to .md', () => {
    const event = makeEvent('/api/pricing', 'text/markdown');
    const result = handler(event);
    expect(result.uri).toBe('/api/pricing.md');
  });

  test('Accept: text/markdown + .json path → rewrites to .md', () => {
    const event = makeEvent('/api/status.json', 'text/markdown');
    const result = handler(event);
    expect(result.uri).toBe('/api/status.md');
  });

  test('Accept: text/markdown + unlisted extension → no rewrite', () => {
    const event = makeEvent('/api/pricing.xml', 'text/markdown');
    const result = handler(event);
    expect(result.uri).toBe('/api/pricing.xml');
  });

  test('Accept: text/markdown + non-listed path → no rewrite', () => {
    const event = makeEvent('/api/other', 'text/markdown');
    const result = handler(event);
    expect(result.uri).toBe('/api/other');
  });

  test('Accept: application/json → no rewrite', () => {
    const event = makeEvent('/api/pricing', 'application/json');
    const result = handler(event);
    expect(result.uri).toBe('/api/pricing');
  });

  test('Accept: text/markdown, application/json → rewrites (markdown present)', () => {
    const event = makeEvent('/api/pricing', 'text/markdown, application/json');
    const result = handler(event);
    expect(result.uri).toBe('/api/pricing.md');
  });
});
