---
module: 9
lesson: 5
slug: detecting-and-responding-to-security-incidents
title: "Detecting and Responding to Security Incidents"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 9: Security, lesson: Detecting and Responding to Security Incidents"
concepts:
  - security-incident-response
  - amazon-inspector
  - amazon-guardduty
  - amazon-detective
  - aws-security-hub
---

# Detecting and Responding to Security Incidents

## Objectives

- Pick the right detection service for a scenario.
- See how the four services fit together.

## Notes

### Find weaknesses: Amazon Inspector

- Prevention can miss unknown software flaws, so detect and react fast.
- Automatically scans EC2, containers and Lambda for vulnerabilities and best-practice gaps, like open EC2 access or vulnerable software.
- Ranks findings by severity, each with a fix, in the console or API.

### Spot threats: Amazon GuardDuty

- Continuously analyzes account metadata and network activity for threats.
- Mixes threat intelligence, like known malicious IP addresses, with anomaly detection and ML for accuracy.
- Lambda can run its fixes automatically.

### Investigate: Amazon Detective

- After detection, it traces the root cause across your accounts.
- It gathers logs itself, then uses ML and graph analytics to chart resource and user activity over a time window you set, plus fixes.

### See it all: AWS Security Hub

- Pulls findings from AWS and partner services into one format and one view of security and compliance.
- Sorts them into actionable groups called insights, and automated remediation shortens time to resolution (TTR).

### Choosing between them

- Security Hub also shows security data, but for posture and compliance, not deep forensics over time.
- GuardDuty detects threats but lacks Detective's interactive investigation views.
- Inspector focuses on vulnerability scanning.

## Key takeaways

- Inspector finds and ranks vulnerabilities.
- GuardDuty continuously detects threats.
- Detective visually traces a threat's root cause.
- Security Hub aggregates findings into one view.

## Scenarios

- Unknown software flaws on EC2: Amazon Inspector.
- Suspicious account or network activity: Amazon GuardDuty.
- Tracing how a threat unfolded: Amazon Detective.
- Findings from many services in one view: AWS Security Hub.

## Terms

- **Amazon Inspector**: Automated vulnerability assessments.
- **Amazon GuardDuty**: Continuous threat detection.
- **Amazon Detective**: Visual root cause investigation.
- **AWS Security Hub**: One view of all findings.
- **Insights**: Security Hub's actionable groups of findings.
- **Time to resolution (TTR)**: What Security Hub's automated remediation can shorten.
