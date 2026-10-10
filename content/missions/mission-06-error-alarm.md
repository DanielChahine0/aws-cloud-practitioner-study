---
id: mission-06
title: "A CloudWatch alarm that emails on Lambda errors"
modules: [10]
services: ["Amazon CloudWatch", "Amazon SNS", "AWS Lambda", "Amazon CloudWatch Logs"]
expectedCredits: "about $0"
keep: false
maxLiveHours: 2
canUseCredits: ["the alarm beyond the free alarms", "SNS email deliveries beyond the free usage", "Lambda invocations", "log storage"]
leftovers: ["/aws/lambda/<function> log group", "execution role and its policy", "the SNS email subscription"]
sources:
  - { url: "https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ConsoleAlarms.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarms-and-missing-data.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-view.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/sns/latest/dg/sns-getting-started.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/sns/latest/dg/sns-create-topic.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/sns/latest/dg/sns-email-notifications.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/sns/latest/dg/sns-delete-subscription-topic.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/lambda/latest/dg/testing-functions.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/lambda/latest/dg/getting-started.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/lambda/latest/dg/configuration-tags.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/cli/latest/reference/logs/tag-resource.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/cli/latest/reference/iam/tag-role.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/cli/latest/reference/iam/list-attached-role-policies.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/cli/latest/reference/iam/tag-policy.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sign-in.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/tag-editor/latest/userguide/find-resources-to-tag.html", verified_on: "2026-10-10" }
  - { url: "https://aws.amazon.com/cloudwatch/pricing/", verified_on: "2026-10-10" }
  - { url: "https://aws.amazon.com/sns/pricing/", verified_on: "2026-10-10" }
  - { url: "https://aws.amazon.com/free/", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/artifact/latest/ug/managing-agreements.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/singlesignon/latest/userguide/enable-identity-center.html", verified_on: "2026-10-10" }
---

## Goal

Watch one Lambda error travel all the way to your inbox.
A throwaway function fails when you ask it to, one CloudWatch alarm watches its `Errors` metric, and one SNS topic emails you when that alarm fires.

## Before you start

- Mission 0 is done and its Verify holds.
- Your Plan status form says the free plan offers Amazon CloudWatch, Amazon SNS, AWS Lambda and Amazon CloudWatch Logs; if any of them is unticked, stop here.
- Sign in to the console as `ccp-admin`, never as the root user.
- Set the console's Region selector to the home Region you picked in Mission 0.
- Your terminal is signed in with `aws login --profile ccp-admin`, and every CLI command below passes `--profile ccp-admin`, so it runs in that same home Region.
- Tag every resource that takes tags with the key `ccp:mission` and the value `mission-06`, written in this mission as `ccp:mission=mission-06`.
- What can use credits: the alarm beyond the free alarms, SNS requests and email deliveries, the Lambda invocations and the log storage.
- The free tier on the CloudWatch pricing page covers 10 alarm metrics, and only standard-resolution alarms count toward it.
- Write down the time you begin; that is Start, and the Cleanup must be done within 2 hours of Start.

## Steps

### Create the function

- In the Lambda console, choose **Create function**, then **Author from scratch**, and name it `ccp-m06-fail`.
- Pick the **Python 3.14** runtime and leave the permissions on the default, so Lambda makes a new execution role whose policy only lets the function write logs.
- Expand **Advanced settings**, select **Enable tags**, add the tag `ccp:mission=mission-06`, and choose **Create function**.
- On the **Code** tab, replace the starter code with the handler below and choose **Deploy**.

```text
def lambda_handler(event, context):
    if event.get("fail"):
        raise RuntimeError("mission-06 forced error")
    return {"ok": True}
```

- The handler returns normally unless the event carries `"fail": true`, and then it throws, which Lambda counts as one function error in the `Errors` metric.

### Create the topic and confirm the email

- In the SNS console, choose **Topics**, then **Create topic**.
- Choose the **Standard** type, because email endpoints can subscribe only to standard topics, and name it `ccp-m06-alarm`; neither the type nor the name can change later.
- Under **Tags**, add `ccp:mission=mission-06`, create the topic, and copy its ARN.
- Choose **Subscriptions**, then **Create subscription**, pick the topic's ARN, choose the **Email** protocol, enter your own address as the endpoint, and create it.
- Open the email that arrives from AWS Notifications and choose **Confirm subscription**, and the subscription then reads **Confirmed** in the console.
- Confirm it right away, because a pending subscription cannot be deleted by hand and SNS only removes it after 48 hours.

### Create the alarm

- Paste the topic ARN into the first line below, then run the commands.

```bash
TOPIC_ARN="paste-the-topic-arn-here"
aws cloudwatch put-metric-alarm --profile ccp-admin \
  --alarm-name ccp-m06-errors \
  --namespace AWS/Lambda --metric-name Errors \
  --dimensions Name=FunctionName,Value=ccp-m06-fail \
  --statistic Sum --period 60 \
  --evaluation-periods 1 --datapoints-to-alarm 1 \
  --threshold 1 --comparison-operator GreaterThanOrEqualToThreshold \
  --treat-missing-data notBreaching \
  --alarm-actions "$TOPIC_ARN" \
  --tags Key=ccp:mission,Value=mission-06
```

- The alarm adds up the function's errors in each 1-minute period and goes to `ALARM` when a single period holds 1 error or more.
- A 60-second period keeps it a standard-resolution alarm, while 10, 20 or 30 seconds would turn it into a high-resolution alarm with a higher charge.
- Lambda sends metrics when an invocation finishes, so treating the empty minutes between runs as not breaching keeps the alarm in `OK`, where the default would leave it in `INSUFFICIENT_DATA`.

### Force an error

- In the Lambda console, open `ccp-m06-fail` and choose the **Test** tab.
- Create a new event named `fail`, keep **Private** under the event sharing settings, set its JSON to the line below, save it, and choose **Test**.

```json
{ "fail": true }
```

- The console invokes the function synchronously, and you expand **Details** under **Execution result** to review the run.
- Keep the event private, because Lambda stores shareable test events in an EventBridge schema registry that stays behind when the function is deleted.

### Tag the log group, the role and its policy

- After that first run, tag the log group `/aws/lambda/ccp-m06-fail` and the execution role, which the console named `ccp-m06-fail-role-` plus a random suffix.

```bash
ACCOUNT=$(aws sts get-caller-identity --profile ccp-admin --query Account --output text)
REGION=$(aws configure get region --profile ccp-admin)
aws logs tag-resource --profile ccp-admin \
  --resource-arn "arn:aws:logs:$REGION:$ACCOUNT:log-group:/aws/lambda/ccp-m06-fail" \
  --tags ccp:mission=mission-06
ROLE=$(aws iam list-roles --profile ccp-admin --query "Roles[?starts_with(RoleName, 'ccp-m06-fail-role-')].RoleName" --output text)
echo "$ROLE"
aws iam tag-role --profile ccp-admin --role-name "$ROLE" --tags Key=ccp:mission,Value=mission-06
aws iam list-attached-role-policies --profile ccp-admin --role-name "$ROLE" --query "AttachedPolicies[].PolicyArn" --output text
```

- If `echo` prints anything but one role name, skip the last two commands, tag the role on its page in the IAM console, and read the ARN of each of its policies on its **Permissions** tab instead.
- The last command prints the ARN of each managed policy on the role.
- An ARN that starts with `arn:aws:iam::aws:policy/` is AWS managed and takes no tag from you.
- Any other ARN is a customer managed policy, so tag it too with the command below, pasting that ARN in.

```bash
aws iam tag-policy --profile ccp-admin --policy-arn "paste-the-policy-arn-here" --tags Key=ccp:mission,Value=mission-06
```

## Verify

- In the CloudWatch console, open **Alarms**, choose `ccp-m06-errors`, and check that its **History** tab lists a state change to **ALARM** after your test.
- Check your inbox for an email about `ccp-m06-errors` that the topic sent when the alarm changed state.
- Once later minutes pass with no errors, the alarm reads **OK** again with no action from you, because those empty minutes count as not breaching.
- If no email came, check your spam folder and that the subscription reads **Confirmed**.

## Cleanup

- Delete the alarm with `aws cloudwatch delete-alarms --profile ccp-admin --alarm-names ccp-m06-errors`.
- Delete the SNS email subscription: in the SNS console, choose **Subscriptions**, select the confirmed subscription, choose **Delete**, and confirm.
- Delete the topic: choose **Topics**, select `ccp-m06-alarm`, choose **Delete**, and type `delete me` to confirm, since SNS advises removing subscriptions before their topic.
- Delete the function: in the Lambda console, select `ccp-m06-fail`, choose **Actions**, then **Delete**, and type `confirm`.
- Delete the `/aws/lambda/<function> log group`, which here is `/aws/lambda/ccp-m06-fail`: in the CloudWatch console under **Log groups**, select it and choose **Actions**, then **Delete log group(s)**, because it is a separate resource from the function.
- Delete the execution role and its policy: open the role in the IAM console, note the policy on its **Permissions** tab, then delete the role by typing its name, and also delete that policy under **Policies** if it is the customer managed one you tagged, since an AWS managed one such as `AWSLambdaBasicExecutionRole` stays.
- Open Tag Editor, choose all Regions and all resource types, search for the tag key `ccp:mission`, and check that it returns 0 results; delete anything it still lists and search again.

## Usage check

- On the next study day, open Cost Explorer with daily granularity, grouped by Service.
- Compare Amazon CloudWatch, Amazon SNS and AWS Lambda with the day before Start, not with zero, and check that each is back to that day's level.
- Then note the remaining credit balance, which this page records with the usage button.

## Never do

- Never upgrade the account to the Paid plan, and never change the Support plan.
- Never enable IAM Identity Center or create or join an AWS organization, because on a free-plan account creating an organization upgrades it to the Paid plan and the credits expire at once.
- Never create a landing zone in AWS Control Tower, join the AWS Partner Network, sign a Professional Services contract or an Enterprise Agreement, or buy an AWS Skill Builder Team subscription, because each of these upgrades a free-plan account too.
- Never accept an agreement in AWS Artifact, such as the Business Associate Addendum (BAA), because marking the account as HIPAA or SEC compliant also upgrades it.
- Never create access keys, for the root user or for `ccp-admin`, because `aws login` gives the CLI short-term credentials.
- Never create NAT gateways, idle public IPv4 addresses or unattached Elastic IPs.
- Never create RDS or Aurora databases, EKS clusters, Redshift, OpenSearch or SageMaker endpoints.
- Never turn on Shield Advanced or order Direct Connect.
- Never register Route 53 domains or create hosted zones.
- Never buy Reserved Instances or Savings Plans, and never subscribe to Marketplace products.
- Never give the alarm a period of 10, 20 or 30 seconds, because that makes it a high-resolution alarm, which the free alarm allowance leaves out.
- Never create a second alarm, a composite alarm, a dashboard, a second topic or a second subscription, and never subscribe anything but your own email address.
- Never give the alarm any action but the topic, never save a shareable test event, and never invoke the function in a loop or on a schedule.
