---
module: 10
lesson: 5
slug: compliance
title: "Compliance"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 10: Monitoring, Compliance, and Governance in the AWS Cloud, lesson: Compliance"
concepts:
  - regulatory-compliance
  - aws-artifact
  - aws-artifact-agreements
  - aws-artifact-reports
  - aws-compliance-resources
  - hipaa
  - region-selection
  - shared-responsibility-model
---

# Compliance

## Objectives

- Define compliance and AWS's part in it.
- Describe AWS Artifact and its two types.
- Find AWS compliance resources.

## Notes

### What compliance asks

- It is a security and data-protection bar: your resources and data must satisfy each internal policy, industry standard and regulation that binds you.
- Audits check this against documents, records and inspections.
- Rules follow the workload: GDPR for EU consumer data, HIPAA for US healthcare apps.
- You need tools to gather records and inspect your AWS setup.

### What AWS covers

- You inherit AWS's best-practice data centers, networks, policies, processes and newest security controls.
- AWS meets a long list of assurance programs, checked by outside auditors against thousands of requirements.
- So you focus on your own workloads, helped by automated compliance and on-demand reports.
- Bottom line: the infrastructure "of" the cloud is secure.

### Regions and your data

- Pick a Region in the right country for residency laws, since AWS never copies data across Regions unasked.
- Per the AWS Shared Responsibility Model, you own and control your data.
- Encryption varies by service: use built-in features or build your own, and protection is often one resource setting.

### AWS Artifact

- A free portal that hands you AWS's own audit reports whenever needed and lets you handle certain online agreements.
- **Agreements**: where you read, sign and track your agreements with AWS, for a single account or across AWS Organizations, including HIPAA ones.
- **Reports**: up-to-date outside audits of AWS against worldwide, regional and industry security rules, which you can show your auditors or regulators as proof.
- It saves time, scales and lets you deploy with more confidence.
- It does not group accounts or set SCPs (AWS Organizations) or create users (IAM).

### Where to learn more

- The AWS Compliance portal (the video's AWS Compliance Center, the assessment's Customer Compliance Center) shows compliance-enabling services in one place.
- It holds stories of regulated firms solving compliance, governance and audit problems.
- Its whitepapers cover key compliance questions, a risk and compliance overview, and an auditing security checklist.
- See also AWS Compliance Programs, the AWS Risk and Security whitepaper, and Additional compliance resources.

## Visuals

- AWS Artifact graphic: the service split into Agreements and Reports.

## Key takeaways

- You inherit AWS's compliant infrastructure and handle your own workloads.
- Region choice keeps data where the law wants it.
- AWS Artifact gives no-cost, on-demand reports and agreements.
- Stories, key answers and the audit checklist live in the Customer Compliance Center, not Artifact.

## Scenarios

- Data must stay in its country: a Region there.
- Signing an agreement with AWS: Artifact Agreements.
- A developer needs their regulatory duties: Artifact Reports.

## Terms

- **GDPR**: EU General Data Protection Regulation.
- **HIPAA**: US Health Insurance Portability and Accountability Act of 1996.
- **AWS Artifact**: no-cost portal for AWS compliance reports and agreements.
- **AWS Artifact Agreements**: the part of Artifact for signing and tracking agreements with AWS.
- **AWS Artifact Reports**: third-party audit reports on AWS.
- **Customer Compliance Center**: the AWS Compliance portal of stories, whitepapers and checklists.
