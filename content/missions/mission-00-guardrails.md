---
id: mission-00
title: "Guardrails before anything else"
modules: [9, 11]
services: [AWS Identity and Access Management, AWS Budgets, AWS Billing and Cost Management]
expectedCredits: "$0"
gate: true
keep: false
canUseCredits: []
leftovers: []
sources:
  - { url: "https://aws.amazon.com/free/", verified_on: "2026-10-09" }
  - { url: "https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html", verified_on: "2026-10-09" }
  - { url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/enable-virt-mfa-for-root.html", verified_on: "2026-10-09" }
  - { url: "https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/control-access-billing.html", verified_on: "2026-10-09" }
  - { url: "https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/billing-getting-started.html", verified_on: "2026-10-09" }
  - { url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html", verified_on: "2026-10-09" }
  - { url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_enable_virtual.html", verified_on: "2026-10-09" }
  - { url: "https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sign-in.html", verified_on: "2026-10-09" }
  - { url: "https://docs.aws.amazon.com/singlesignon/latest/userguide/enable-identity-center.html", verified_on: "2026-10-09" }
  - { url: "https://docs.aws.amazon.com/singlesignon/latest/userguide/account-instances-identity-center.html", verified_on: "2026-10-09" }
  - { url: "https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-create.html", verified_on: "2026-10-09" }
  - { url: "https://docs.aws.amazon.com/cost-management/latest/userguide/budget-templates.html", verified_on: "2026-10-09" }
  - { url: "https://docs.aws.amazon.com/cost-management/latest/userguide/create-cost-budget.html", verified_on: "2026-10-09" }
  - { url: "https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-create-filters.html", verified_on: "2026-10-09" }
  - { url: "https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-email-recipients.html", verified_on: "2026-10-09" }
  - { url: "https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/tracking-free-tier-usage.html", verified_on: "2026-10-09" }
  - { url: "https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-best-practices.html", verified_on: "2026-10-09" }
  - { url: "https://docs.aws.amazon.com/artifact/latest/ug/managing-agreements.html", verified_on: "2026-10-09" }
---

## Goal

Make the new free-plan account safe before any other mission touches it.
Every sign-in uses MFA, everyday work runs as an admin user instead of the root user, two budgets email you at the first sign of real spend, and you know which services the free plan offers.
Every other mission stays locked until this one is done and its Verify holds.

## Before you start

- Use a new AWS account on the free plan that you created yourself; agents never create accounts or type credentials.
- The free plan gives $100 in credits at sign-up and lets you earn up to $100 more.
- It ends after 6 months or when the credits run out, whichever comes first, and the account then closes.
- The free plan charges nothing unless you upgrade to the Paid plan.
- After this mission, never sign in as the root user again.
- Pick one home Region now and use it for every mission.
- Install AWS CLI version 2.32.0 or later, the first version with the `aws login` command.

## Steps

### Root user MFA

- Sign in as the root user, choose your account name on the right side of the navigation bar, and choose **Security credentials**.
- In the **Multi-Factor Authentication (MFA)** section, choose **Assign MFA device**, name the device, choose **Authenticator app**, and finish the wizard with two consecutive codes from the app.
- Keep a secure backup of the QR code or secret key, because losing the only MFA device locks the root user out until AWS customer service removes it.

### Billing access for IAM users

- Still signed in as the root user, open the **Account** page of the Billing and Cost Management console.
- Under **IAM user and role access to Billing information**, choose **Edit**, select **Activate IAM access**, and choose **Update**.
- Without this setting, IAM users cannot open billing pages such as Budgets, Credits, Billing preferences and Cost Explorer, even with admin permissions, and only the root user can turn it on.

### Admin user with MFA

- In the IAM console, create a user named `ccp-admin` with console access.
- Attach the `AdministratorAccess` and `SignInLocalDevelopmentAccess` managed policies to it.
- Note the account sign-in URL that IAM shows for the new user.
- In the IAM console, choose **Users**, choose `ccp-admin`, open the **Security Credentials** tab, choose **Assign MFA device** under **Multi-factor authentication (MFA)**, and finish the wizard as for the root user.
- Sign out of the root user, and sign in at that URL as `ccp-admin` for everything that follows.
- If the IAM console will not create an IAM user with console access, for example because the account uses the new AWS experience with projects and AWS Settings, stop: do not continue this or any later mission, and never work around it as the root user or with IAM Identity Center.

### CLI sign-in without access keys

- Run `aws login --profile ccp-admin`, enter your home Region when the CLI asks for one, and finish the sign-in as `ccp-admin` in the browser.
- Check it with `aws sts get-caller-identity --profile ccp-admin`, which prints an ARN ending in `user/ccp-admin`.
- The CLI refreshes these short-term credentials for up to 12 hours, and running `aws login --profile ccp-admin` again starts a new session.

### Two budgets with credits excluded

- In the Billing and Cost Management console, choose **Budgets**, then **Create budget**, then **Use a template (simplified)**.
- Create the **Zero spend budget** template with your email as the recipient, so spending beyond the Free Tier limits sends an email.
- Create the **Monthly cost budget** template with a budget amount of $5 and the same recipient.
- In each budget, choose **Custom** under **Template settings**, then under **Budget scope** choose **Add filter** and add a **Charge type** filter that leaves out **Credit**, so each budget tracks the usage that the credits pay for.
- Under **Advanced options** in the same section, choose **Use unblended costs**, because net unblended and net amortized costs subtract the credits again.
- Set the $5 budget's alerts to 50%, 80% and 100% of actual cost and 100% of forecasted cost.
- Open the verification email that AWS Budgets sends and choose its link while signed in to this account, because budget alerts reach only verified recipients.
- If a budget's detail page shows your address as **Pending**, check your spam folder or choose **Resend verification**, because the link expires 12 hours after it is sent.
- One verification covers every budget in this account that uses the same address.
- Wait for no alert email: an actual-cost alert is sent only when a threshold is first reached, and forecast alerts need about 5 weeks of usage data.

### Free Tier usage alerts

- In the Billing console, under **Preferences**, choose **Billing preferences**.
- For **Alert preferences**, choose **Edit**, make sure **Receive AWS Free Tier alerts** is selected, check the email address that receives them, and choose **Update**.
- These emails arrive when a service passes 85 percent of its Free Tier limit.
- On the free plan, AWS also emails you about your credit balance and when the plan nears its end.

### Home Region

- Choose the Region closest to you and use it in the console's Region selector for every mission.
- The `ccp-admin` CLI profile already uses it, because `aws login` asked for it.

### Plan status

- Write down your plan, your credit balance and the date the free plan ends or its days remaining, which the console home page and the Billing and Cost Management console home show.
- For each service a later mission uses, mark on the Plan status form below the steps whether the free plan offers it.
- The AWS Free Tier page marks some services, such as Amazon EC2, Amazon S3 and Amazon DynamoDB, as available on both plans, but it does not list every service.
- Leave a service you cannot confirm unticked, because the form counts an unticked service as not offered until you confirm it.
- A mission that needs a service the plan lacks stays locked.

## Verify

- The Budgets page lists both budgets, and each budget's detail page shows your email as a recipient with the status **Active**, not Pending.
- Each budget's scope has a **Charge type** filter that leaves out **Credit**, and each budget uses unblended costs.
- The root user's security credentials and the `ccp-admin` user's both show an assigned MFA device.
- Signed in as `ccp-admin`, you can open the Budgets page and the Billing preferences page.
- `aws sts get-caller-identity --profile ccp-admin` prints the `ccp-admin` user's ARN, not the root user's.
- The Plan status form below the steps shows the day you saved your plan, credit balance and end date, with a tick for every service the free plan offers.

## Never do

- Never upgrade the account to the Paid plan.
- Never enable IAM Identity Center or create or join an AWS organization, because on a free-plan account joining AWS Organizations upgrades it to the Paid plan and the credits expire at once.
- Never set up an AWS Control Tower landing zone or join the AWS Partner Network, because each of these also upgrades a free-plan account to the Paid plan.
- Never accept an agreement in AWS Artifact, such as the Business Associate Addendum (BAA), because designating the account as HIPAA or SEC compliant also upgrades a free-plan account to the Paid plan.
- Never sign a Professional Services contract or an Enterprise Agreement with AWS, or buy an AWS Skill Builder Team subscription, on this account, because each of these upgrades it too.
- Never create access keys, for the root user or for `ccp-admin`, because `aws login` gives the CLI short-term credentials.
- Never create NAT gateways, idle public IPv4 addresses or unattached Elastic IPs.
- Never create RDS or Aurora databases, EKS clusters, Redshift, OpenSearch or SageMaker endpoints.
- Never turn on Shield Advanced or order Direct Connect.
- Never register Route 53 domains or create hosted zones.
- Never buy Reserved Instances or Savings Plans, and never subscribe to Marketplace products.
