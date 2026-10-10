---
id: mission-08
title: "Estimate and review the cafe plan"
modules: [11, 13]
services: ["AWS Pricing Calculator", "AWS Well-Architected Tool"]
expectedCredits: "$0"
keep: false
maxLiveHours: 2
canUseCredits: []
leftovers: ["the Well-Architected Tool workload"]
sources:
  - { url: "https://docs.aws.amazon.com/pricing-calculator/latest/userguide/what-is-pricing-calculator.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/pricing-calculator/latest/userguide/create-configure-estimate.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/pricing-calculator/latest/userguide/save-share-estimate.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/cost-management/latest/userguide/pricing-calculator.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/wellarchitected/latest/userguide/define-workload.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/wellarchitected/latest/userguide/lenses.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/wellarchitected/latest/userguide/start-workflow-review.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/wellarchitected/latest/userguide/continue-workflow-review.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/wellarchitected/latest/userguide/workloads.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/wellarchitected/latest/userguide/lenses-details.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/wellarchitected/latest/userguide/tagging.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/wellarchitected/latest/userguide/workloads-delete.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/wellarchitected/latest/framework/the-pillars-of-the-framework.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/cli/latest/reference/wellarchitected/list-workloads.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sign-in.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/cli/latest/reference/login/index.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/ARG/latest/userguide/supported-resources.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/tag-editor/latest/userguide/find-resources-to-tag.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/cost-management/latest/userguide/ce-modify.html", verified_on: "2026-10-10" }
  - { url: "https://aws.amazon.com/free/", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/singlesignon/latest/userguide/enable-identity-center.html", verified_on: "2026-10-10" }
  - { url: "https://docs.aws.amazon.com/artifact/latest/ug/managing-agreements.html", verified_on: "2026-10-10" }
---

## Goal

Put a price on the cafe plan you wrote in the capstone, and hold one part of it up against the AWS Well-Architected Framework.
You save a public AWS Pricing Calculator estimate, paste its link into decision 11's Cost note on the Project screen, and answer one pillar's questions about the cafe in the AWS Well-Architected Tool.

## Before you start

- Mission 0 is done and its Verify holds.
- Your Plan status form says the free plan offers AWS Pricing Calculator and the AWS Well-Architected Tool; if either is unticked, stop here.
- The public Pricing Calculator at `https://calculator.aws/` works without an AWS account, so that half of the mission needs no sign-in at all.
- For the Well-Architected Tool, sign in to the console as `ccp-admin`, never as the root user, and keep the console on the home Region you chose in Mission 0.
- Run every CLI command with `--profile ccp-admin`, after `aws login --profile ccp-admin` if your session has expired.
- Tag every taggable resource with the key `ccp:mission` and the value `mission-08`, written as `ccp:mission=mission-08` in this page; here that is only the workload.
- Nothing in this mission can use credits: the public Pricing Calculator is a free tool, and AWS offers the Well-Architected Tool at no charge.
- The free plan charges nothing unless you upgrade to the Paid plan, and it closes the account after 6 months or when the credits run out, whichever comes first.
- Clean up within 2 hours of Start, as with every mission that is not kept.
- Capstone decisions open after the exam, so start this mission then, when you can paste the link into decision 11 straight away.
- Have your capstone decisions 2 to 7 open, because the estimate prices what they chose.

## Steps

### Build the estimate

- Open `https://calculator.aws/` in a private browser window and choose **Create estimate**.
- Add one service for each piece your decisions picked, such as the ordering compute, the receipt and photo storage, the loyalty database and any edge delivery.
- For each service, write a short description, pick the Region your decisions use, and size it from the brief: the 07:00 to 09:00 rush at 10 times the baseline, 2 TB of receipts and photos, and the shops you plan for.
- If your decisions chose a Support plan, add it to the estimate as well, because the calculator can price Support plans next to services.
- Put the services in groups that match your decisions if that makes the summary easier to read.
- Check the monthly total against the brief's cap of $300 a month, and remember the figure leaves out any taxes.
- Write descriptions that hold no account IDs, email addresses, names or keys, because the next step publishes them.

### Save the estimate and paste its link

- On the **My Estimate** page, choose **Share**, accept the public server notice, and copy the public link.
- AWS stores the estimate on its public servers, so anyone with the link can open it.
- Keep the link safe: it is the only way back to the estimate, and a link made today stays valid for one year.
- An edit to the estimate does not change the saved link, so after any change share again and use the new link.
- In this site, open the Project screen, open decision 11, and paste the link into its Cost note with one line on the monthly total, such as `About $180 a month: https://calculator.aws/#/estimate?id=...`.

### Define the cafe workload

- In the console, open the AWS Well-Architected Tool, choose **Workloads**, then **Define workload**.
- Name it `cafe-cloud-plan`, give a short description of the cafe move, and enter yourself as the review owner.
- Choose **Pre-production** as the environment, and under AWS Regions choose your home Region.
- Leave the account IDs, the application, Trusted Advisor and Jira settings empty or off.
- Under **Tags**, add the key `ccp:mission` with the value `mission-08`, because Tag Editor cannot add tags to a workload for you.
- Choose **Next**, skip the profile, and keep the lens list as it is: the AWS Well-Architected Framework Lens is applied to every new workload on its own.
- Choose **Define workload**.

### Answer one pillar

- The framework has six pillars: security, cost optimization, reliability, sustainability, operational excellence and performance efficiency.
- Choose **Start reviewing**, which opens the first question of the review.
- The left pane lists the questions under each pillar, so choose **Cost optimization** there and then its first question, because that pillar matches the estimate you just built.
- For each question in that pillar, tick the best practices your plan follows, choose **None of these** when it follows none, or mark the question as not applying to the cafe.
- Use **Info** for help, and use **Notes** to say which capstone decision backs your answer, with no secrets in it.
- Choose **Save and exit** when that pillar is done; the other pillars can stay unanswered.
- The tool turns your answers into high and medium risk issues, which the **Workloads** list counts for each workload.
- On the workload page, open the AWS Well-Architected Framework lens, choose **Improvement plan**, and filter it to the Cost optimization pillar.
- Copy its high and medium risk items into decision 13 on the Project screen as candidates for your top 3 fixes.

## Verify

- Open the saved link in a private browser window: it starts with `https://calculator.aws/` and shows your estimate and its monthly total.
- On the Project screen, the Cost note of decision 11 holds that link, and the Verify button on this page waits until it finds a `https://calculator.aws/` link there.
- Capstone decisions open after the exam, so this Verify cannot pass before then either.
- The command below prints `cafe-cloud-plan` among your workloads.

```bash
aws wellarchitected list-workloads --profile ccp-admin --query "WorkloadSummaries[].WorkloadName" --output json
```

- The workload's page shows answered questions under the pillar you chose.

## Cleanup

- Delete the Well-Architected Tool workload: in the Well-Architected Tool, choose **Workloads**, select `cafe-cloud-plan`, choose **Delete**, and confirm.
- Deleting a workload removes its answers and any milestones for good, and it cannot be undone, so copy anything you want into decision 13 first.
- Run the command from Verify again and check that `cafe-cloud-plan` is no longer in its output; other workloads may still be listed.
- Keep the estimate link, because it lives in decision 11 and is not an AWS resource in your account.
- Tag Editor does not list Well-Architected Tool workloads, so the command above is the proof that the workload is gone; the sweep below catches anything else left from earlier missions.
- In Tag Editor, select every Region and **All resource types**, search for the tag key `ccp:mission`, and check that the search returns 0 results.

## Usage check

- On the next study day, open Cost Explorer with **Daily** granularity, grouped by **Service**.
- Compare each of this mission's services, AWS Pricing Calculator and AWS Well-Architected Tool, with the day before Start, not with zero, and expect no change for either, since both are free.
- Cost Explorer counts days in UTC, so pick the days around Start with that in mind.
- Note the remaining credit balance from the Billing and Cost Management console home, and record it on this page with the usage button.

## Never do

- Never upgrade the account to the Paid plan, and never change the Support plan; the Support plan line lives only in the estimate.
- Never use the in-console Pricing Calculator in Billing and Cost Management for this mission, because its bill estimates cost $2 each after the first five in a month; the public calculator is enough.
- Never put account IDs, email addresses, passwords or keys in an estimate or in workload notes, because a shared estimate link is public.
- Never turn on Trusted Advisor or Jira sync for the workload, and never share it with another account.
- Never enable IAM Identity Center or create or join an AWS organization: on a free-plan account, creating an organization, which enabling IAM Identity Center does, moves the account to the Paid plan and its credits expire at once, and joining one also upgrades it.
- Never create an AWS Control Tower landing zone or become part of the AWS Partner Network, because either one also moves a free-plan account to the Paid plan.
- Never accept an agreement in AWS Artifact, such as the Business Associate Addendum (BAA), because designating the account as HIPAA or SEC compliant also upgrades a free-plan account to the Paid plan.
- Never sign a Professional Services contract or an Enterprise Agreement with AWS, or buy an AWS Skill Builder Team subscription, on this account, because each of these upgrades it too.
- Never create access keys, for the root user or for `ccp-admin`, because `aws login` hands the CLI temporary credentials that it refreshes on its own.
- Never create NAT gateways, idle public IPv4 addresses or unattached Elastic IPs.
- Never create RDS or Aurora databases, EKS clusters, Redshift, OpenSearch or SageMaker endpoints.
- Never turn on Shield Advanced or order Direct Connect.
- Never register Route 53 domains or create hosted zones.
- Never buy Reserved Instances or Savings Plans, and never subscribe to Marketplace products.
