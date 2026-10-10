---
id: mission-04
title: "A DynamoDB loyalty table on demand"
modules: [7]
services: ["Amazon DynamoDB"]
expectedCredits: "about $0"
keep: false
maxLiveHours: 2
canUseCredits: ["on-demand read and write requests", "table storage"]
leftovers: []
sources:
  - { url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GettingStartedDynamoDB.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/getting-started-step-1.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/getting-started-step-2.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/getting-started-step-5.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/getting-started-step-6.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/on-demand-capacity-mode.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/capacity-mode.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/AutoScaling.Console.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Tagging.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Tagging.Operations.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithTables.Basics.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/cli/latest/reference/dynamodb/create-table.html", verified_on: "2026-10-10" }
  - { url: "https://aws.amazon.com/dynamodb/pricing/", verified_on: "2026-10-10" }
  - { url: "https://aws.amazon.com/dynamodb/pricing/on-demand/", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/tag-editor/latest/userguide/find-resources-to-tag.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/cost-management/latest/userguide/ce-modify.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/cost-management/latest/userguide/ce-filtering.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sign-in.html", verified_on: "2026-10-10" }
  - { url: "https://aws.amazon.com/free/", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/singlesignon/latest/userguide/enable-identity-center.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/artifact/latest/ug/managing-agreements.html", verified_on: "2026-10-10" }
---

## Goal

Give the cafe a loyalty table in Amazon DynamoDB that bills per request, store a few members in it, and fetch one member back by its key.
You see a fully managed NoSQL table do its job with no servers and no capacity to plan, then you delete it the same day.

## Before you start

- Mission 0 is done and its Verify holds.
- Your Plan status form says the free plan offers Amazon DynamoDB; if it is unticked, stop here.
- Sign in to the console as `ccp-admin`, never as the root user.
- Work in the home Region you chose in Mission 0, and check the console's Region selector shows it.
- Run every CLI command with `--profile ccp-admin`, after `aws login --profile ccp-admin` if your session has expired.
- Tag every taggable resource `ccp:mission=mission-04`, that is the tag key `ccp:mission` with the value `mission-04`.
- Here the table is the only resource, and DynamoDB copies a table's tags onto any index it has.
- Only on-demand read and write requests and the table's storage can use credits in this mission, and a few tiny items should come to about $0.
- Write down the date and time you begin as Start, and finish Cleanup within 2 hours of Start.

## Steps

### Create the table on demand

- Open the DynamoDB console, choose **Tables**, then **Create table**.
- Name the table `ccp-loyalty` and set the partition key to `MemberId` of type String, with no sort key.
- Under **Table settings**, choose **Customize settings** instead of **Default settings**.
- The docs disagree on what **Default settings** gives you: one page calls on-demand the default throughput option, while the console auto scaling page says a table made with the defaults gets auto scaling, which belongs to provisioned capacity.
- So pick the mode yourself: keep **DynamoDB Standard** as the table class, and under **Read/write capacity settings** choose **On-demand**.
- In the **Tags** section, choose **Add new tag** and enter the key `ccp:mission` with the value `mission-04`.
- Leave deletion protection off and add no indexes, then choose **Create table** and wait until the status reads `ACTIVE`.
- To do the same from the CLI instead, run the command below, where `PAY_PER_REQUEST` is the CLI name for on-demand.

```bash
aws dynamodb create-table \
  --table-name ccp-loyalty \
  --attribute-definitions AttributeName=MemberId,AttributeType=S \
  --key-schema AttributeName=MemberId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --table-class STANDARD \
  --tags Key=ccp:mission,Value=mission-04 \
  --profile ccp-admin
```

### Check the mode and the tag

```bash
aws dynamodb describe-table --table-name ccp-loyalty --profile ccp-admin \
  --query "Table.[TableStatus,BillingModeSummary.BillingMode,ProvisionedThroughput]"
ARN=$(aws dynamodb describe-table --table-name ccp-loyalty --profile ccp-admin --query Table.TableArn --output text)
aws dynamodb list-tags-of-resource --resource-arn "$ARN" --profile ccp-admin
```

- The first command prints `ACTIVE`, `PAY_PER_REQUEST` and read and write capacity units of 0, which is how an on-demand table describes itself.
- The second prints the `ccp:mission` tag with the value `mission-04`.
- If the mode shows `PROVISIONED`, switch it at once with `aws dynamodb update-table --table-name ccp-loyalty --billing-mode PAY_PER_REQUEST --profile ccp-admin`.

### Put a few members

```bash
aws dynamodb put-item --table-name ccp-loyalty --profile ccp-admin \
  --item '{"MemberId": {"S": "m-001"}, "Name": {"S": "Ana"}, "Points": {"N": "120"}}'
aws dynamodb put-item --table-name ccp-loyalty --profile ccp-admin \
  --item '{"MemberId": {"S": "m-002"}, "Name": {"S": "Ben"}, "Points": {"N": "45"}}'
aws dynamodb put-item --table-name ccp-loyalty --profile ccp-admin \
  --item '{"MemberId": {"S": "m-003"}, "Name": {"S": "Chloe"}, "Points": {"N": "310"}}'
```

- In the console you can add the same items from **Explore table items** with **Create item**, adding `Name` as a String and `Points` as a Number.
- Each item stays far below 1 KB, the size one write request unit covers.

### Query one member by key

```bash
aws dynamodb query --table-name ccp-loyalty --profile ccp-admin \
  --key-condition-expression "MemberId = :id" \
  --expression-attribute-values '{":id": {"S": "m-002"}}'
```

- A query needs an exact value for the partition key, and it returns every item that carries that value.
- In the console, open **Explore table items**, keep **Query** selected, enter `m-002` as the partition key and choose **Run**.

## Verify

- The query prints `"Count": 1` and one item whose `MemberId` is `m-002`, with `Name` set to `Ben` and `Points` set to `45`.
- The console query for `m-002` lists that same single item under **Items returned**.
- `describe-table` showed `PAY_PER_REQUEST`, and `list-tags-of-resource` showed `ccp:mission` with the value `mission-04`.

## Cleanup

- This mission has no leftovers in its frontmatter, so start with the table itself.
- Delete the table in the console by ticking `ccp-loyalty` under **Tables** and choosing **Delete**, or run the command below.

```bash
aws dynamodb delete-table --table-name ccp-loyalty --profile ccp-admin
aws dynamodb list-tables --profile ccp-admin
```

- The table passes through `DELETING`, and a deleted table cannot be brought back.
- Run `list-tables` again until `ccp-loyalty` no longer appears in the list of table names it prints.
- Open Tag Editor, select every Region and **All resource types**, search for the tag key `ccp:mission`, and check that it returns 0 results.

## Usage check

- On the next study day, open Cost Explorer, choose **Daily** granularity, group by **Service**, and add a **Charge type** filter set to **Usage** so credits do not hide the usage.
- Cost Explorer counts days in UTC, so find the bar for the day before Start and the latest full day after Cleanup.
- Check that Amazon DynamoDB on that latest day is back to its level from the day before Start, comparing with that day and not with zero.
- Any cost on the day of Start should be a fraction of a cent, because the pricing page bills on-demand requests per million.
- Note the remaining credit balance from the Billing and Cost Management console home, and record it with the usage button on this page.

## Never do

- Never upgrade the account to the Paid plan, and never change the Support plan.
- Never turn on point-in-time recovery or take an on-demand backup, even though the getting-started tutorial suggests point-in-time recovery, because the pricing page charges both by table size.
- Never enable DynamoDB Streams, add a global table replica, create a DAX cluster, or export the table to S3, because each one carries its own charge on the pricing page.
- Never switch the table to provisioned capacity or to the Standard-IA table class, and never turn on deletion protection, because it would block Cleanup.
- Never enable IAM Identity Center or create or join an AWS organization, because on a free-plan account that upgrades it to the Paid plan and the credits expire at once.
- Never set up an AWS Control Tower landing zone or join the AWS Partner Network, because each of these upgrades a free-plan account too.
- Never accept an agreement in AWS Artifact, such as the Business Associate Addendum (BAA), because marking the account as HIPAA or SEC compliant upgrades it as well.
- Never sign a Professional Services contract or an Enterprise Agreement with AWS, or buy an AWS Skill Builder Team subscription, on this account.
- Never create access keys, for the root user or for `ccp-admin`, because `aws login` gives the CLI short-term credentials.
- Never create NAT gateways, idle public IPv4 addresses or unattached Elastic IPs.
- Never create RDS or Aurora databases, EKS clusters, Redshift, OpenSearch or SageMaker endpoints.
- Never turn on Shield Advanced or order Direct Connect.
- Never register Route 53 domains or create hosted zones.
- Never buy Reserved Instances or Savings Plans, and never subscribe to Marketplace products.
