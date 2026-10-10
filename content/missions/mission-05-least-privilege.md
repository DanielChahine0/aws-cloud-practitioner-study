---
id: mission-05
title: "A least-privilege role, tested and traced"
modules: [9, 10]
services: ["AWS Identity and Access Management", "AWS CloudTrail"]
expectedCredits: "$0"
keep: false
maxLiveHours: 2
canUseCredits: []
leftovers: ["the role", "its customer managed policy"]
sources:
  - { url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_testing-policies.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/policies_policy-simulator-how-to.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-user.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-service.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_tags.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_create-console.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_manage_delete.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_manage-delete-cli.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/cli/latest/reference/iam/create-policy.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/cli/latest/reference/iam/create-role.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/cli/latest/reference/iam/simulate-principal-policy.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/cli/latest/reference/login/index.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events-console.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-concepts.html", verified_on: "2026-10-10" }
  - { url: "https://aws.amazon.com/cloudtrail/pricing/", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/ARG/latest/userguide/supported-resources.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/singlesignon/latest/userguide/enable-identity-center.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/artifact/latest/ug/managing-agreements.html", verified_on: "2026-10-10" }
---

## Goal

Build one role that can do exactly one thing, prove with the IAM policy simulator that it can do that thing and nothing next to it, and then find your own setup calls in CloudTrail.
The role can read objects under one prefix of one bucket, and every other combination in the matrix below must come back denied.

## Before you start

- Mission 0 is done and its Verify holds.
- Your Plan status form says the free plan offers AWS Identity and Access Management and AWS CloudTrail; if either is unticked, stop here.
- Sign in to the console as `ccp-admin`, never as the root user.
- Keep the console in the home Region you chose in Mission 0, except for the Event history step, which says why it switches Region.
- Sign the terminal in with `aws login --profile ccp-admin`, and run every command below with `--profile ccp-admin`.
- Tag every taggable resource with the key `ccp:mission` and the value `mission-05`, written `ccp:mission=mission-05`.
- What can use credits: nothing, because IAM is offered at no extra charge and CloudTrail does not charge for viewing Event history.
- Start the mission on this page before your first command, and finish Cleanup within 2 hours of Start.

## Steps

### Write the two policy documents

```bash
mkdir -p ~/ccp-m05 && cd ~/ccp-m05
ACCOUNT=$(aws sts get-caller-identity --profile ccp-admin --query Account --output text)
cat > trust.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": "arn:aws:iam::${ACCOUNT}:root" },
    "Action": "sts:AssumeRole",
    "Condition": { "Bool": { "aws:MultiFactorAuthPresent": "true" } }
  }]
}
EOF
cat > reader.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::ccp-m05-demo/reports/*"
  }]
}
EOF
```

- The trust policy names only this account as the principal, and only with MFA, so no other account and no AWS service can take the role.
- Naming the account is not enough on its own: an identity in it also needs its own permission to call `sts:AssumeRole` on the role.
- The permissions policy grants one action on one resource ARN, with no `*` in any action.
- Neither bucket in this mission has to exist, because the simulator never sends a request to Amazon S3.

### Create the customer managed policy

```bash
POLICY_ARN=$(aws iam create-policy --profile ccp-admin --policy-name ccp-m05-read-reports \
  --policy-document file://reader.json --tags Key=ccp:mission,Value=mission-05 \
  --query Policy.Arn --output text)
echo "$POLICY_ARN"
```

- A customer managed policy lives in your account and can be attached to roles, users and groups, which is the step from broad AWS managed policies toward least privilege.

### Create the role and attach the policy

```bash
aws iam create-role --profile ccp-admin --role-name ccp-m05-reader \
  --assume-role-policy-document file://trust.json --tags Key=ccp:mission,Value=mission-05
aws iam attach-role-policy --profile ccp-admin --role-name ccp-m05-reader --policy-arn "$POLICY_ARN"
```

- If a tag is malformed, `create-role` fails as a whole and creates nothing.

### Run the allow and deny matrix

| Action | Resource | Expected |
|---|---|---|
| `s3:GetObject` | `arn:aws:s3:::ccp-m05-demo/reports/jan.csv` | allowed |
| `s3:PutObject` | `arn:aws:s3:::ccp-m05-demo/reports/jan.csv` | denied |
| `s3:GetObject` | `arn:aws:s3:::ccp-m05-demo/private/jan.csv` | denied |
| `s3:PutObject` | `arn:aws:s3:::ccp-m05-demo/private/jan.csv` | denied |
| `s3:GetObject` | `arn:aws:s3:::ccp-m05-other/reports/jan.csv` | denied |
| `s3:PutObject` | `arn:aws:s3:::ccp-m05-other/reports/jan.csv` | denied |

- In the IAM console, choose **Policy simulator** in the navigation pane, not the old standalone simulator site, which AWS no longer maintains.
- In Principal mode, pick the role `ccp-m05-reader`, add `s3:GetObject` and `s3:PutObject`, enter the three resource ARNs from the table, and run the simulation.
- Every denied row should read implicitly denied, because nothing allows it and IAM refuses anything that no policy allows.
- Run the same matrix from the terminal as a second witness.

```bash
aws iam simulate-principal-policy --profile ccp-admin \
  --policy-source-arn "arn:aws:iam::${ACCOUNT}:role/ccp-m05-reader" \
  --action-names s3:GetObject s3:PutObject \
  --resource-arns arn:aws:s3:::ccp-m05-demo/reports/jan.csv arn:aws:s3:::ccp-m05-demo/private/jan.csv arn:aws:s3:::ccp-m05-other/reports/jan.csv \
  --query "EvaluationResults[].[EvalActionName, ResourceSpecificResults[].[EvalResourceName, EvalResourceDecision]]"
```

- The command pairs each action with each ARN, and each pair reports `allowed`, `implicitDeny` or `explicitDeny`.

### Find your calls in Event history

- Open the CloudTrail console and switch the Region selector to `US East (N. Virginia)`, because CloudTrail records IAM events in `us-east-1` whatever your home Region is.
- Choose **Event history**, pick the **User name** lookup attribute, enter `ccp-admin`, and set the time range to start just before Start.
- Event history needs no trail: it is on by default and keeps 90 days of management events for each Region.
- It takes one attribute filter at a time, so the user name replaces the default read-only filter.
- Open the `CreateRole` event and scroll to **Event record** to see the JSON that CloudTrail kept.
- If a call is not listed yet, refresh the page a little later.

## Verify

- The console simulator shows `s3:GetObject` on `ccp-m05-demo/reports/jan.csv` as allowed and the other five rows of the matrix as implicitly denied.
- The terminal simulation prints `allowed` for that same pair and `implicitDeny` for the other five, so every row matches the Expected column, including the denied ones.
- Event history in `us-east-1`, filtered by the user name `ccp-admin`, lists `CreatePolicy`, `CreateRole` and `AttachRolePolicy` from this session.

## Cleanup

- Detach its customer managed policy from the role; the first two lines rebuild its ARN, so the commands also work in a new terminal.

```bash
ACCOUNT=$(aws sts get-caller-identity --profile ccp-admin --query Account --output text)
POLICY_ARN="arn:aws:iam::${ACCOUNT}:policy/ccp-m05-read-reports"
aws iam detach-role-policy --profile ccp-admin --role-name ccp-m05-reader --policy-arn "$POLICY_ARN"
```

- Delete its customer managed policy.

```bash
aws iam delete-policy --profile ccp-admin --policy-arn "$POLICY_ARN"
```

- Delete the role.

```bash
aws iam delete-role --profile ccp-admin --role-name ccp-m05-reader
```

- Prove both are gone by name: each command below prints `[]`.

```bash
aws iam list-roles --profile ccp-admin --query "Roles[?RoleName=='ccp-m05-reader']"
aws iam list-policies --profile ccp-admin --scope Local --query "Policies[?PolicyName=='ccp-m05-read-reports']"
```

- Remove the local folder with `rm -r ~/ccp-m05`.
- The by-name check above is the proof for this mission, not Tag Editor.
- The Tag Editor supported resources page lists customer managed policies, found only when `us-east-1` is among the searched Regions, and it lists IAM roles but marks them as not supported for Tag Editor tagging.
- The IAM tagging page goes further and says Tag Editor cannot work with IAM tags, so an empty Tag Editor search says nothing about the role.
- Run the Tag Editor search for the tag key `ccp:mission` in all Regions and all resource types, and check that it returns 0 results.

## Usage check

- On the next study day, open Cost Explorer with daily granularity, grouped by Service, over a range that starts the day before Start.
- Compare the AWS Identity and Access Management and AWS CloudTrail lines with the day before Start, not with zero.
- Neither line may sit above its value on the day before Start; if one does, look for a trail or event data store that someone created and remove it.
- Note the remaining credit balance, and record it with the usage button on this page.

## Never do

- Never upgrade the account to the Paid plan or change its Support plan.
- Never enable IAM Identity Center or create or join an AWS organization, because on a free-plan account creating an organization upgrades it to the Paid plan and the credits expire at once.
- Never create a landing zone in AWS Control Tower or join the AWS Partner Network, because each of these also upgrades a free-plan account to the Paid plan.
- Never accept an agreement in AWS Artifact, such as the Business Associate Addendum (BAA), because designating the account as HIPAA or SEC compliant also upgrades a free-plan account.
- Never sign a Professional Services contract or an Enterprise Agreement with AWS, or buy an AWS Skill Builder Team subscription, on this account, because each of these upgrades it too.
- Never create access keys, for the root user, for `ccp-admin` or for any user who might use this role, because `aws login` gives the CLI temporary credentials that it refreshes on its own.
- Never create a trail or a CloudTrail Lake event data store for this mission, because Event history already holds the calls you need.
- Never put `*` in an action of the role's policy, and never widen its resource beyond the one ARN.
- Never turn on IAM Access Analyzer unused access analysis or custom policy checks, because those are charged.
- Never create NAT gateways, idle public IPv4 addresses or unattached Elastic IPs.
- Never create RDS or Aurora databases, EKS clusters, Redshift, OpenSearch or SageMaker endpoints.
- Never turn on Shield Advanced or order Direct Connect.
- Never register Route 53 domains or create hosted zones.
- Never buy Reserved Instances or Savings Plans, and never subscribe to Marketplace products.
