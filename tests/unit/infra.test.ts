import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseDocument } from 'yaml';
import { CSP } from '../../scripts/csp.ts';

const text = readFileSync(fileURLToPath(new URL('../../infra/site.yaml', import.meta.url)), 'utf8');
const doc = parseDocument(text);
const template: unknown = doc.toJS();

/** Walks a dotted path through the parsed template; a numeric segment indexes a list. */
function at(path: string): unknown {
  let node: unknown = template;
  for (const key of path.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return node;
}

/** A Fn::Sub value; the escaped template literals below keep CloudFormation's ${...} placeholders literal. */
const sub = (value: string) => ({ 'Fn::Sub': value });
const KEEP_TAG = [{ Key: 'ccp:keep', Value: 'site' }];

describe('infra/site.yaml', () => {
  it('parses as plain YAML, with long-form intrinsics only', () => {
    expect(doc.errors).toEqual([]);
    expect(doc.warnings).toEqual([]);
    expect(text).not.toMatch(/!(?:Ref|GetAtt|Sub|Join|Select|If|Equals)\b/);
  });

  it('keeps the bucket private, owner-enforced and encrypted', () => {
    expect(at('Resources.SiteBucket.Type')).toBe('AWS::S3::Bucket');
    expect(at('Resources.SiteBucket.Properties.PublicAccessBlockConfiguration')).toEqual({
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true,
    });
    expect(at('Resources.SiteBucket.Properties.OwnershipControls.Rules')).toEqual([
      { ObjectOwnership: 'BucketOwnerEnforced' },
    ]);
    expect(at('Resources.SiteBucket.Properties.BucketEncryption.ServerSideEncryptionConfiguration')).toEqual([
      { ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } },
    ]);
  });

  it('signs every origin request with Origin Access Control', () => {
    expect(at('Resources.OriginAccessControl.Type')).toBe('AWS::CloudFront::OriginAccessControl');
    expect(at('Resources.OriginAccessControl.Properties.OriginAccessControlConfig')).toMatchObject({
      Name: sub(`\${AWS::StackName}-oac`),
      OriginAccessControlOriginType: 's3',
      SigningBehavior: 'always',
      SigningProtocol: 'sigv4',
    });
  });

  it('sends the CSP of scripts/csp.ts and the other security headers', () => {
    const headers = 'Resources.HeadersPolicy.Properties.ResponseHeadersPolicyConfig.SecurityHeadersConfig';
    expect(at(`${headers}.ContentSecurityPolicy`)).toEqual({ ContentSecurityPolicy: CSP, Override: true });
    expect(at(`${headers}.StrictTransportSecurity`)).toEqual({
      AccessControlMaxAgeSec: 63072000,
      IncludeSubdomains: true,
      Override: true,
    });
    expect(at(`${headers}.ContentTypeOptions`)).toEqual({ Override: true });
    expect(at(`${headers}.FrameOptions`)).toEqual({ FrameOption: 'DENY', Override: true });
    expect(at(`${headers}.ReferrerPolicy`)).toEqual({ ReferrerPolicy: 'no-referrer', Override: true });
  });

  it('serves index.html at / over HTTPS only, through the bucket origin and the managed cache policy', () => {
    const config = 'Resources.Distribution.Properties.DistributionConfig';
    expect(at(`${config}.Enabled`)).toBe(true);
    expect(at(`${config}.DefaultRootObject`)).toBe('index.html');
    expect(at(`${config}.HttpVersion`)).toBe('http2and3');
    expect(at(`${config}.IPV6Enabled`)).toBe(true);
    expect(at(`${config}.PriceClass`)).toBe('PriceClass_100');
    expect(at(`${config}.Origins`)).toEqual([
      {
        Id: 'site-bucket',
        DomainName: { 'Fn::GetAtt': ['SiteBucket', 'RegionalDomainName'] },
        OriginAccessControlId: { 'Fn::GetAtt': ['OriginAccessControl', 'Id'] },
        S3OriginConfig: { OriginAccessIdentity: '' },
      },
    ]);
    expect(at(`${config}.DefaultCacheBehavior`)).toEqual({
      TargetOriginId: 'site-bucket',
      ViewerProtocolPolicy: 'redirect-to-https',
      AllowedMethods: ['GET', 'HEAD'],
      CachedMethods: ['GET', 'HEAD'],
      Compress: true,
      CachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6',
      ResponseHeadersPolicyId: { Ref: 'HeadersPolicy' },
    });
  });

  it('lets only this distribution read the bucket', () => {
    expect(at('Resources.SiteBucketPolicy.Properties.Bucket')).toEqual({ Ref: 'SiteBucket' });
    expect(at('Resources.SiteBucketPolicy.Properties.PolicyDocument.Statement')).toEqual([
      {
        Sid: 'AllowCloudFrontRead',
        Effect: 'Allow',
        Principal: { Service: 'cloudfront.amazonaws.com' },
        Action: 's3:GetObject',
        Resource: sub(`\${SiteBucket.Arn}/*`),
        Condition: {
          StringEquals: {
            'AWS:SourceArn': sub(
              `arn:\${AWS::Partition}:cloudfront::\${AWS::AccountId}:distribution/\${Distribution}`,
            ),
          },
        },
      },
    ]);
  });

  it('tags the kept resources and outputs what pnpm site:deploy reads', () => {
    expect(at('Resources.SiteBucket.Properties.Tags')).toEqual(KEEP_TAG);
    expect(at('Resources.Distribution.Properties.Tags')).toEqual(KEEP_TAG);
    expect(at('Outputs.BucketName.Value')).toEqual({ Ref: 'SiteBucket' });
    expect(at('Outputs.DistributionId.Value')).toEqual({ Ref: 'Distribution' });
    expect(at('Outputs.SiteUrl.Value')).toEqual(sub(`https://\${Distribution.DomainName}`));
  });
});
