---
module: 10
lesson: 6
slug: auditing-aws-resources-for-compliance
title: "Auditing AWS Resources for Compliance"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 10: Monitoring, Compliance, and Governance in the AWS Cloud, lesson: Auditing AWS Resources for Compliance"
concepts:
  - aws-config
  - config-rules
  - automated-remediation
  - aws-audit-manager
  - automated-evidence-collection
  - audit-manager-frameworks
  - cloud-auditing
  - regulatory-compliance
---

# Auditing AWS Resources for Compliance

## Objectives

- Explain what AWS Config and AWS Audit Manager offer and when to use each.

## Notes

### AWS Config: do my resources follow our rules?

- Firms set configuration rules per resource and must audit against them.
- AWS Config records configurations, tracks changes and checks them against your rules.
- It alerts you to noncompliant resources and can fix them automatically.
- It reports pass and fail and keeps watching so settings stay put, as compliance is ongoing.
- Uses: desired-state checks, ongoing security audits, troubleshooting, change management.

### AWS Audit Manager: can I prove it?

- Regulated firms must also prove it, as a financial firm must show it handles money safely.
- Audit Manager is fully managed, audits usage continually and automates evidence collection across teams.
- It tests whether controls (policies, procedures, activities) work, runs stakeholder reviews and builds audit-ready reports.
- Prebuilt frameworks map your resources to standards and regulations.
- Read-only access protects audit integrity, and it supports internal risk assessments.

### Telling them apart

- Only Config evaluates configurations: Audit Manager gathers evidence, [AWS CloudTrail](04-aws-cloudtrail.md) records API calls, and [AWS Artifact](05-compliance.md) serves AWS's own audit reports.

## Visuals

- Audit Manager image: automation gathers evidence so two audit teams finish easily.

## Key takeaways

- Config checks configurations against your rules and can auto-fix.
- Audit Manager automates evidence and offers prebuilt frameworks.
- Configuration guidelines point to Config, even when cost is mentioned.

## Scenarios

- Developers must use only an approved, low-cost list of EC2 types: AWS Config.
- A healthcare firm must show patient data is safe: Audit Manager.

## Terms

- **AWS Config**: evaluates resource configurations against rules.
- **Config rule**: a standard Config checks resources against.
- **Automated remediation**: fixes that restore compliance.
- **AWS Audit Manager**: automates audit evidence collection.
- **Control**: a policy, procedure or activity an audit tests.
- **Framework**: prebuilt mapping of resources to a standard.
