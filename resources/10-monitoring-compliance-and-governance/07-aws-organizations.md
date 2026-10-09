---
module: 10
lesson: 7
slug: aws-organizations
title: "AWS Organizations"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 10: Monitoring, Compliance, and Governance in the AWS Cloud, lesson: AWS Organizations"
concepts:
  - aws-organizations
  - consolidated-billing
  - organizational-units
  - service-control-policies
  - management-account
  - organization-root
  - member-accounts
---

# AWS Organizations

## Objectives

- Explain what AWS Organizations is good for and when to use it.
- Describe how its key concepts fit together.

## Notes

### The multi-account problem

- One account suits early tests, but growing firms add accounts for production, non-production, developers or infrastructure.
- Each may allow only some services and have its own customizations.
- Managing them by hand fails, so AWS Organizations centralizes it.

### What it gives you

- One place to run billing, access, security and compliance for all accounts, and to share resources between them.
- **Consolidated billing**: child bills roll up to the parent account, where discounts apply.
- **Grouping**: OUs gather accounts by security, compliance or budget needs, such as a developer OU.
- **Limits**: the parent account's admin picks the services and API actions each account gets.
- **Automation**: programmatic account creation, cost control across accounts, tooling for security teams.
- Adopt it early, before stray accounts pile up.

### How the pieces fit

| Piece | What it is | Where it sits |
| --- | --- | --- |
| Root | Top container, made with the organization | Holds all OUs and accounts |
| Management account | Creates and governs the organization | The owner |
| OU | Logical group of accounts | Holds accounts or nested OUs |
| Member account | Any other account | In an OU, or under the root and still billed jointly |
| SCP | Cap on services, resources and API actions for an account's users and roles | On an OU or one member account |

- SCPs never attach to IAM users, groups or roles, even though they limit them.
- Base OUs on each department's business, security and regulatory needs.
- Careful: one assessment explanation calls the root the creating account, but the lesson keeps root (container) and management account (owner) apart.

## Visuals

- Hierarchy graphic: an org chart labeling the root, management account, OU, SCP and a member account outside any OU.

## Key takeaways

- Organizations centrally manages many accounts, including one consolidated bill.
- OUs group accounts and can nest.
- SCPs cap permissions and attach only to OUs or member accounts.

## Scenarios

- Accounts limited to regulation-approved services: one shared OU.
- An account that fits no OU: directly under the root.

## Terms

- **AWS Organizations**: central management for many AWS accounts.
- **Consolidated billing**: one combined bill for all accounts.
- **Organizational unit (OU)**: a logical group of accounts.
- **Service control policy (SCP)**: a permission cap for an OU or member account.
- **Management account**: the owner account that sets up the organization and has final control.
- **Root**: the organization's top container.
- **Member account**: a child account billed through the management account.
