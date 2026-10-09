---
id: mission-01
title: "Host this site on S3 and CloudFront"
modules: [4, 5, 6]
services: [Amazon S3, Amazon CloudFront, AWS CloudFormation]
expectedCredits: "cents per month at most"
keep: true
canUseCredits: [S3 storage and requests, CloudFront requests and data transfer out]
leftovers: []
sources:
  - { url: "https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html", verified_on: "2026-10-09" }
  - { url: "https://docs.aws.amazon.com/cli/latest/reference/cloudformation/deploy.html", verified_on: "2026-10-09" }
  - { url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html", verified_on: "2026-10-09" }
  - { url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/troubleshoot-403-errors.html", verified_on: "2026-10-09" }
  - { url: "https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sign-in.html", verified_on: "2026-10-09" }
  - { url: "https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html", verified_on: "2026-10-09" }
---

## Goal

Serve this study site from a private S3 bucket that only CloudFront can read, so you can read every note on your phone.

## Before you start

- Mission 0 is done and its Verify holds.
- Your plan status record says the free plan offers Amazon S3, Amazon CloudFront and AWS CloudFormation; if any of them is missing or unknown, stop here and keep using `pnpm preview` on the Mac.
- Your terminal is signed in with `aws login --profile ccp-admin`.
- The repo has no uncommitted changes and `pnpm verify` passes, because the deploy command refuses to run otherwise.

## Steps

### Create the hosting stack

```bash
aws cloudformation deploy --template-file infra/site.yaml --stack-name ccp-study-site --profile ccp-admin
```

- The stack creates a private bucket with all four Block Public Access settings on, a CloudFront distribution that reads the bucket through origin access control (OAC), and a response headers policy with the site's Content-Security-Policy.
- With OAC, CloudFront signs every request it sends to the bucket, and the bucket policy lets the CloudFront service read objects only on behalf of this distribution.
- The command creates a change set, runs it, and returns once CloudFormation has run it.
- Running it again later updates the same stack, and with an unchanged template it reports no changes and still exits with success.

### Upload the site

```bash
pnpm site:deploy
```

- The command runs `pnpm verify`, uploads the build to the bucket, invalidates the entry files, removes chunks that no recent build uses, and prints the site URL.

## Verify

- Open the printed `SiteUrl` on your phone and check that Home lists the 13 modules.
- Check that the bucket refuses a direct read: the commands below print `403` and then `AccessDenied`.

```bash
BUCKET=$(aws cloudformation describe-stacks --stack-name ccp-study-site --profile ccp-admin --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text)
REGION=$(aws configure get region --profile ccp-admin)
curl -s -o /dev/null -w '%{http_code}\n' "https://$BUCKET.s3.$REGION.amazonaws.com/index.html"
curl -s "https://$BUCKET.s3.$REGION.amazonaws.com/index.html" | grep -o AccessDenied
```

- If the direct S3 address returns the page instead, stop and check the bucket's Block Public Access settings and bucket policy before you go on.

## Keep it running

- The bucket and the distribution carry the tag `ccp:keep=site`, so a Tag Editor search for that tag across all Regions lists both, and the cleanup of later missions leaves them alone.
- The next day, open Cost Explorer with daily costs grouped by service, and check that Amazon S3 and Amazon CloudFront stay within a few cents.
- Run `pnpm site:deploy` again whenever you want to publish a new build.
- This mission has no cleanup step and no time limit, because the site stays up.
- The site lives only as long as the account: the free plan ends after 6 months or when the credits run out, and the account then closes.
