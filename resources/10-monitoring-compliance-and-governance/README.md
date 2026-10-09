---
module: 10
slug: monitoring-compliance-and-governance
title: "Module 10: Monitoring, Compliance, and Governance in the AWS Cloud"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 10: Monitoring, Compliance, and Governance in the AWS Cloud"
lessons: 10
assessment_questions: 11
---

# Module 10: Monitoring, Compliance, and Governance in the AWS Cloud

## What this module covers

This module follows the path that starts with securing AWS resources and moves through monitoring and auditing to compliance and governance.
It introduces Amazon CloudWatch for metrics, alarms, dashboards and logs, and AWS CloudTrail for auditing every API call.
It then covers compliance tools (AWS Artifact, AWS Config, AWS Audit Manager), multi-account governance (AWS Organizations, AWS License Manager, AWS Control Tower, AWS Service Catalog), and finally AWS Health, AWS Trusted Advisor and IAM Access Analyzer.

## Lessons

### Module 10 Introduction

1. **[Introduction to Monitoring, Compliance, and Governance in the AWS Cloud](01-introduction-to-monitoring-compliance-and-governance-in-the-aws-cloud.md)**: the secure, monitor, audit, comply progression.

### Monitoring and Compliance Services

2. **[Introduction to Monitoring](02-introduction-to-monitoring.md)**: what monitoring is and why dynamically scaling resources need it.
3. **[Amazon CloudWatch](03-amazon-cloudwatch.md)**: metrics, alarms, dashboards and logs, told through espresso machines.
4. **[AWS CloudTrail](04-aws-cloudtrail.md)**: auditing every API call with events, logs and Insights.
5. **[Compliance](05-compliance.md)**: what AWS covers for you, AWS Artifact and the Customer Compliance Center.
6. **[Auditing AWS Resources for Compliance](06-auditing-aws-resources-for-compliance.md)**: AWS Config for configuration rules and AWS Audit Manager for evidence.
7. **[AWS Organizations](07-aws-organizations.md)**: consolidated billing, OUs and SCPs across many accounts.
8. **[Governance](08-governance.md)**: Control Tower, Service Catalog and License Manager for governing accounts, resources and licenses.
9. **[AWS Health](09-aws-health.md)**: account-specific health events through the AWS Health Dashboard.
10. **[AWS Trusted Advisor](10-aws-trusted-advisor.md)**: best-practice checks in five categories, plus IAM Access Analyzer.

## Key takeaways

- Work through securing, monitoring, auditing, then compliance and governance.
- CloudWatch watches AWS and on-premises resources with metrics, threshold alarms (SNS notifications or automatic scaling), self-refreshing dashboards and central logs.
- CloudTrail records who made each API call, when, from where and with what result, keeping 90 days of event history for free and longer-term logs in S3.
- AWS Artifact is the no-cost source of AWS audit reports and agreements with AWS.
- Customer stories, key compliance answers and the auditing checklist live in the Customer Compliance Center (the AWS Compliance portal), not in Artifact.
- AWS Config checks resource configurations against your rules, while AWS Audit Manager automates the evidence that proves compliance.
- AWS Organizations consolidates billing and groups accounts into OUs, and SCPs cap permissions for OUs or member accounts, never for IAM users, groups or roles.
- AWS Control Tower governs multi-account setups through a landing zone, Account Factory, controls and a dashboard.
- Service Catalog offers curated self-service resources, and License Manager tracks software licenses, including BYOL.
- AWS Health reports events that affect your resources, Trusted Advisor checks against best practices, and IAM Access Analyzer refines permissions toward least privilege.

## What the assessment focuses on

The assessment has 11 questions, and each bullet says how many include the concept as an option or topic and how many expect it as the answer, then the cue that points to it.

- **Amazon CloudWatch** (in 4, answer in 1): metrics, threshold alarms and automatic EC2 scaling.
- **AWS CloudTrail** (in 5, answer in 1): who changed what and when, across cloud and on premises.
- **AWS Artifact** (in 7, answer in 1): no-cost, on-demand AWS reports and agreements, and nothing else.
- **AWS Trusted Advisor** (in 5, answer in 1): continuous checks and advice on cost, performance, security and resilience.
- **AWS Organizations** (in 4, answer in 1): one rolled-up bill and accounts grouped into OUs.
- **Service control policies** (in 1, answer in 1): the Organizations feature that caps the services, resources and API actions users can reach, distinct from the root, OUs and IAM users.
- **AWS Service Catalog** (in 3, answer in 1): a curated, self-service set of approved resources.
- **AWS License Manager** (in 2, answer in 1): BYOL licenses, usage limits and noncompliance risk.
- **AWS Control Tower** (in 2, answer in 1): the landing zone as the container for everything you regulate.
- **AWS Config** (in 1, answer in 1): configuration guidelines and approved instance lists, with Audit Manager, Artifact and CloudTrail as traps.
- **Customer Compliance Center** (in 1, answer in 1): the assessment's name for the AWS Compliance portal of stories, key compliance answers and the auditing checklist, with Artifact (reports and agreements only) as the trap.
- **AWS Health** (in 1, never the answer): a look-alike for Service Catalog.
- **Earlier-module concepts** (in 4, never the answer): Availability Zones, the AWS Management Console, security groups, VPCs, subnets and IAM users as distractors.

## Summary

The module reads as a chain: secure first, then watch, then record, then prove, then govern.
CloudWatch does the watching with metrics, alarms and dashboards, and CloudTrail keeps the record of every API call.
Proof comes from AWS Artifact for AWS's side and from Config and Audit Manager for yours.
Governance scales through Organizations, Control Tower, Service Catalog and License Manager, while Trusted Advisor keeps reviewing cost, security, performance and more across the whole estate.

## Further reading

- [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/): one service for metrics, alarms, dashboards and logs.
- [AWS CloudTrail](https://aws.amazon.com/cloudtrail/): the API audit trail showing who did what, when and from where.
- [AWS Artifact](https://aws.amazon.com/artifact/): download AWS audit reports and handle agreements with AWS.
- [AWS Config](https://aws.amazon.com/config/): check resource settings against your own rules.
- [AWS Audit Manager](https://aws.amazon.com/audit-manager/): automate the evidence auditors ask for.
- [AWS Organizations](https://aws.amazon.com/organizations/): group accounts, share one bill and cap permissions.
- [AWS Control Tower](https://aws.amazon.com/controltower/): stand up and police a governed multi-account environment.
- [AWS Service Catalog](https://aws.amazon.com/servicecatalog/): a shelf of preapproved resources staff launch themselves.
- [AWS License Manager](https://aws.amazon.com/license-manager/): keep software licenses tracked, within limits and cheaper.
- [AWS Trusted Advisor](https://aws.amazon.com/premiumsupport/technology/trusted-advisor/): best-practice checks with fixes across cost, performance, security and resilience.
- [AWS Health](https://aws.amazon.com/premiumsupport/technology/aws-health/): notices about events and planned changes that touch your resources.
- [AWS Identity and Access Management Access Analyzer](https://aws.amazon.com/iam/access-analyzer/): tighten permissions toward least privilege.
