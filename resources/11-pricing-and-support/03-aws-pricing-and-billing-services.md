---
module: 11
lesson: 3
slug: aws-pricing-and-billing-services
title: "AWS Pricing and Billing Services"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 11: Pricing and Support, lesson: AWS Pricing and Billing Services"
concepts:
  - consolidated-billing
  - aws-organizations
  - aws-billing-and-cost-management-dashboard
  - aws-budgets
  - aws-cost-explorer
  - cost-allocation-tags
  - aws-pricing-calculator
---

# AWS Pricing and Billing Services

## Objectives

- Explain what AWS Organizations, the billing dashboard, AWS Budgets and AWS Cost Explorer are for.
- Explain what the AWS Pricing Calculator is for.

## Notes

### Single or consolidated billing

- A standalone account gets its own monthly bill.
- With consolidated billing, subaccounts (by team, project, department or any split) link to a primary account that alone receives the bill and sees all spend.
- AWS Organizations sets this up, adding central management, discounts and stronger security.

### Telling the tools apart

| Tool | Gives you | Use it for |
|---|---|---|
| AWS Organizations | Creating, grouping and governing accounts, account-level security policies, one payment method | One bill and shared policies across accounts |
| Billing and Cost Management dashboard | Monthly forecast, top services by cost, charges, usage, reports, invoices, payment methods | A first look at spend, or paying |
| AWS Budgets | Custom budgets by service, cost category or tag, including Savings Plans and Reserved Instance utilization or coverage | Warnings near or past a limit |
| AWS Cost Explorer | Charts of cost and usage over time by service, linked account or tag, with trends and Reserved Instance advice | Seeing what drives spend |
| AWS Pricing Calculator | An itemized estimate from the instance types, storage and transfer volumes you enter | Pricing or comparing designs before deploying |

- AWS Billing Dashboard (the video) and AWS Billing and Cost Management dashboard (the course text) name the same tool.
- The dashboard links to budget and consolidated billing features, but AWS Organizations groups the accounts.
- Budgets and Cost Explorer both forecast, but only Budgets sends threshold alerts.

### Tags

- Tags are resource metadata that let one search find related resources, such as all development ones.
- Cost Explorer can allocate costs by tags such as project, department or environment, showing who drives spend.

## Key takeaways

- AWS Organizations, not the billing dashboard, consolidates billing.
- The dashboard is the first stop for charges and payments.
- Only AWS Budgets alerts on thresholds.
- Cost Explorer analyzes and forecasts spend, including by tag.
- The Pricing Calculator estimates costs before deployment.

## Scenarios

- A monthly cost limit needing notifications: AWS Budgets.
- Finding which project drives cost: tag-based allocation in Cost Explorer.

## Terms

- **Consolidated billing**: One bill for linked accounts, sent to the primary account.
- **AWS Organizations**: Central multi-account management and billing.
- **AWS Billing and Cost Management dashboard**: The central billing view.
- **AWS Budgets**: Custom budgets with threshold alerts.
- **AWS Cost Explorer**: Cost and usage analysis and forecasts.
- **Tags**: Metadata labels that group resources.
- **Tag-based cost allocation**: Grouping costs by tag.
- **AWS Pricing Calculator**: A web tool for cost estimates.
