---
id: mission-03
title: "An S3 upload that logs a receipt through Lambda"
modules: [3, 6, 10]
services: ["Amazon S3", "AWS Lambda", "Amazon CloudWatch Logs"]
expectedCredits: "$0 to a few cents"
keep: false
maxLiveHours: 2
canUseCredits: ["Lambda invocations beyond the free usage", "S3 storage and requests", "log storage"]
leftovers: ["/aws/lambda/<function> log group", "execution role and its policy"]
sources:
  - { url: "https://docs.aws.amazon.com/lambda/latest/dg/with-s3-example.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/lambda/latest/dg/permissions-managed-policies.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/lambda/latest/dg/getting-started.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/lambda/latest/dg/monitoring-cloudwatchlogs.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/lambda/latest/dg/invocation-recursion.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/lambda/latest/dg/configuration-tags.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/view-bucket-properties.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/empty-bucket.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/delete-bucket.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/Working-with-log-groups-and-streams.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/cli/latest/reference/logs/tag-resource.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/cli/latest/reference/logs/put-retention-policy.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/cli/latest/reference/logs/filter-log-events.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/cli/latest/reference/logs/delete-log-group.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_tags_roles.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_manage_delete.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_tags_customer-managed-policies.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/tag-editor/latest/userguide/find-resources-to-tag.html", verified_on: "2026-10-10" }
  - { url: "https://aws.amazon.com/lambda/pricing/", verified_on: "2026-10-10" }
  - { url: "https://aws.amazon.com/s3/pricing/", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/singlesignon/latest/userguide/enable-identity-center.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/artifact/latest/ug/managing-agreements.html", verified_on: "2026-10-10" }
---

## Goal

See event-driven serverless compute work end to end: dropping one file into a new private bucket runs a Lambda function, and the function writes a one-line receipt with the file's key to CloudWatch Logs.
You never start or stop a server, and the only trace the function leaves is that log line.

## Before you start

- Mission 0 is done and its Verify holds, and your Plan status form says the free plan offers Amazon S3, AWS Lambda and Amazon CloudWatch Logs; if one is unticked, stop here.
- Sign in to the console as `ccp-admin`, never as the root user.
- Work in the home Region you picked in Mission 0, in every console page and every command.
- Run every CLI command with `--profile ccp-admin`, after `aws login --profile ccp-admin` if your session has expired.
- Tag every resource that accepts tags with the key `ccp:mission` and the value `mission-03`, written here as `ccp:mission=mission-03`.
- What can use credits: Lambda invocations beyond the monthly free usage of one million requests and 400,000 GB-seconds, S3 storage and requests, and log storage, because Lambda logs carry the standard CloudWatch Logs charges.
- Note the time when you press Start, and finish the Cleanup within 2 hours of it.
- Pick a function name, here `ccp-receipt`, and a globally unique bucket name in lower case, here `ccp-receipts-<your initials>-<today's date>`.

## Steps

### Create the bucket

- In the S3 console, open **General purpose buckets**, choose **Create bucket**, keep the bucket type **General purpose**, and enter your bucket name.
- Leave the other options at their defaults, but check that all four Block Public Access settings are on, turn on any that is off, and create the bucket.
- Open the bucket, choose the **Properties** tab, and add the tag `ccp:mission=mission-03` in its **Tags** section.
- New buckets have versioning turned off, which keeps the later emptying to one command.

### Create the function with the default role

- In the Lambda console, choose **Create function**, then **Author from scratch**, name it `ccp-receipt`, and choose a current Python runtime such as Python 3.14.
- Leave the execution role at its default, so the console creates a new role that can only write logs to CloudWatch Logs.
- Under **Advanced settings**, select **Enable tags**, add the tag `ccp:mission=mission-03`, and choose **Create function**.
- In the **Code** tab, replace the starter code with the handler below and choose **Deploy**.

```text
import urllib.parse

def lambda_handler(event, context):
    for record in event["Records"]:
        key = urllib.parse.unquote_plus(record["s3"]["object"]["key"])
        print(f"receipt {key}")
```

- The handler only prints; it never calls S3, so it cannot write back to the bucket and start a loop.

### Tag the execution role

- In the IAM console, choose **Roles** and search for `ccp-receipt-role`, because the console names the new role after the function and adds a short random suffix.
- Write down that role name and every policy listed on its **Permissions** tab, because the Cleanup needs both.
- On the role's **Tags** tab, add the tag `ccp:mission=mission-03` and save.
- If that list holds a customer managed policy, open it under **Policies**, choose its **Tags** tab and **Manage tags**, add the same tag, and save.
- Add no other policy to the role: basic logging is all this function needs.

### Add the S3 trigger

- In the function's **Function overview**, choose **Add trigger**, select **S3**, and pick your bucket.
- Keep the event type at **All object create events**.
- Tick the **Recursive invocation** box only after you have checked that the function never writes to this bucket, then choose **Add**.

### Upload one small test object

```bash
echo "one receipt" > receipt-test.txt
aws s3 cp receipt-test.txt s3://YOUR-BUCKET/receipt-test.txt --profile ccp-admin
```

- Upload this one small file and nothing else.

### Tag the log group and shorten its retention

- Lambda sends the function's logs to the log group `/aws/lambda/ccp-receipt`, so do this step after the upload, once that log group is listed in the CloudWatch console.
- Tag it with the CLI, which takes the log group ARN without any trailing `:*`.

```bash
REGION=$(aws configure get region --profile ccp-admin)
ACCOUNT=$(aws sts get-caller-identity --query Account --output text --profile ccp-admin)
aws logs tag-resource --resource-arn "arn:aws:logs:$REGION:$ACCOUNT:log-group:/aws/lambda/ccp-receipt" --tags ccp:mission=mission-03 --profile ccp-admin
```

- Optionally, keep its log events for 1 day instead of the default of never expiring.

```bash
aws logs put-retention-policy --log-group-name /aws/lambda/ccp-receipt --retention-in-days 1 --profile ccp-admin
```

## Verify

- In the CloudWatch console, open the log group `/aws/lambda/ccp-receipt`, choose the newest log stream, and find the line `receipt receipt-test.txt`.
- The line can take 5 to 10 minutes to appear after the upload.
- From the terminal, the command below prints the same line.

```bash
aws logs filter-log-events --log-group-name /aws/lambda/ccp-receipt --filter-pattern receipt --query "events[].message" --output text --profile ccp-admin
```

- The log stream holds exactly one receipt line, which shows the function ran once per upload and did not loop.

## Cleanup

- First remove the trigger: on the function's **Configuration** tab, choose **Triggers**, select the S3 trigger, and choose **Delete**.
- Delete the function: on the Lambda **Functions** page, select `ccp-receipt`, choose **Actions**, then **Delete**, and type `confirm`.
- Delete the `/aws/lambda/<function> log group`, here `/aws/lambda/ccp-receipt`, which also removes every log event in it.

```bash
aws logs delete-log-group --log-group-name /aws/lambda/ccp-receipt --profile ccp-admin
```

- Delete the execution role and its policy: in the IAM console, delete the role you wrote down, which detaches its managed policies but does not delete them.
- Then, under **Policies**, delete any customer managed policy you wrote down for that role, and leave AWS managed policies such as `AWSLambdaBasicExecutionRole` in place.
- Empty the bucket, then delete it.

```bash
aws s3 rm s3://YOUR-BUCKET --recursive --profile ccp-admin
aws s3 rb s3://YOUR-BUCKET --profile ccp-admin
```

- Delete the local `receipt-test.txt` file.
- Open Tag Editor, select every Region in its Regions list, choose **All resource types**, search for the tag key `ccp:mission` in all Regions, and check that the search returns 0 results.

## Usage check

- On the next study day, open Cost Explorer with daily granularity, grouped by Service.
- Compare AWS Lambda, Amazon S3 and CloudWatch for the day of Start with the day before Start, not with zero, because Mission 1 keeps S3 billing every day.
- Each one should be back to that earlier baseline.
- Then note the remaining credit balance, which this page records with the usage button.

## Never do

- Never upgrade to the Paid plan or change the Support plan.
- Never create NAT gateways, idle public IPv4 addresses or unattached Elastic IPs.
- Never create RDS or Aurora databases, EKS clusters, Redshift, OpenSearch or SageMaker endpoints.
- Never turn on Shield Advanced or order Direct Connect.
- Never register Route 53 domains or create hosted zones.
- Never buy Reserved Instances or Savings Plans, and never subscribe to Marketplace products.
- Never create access keys, least of all root access keys.
- Never enable IAM Identity Center or create or join an organization, because on a free-plan account creating an organization moves it to the Paid plan and its credits expire at once.
- Never create a Control Tower landing zone, become an AWS Partner Network member, accept an AWS Artifact agreement such as the BAA, sign a Professional Services contract or Enterprise Agreement, or buy an AWS Skill Builder Team subscription, because each of these upgrades a free-plan account.
- Never let the function write to the bucket that triggers it, never add S3 permissions to its role, and never change its recursive loop detection to **Allow recursive loops**.
- Never turn off Block Public Access on the bucket.
- Never upload more than the one small test object.
