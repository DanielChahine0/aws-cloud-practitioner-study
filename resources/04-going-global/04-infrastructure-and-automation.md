---
module: 4
lesson: 4
slug: infrastructure-and-automation
title: "Infrastructure and Automation"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 4: Going Global, lesson: Infrastructure and Automation"
concepts:
  - infrastructure-as-code
  - aws-cloudformation
  - cloudformation-templates
  - aws-apis
  - programmatic-access
  - aws-cli
  - aws-sdk
  - aws-management-console
---

# Infrastructure and Automation

## Objectives

- Explain what CloudFormation does and why teams use it.
- Match programmatic access, the console and IaC to their use cases.

## Notes

### Why automate

- Rebuilding a Region's resources elsewhere by hand is slow, risky and hard to repeat.
- Infrastructure as code (IaC) stores the architecture as a source-controlled blueprint that tools rebuild anywhere, identically and easily.

### AWS CloudFormation

- CloudFormation models and sets up AWS resources from code, freeing time for apps.
- Its templates are text files declaring what to build, not how, and it provisions and configures it all through AWS APIs.
- One template across accounts or Regions gives identical environments from one command, with fewer errors and more resilience.
- It handles simple to complex multi-tier apps with intricate dependencies and, once learned, speeds deployment.
- It is not a click-by-click visual tool, a content cache (edge locations do that) or a cost optimizer.

### Four ways to call AWS APIs

| Approach | Suits | Typical use |
|---|---|---|
| AWS CLI | Coders | Many services from one command line; scripted routine jobs like Amazon Elastic Block Store (Amazon EBS) backups |
| AWS SDKs | App developers | One app step, like saving user data to Amazon Simple Storage Service (Amazon S3) |
| Console | Cloud newcomers | Search, simple workflows, billing dashboards, graphical services (Amazon QuickSight, Amazon Neptune) |
| IaC | Organization-wide automation | DevOps continuous integration and delivery (CI/CD) pipelines; consistent multi-Region scaling of Amazon EC2 |

- For consistent multi-Region rollouts, the console fits only small one-off jobs, scripts automate partly but get hard to maintain, and mixing methods causes drift.
- IaC is declarative, so teams can version, review and automate deployments.

## Visuals

- **Interacting with AWS resources**: three markers matching each approach to its users and uses.

## Key takeaways

- CloudFormation builds resources from code, cutting errors and keeping environments consistent.
- For consistent multi-Region rollouts, IaC beats the console, scripts or a mix.
- Programmatic access suits developers, the console newcomers, and IaC repeatable work at scale.

## Scenarios

- Copying Region A's setup to Region B -> one CloudFormation template.
- The knowledge check practised picking CloudFormation for a complex EC2, Elastic Load Balancing and Auto Scaling stack.

## Terms

- **CloudFormation template**: A text document declaring the resources to build.
- **Declarative**: Stating what should exist, not how to build it.
- **Programmatic access**: Using AWS through code, with the AWS CLI or SDKs.
