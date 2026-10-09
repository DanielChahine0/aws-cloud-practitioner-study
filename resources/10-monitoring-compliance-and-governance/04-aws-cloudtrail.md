---
module: 10
lesson: 4
slug: aws-cloudtrail
title: "AWS CloudTrail"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 10: Monitoring, Compliance, and Governance in the AWS Cloud, lesson: AWS CloudTrail"
concepts:
  - aws-cloudtrail
  - cloud-auditing
  - cloudtrail-event-history
  - cloudtrail-logs
  - cloudtrail-insights
  - log-file-integrity-validation
---

# AWS CloudTrail

## Objectives

- Explain why auditing matters and what CloudTrail events, logs and Insights do.

## Notes

### Why auditing is easier on AWS

- On premises, changes can slip by unrecorded, even accidental ones.
- On AWS every action is an API call, so all can be logged centrally.

### What CloudTrail answers

- Who called, when, from which IP, and the result: a new state or a denial.
- Every request counts, from launching EC2 to editing permissions.
- It also tracks activity on premises and with other cloud providers.
- It eases audits, proves compliance, improves security posture and aids troubleshooting.
- Integrity validation exposes tampering, and a separate log account blocks root-level edits.

### Events, logs and Insights

| Feature | What it is |
| --- | --- |
| Events | Single actions (API or console calls); event history shows 90 days of management events per Region, free, searchable, downloadable, unchangeable |
| Logs | The files holding events, sent to S3 or CloudWatch Logs, no 90-day cap, usable as PCI or HIPAA proof |
| Insights | Studies management events for normal API volume and error rates, and flags deviations once enabled on a trail or event data store |

- CloudWatch Logs watches app internals, while CloudTrail records API activity.

## Visuals

- Hero: the who, what and when question CloudTrail exists to answer, across a data center and AWS.
- Feature images: a phone alert, trails into a log, trend charts.

## Key takeaways

- CloudTrail answers who did what, when, where, and with what result.
- Event history is free for 90 days, while S3 logs serve long audits.
- Insights flags unusual API activity.

## Scenarios

- A hybrid financial firm traces changes for fixes and compliance: CloudTrail.
- API activity files kept in S3 for audits: CloudTrail logs, not events or Insights.

## Terms

- **AWS CloudTrail**: audit log of AWS API calls.
- **Event history**: free 90-day view of management events.
- **CloudTrail logs**: event files stored in S3.
- **CloudTrail Insights**: spots abnormal API activity.
- **Log file integrity validation**: reveals tampered logs.
- **PCI**: Payment Card Industry regulations.
