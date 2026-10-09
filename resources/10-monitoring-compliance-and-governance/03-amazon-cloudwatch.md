---
module: 10
lesson: 3
slug: amazon-cloudwatch
title: "Amazon CloudWatch"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 10: Monitoring, Compliance, and Governance in the AWS Cloud, lesson: Amazon CloudWatch"
concepts:
  - amazon-cloudwatch
  - cloudwatch-metrics
  - cloudwatch-alarms
  - cloudwatch-dashboards
  - cloudwatch-logs
  - amazon-sns
---

# Amazon CloudWatch

## Objectives

- Explain what Amazon CloudWatch offers and when to use it.

## Notes

### One place to watch

- Amazon CloudWatch is a single real-time hub for watching AWS resources, the apps on them, and on-premises servers.
- It shows resource usage, app performance and operational health system-wide.

### Four features

| Feature | Job | Coffee shop |
| --- | --- | --- |
| Metrics | Track a value per resource, built in (EC2 CPU) or custom | Espresso Count, since machines need cleaning every 1,000 shots |
| Alarms | Act when a metric crosses a threshold: notify, or change resources | At 1,000, text the manager via Amazon SNS |
| Dashboards | Custom console pages, one view, near real time, self-refreshing | Every machine's count on one screen |
| Logs | Collect, store and monitor log files centrally; view, search, filter | Why did machine two brew decaf last week? |

- Custom alarms work on metrics from any AWS resource type.

### Why teams pick it

- One integrated view replaces siloed monitoring.
- Faster fixes (lower MTTR) and better TCO free developers for business work.
- Pooled data yields insight, such as fleet-wide EC2 usage.
- It also aids visualizing, automating and proactive monitoring; the core use is infrastructure troubleshooting.
- Content delivery, purchase prediction and architecture design are other services' jobs, not CloudWatch's.

## Visuals

- Features graphic: a technician unsure how to watch it all, then one box per feature.

## Key takeaways

- CloudWatch monitors AWS and on-premises resources in real time from one place.
- Metrics measure, alarms react, dashboards display, Logs keeps searchable detail.
- An alarm can notify through SNS or scale EC2 automatically.
- Choose it for performance numbers and thresholds, not for who called an API.

## Scenarios

- Machines due for cleaning: a custom metric plus an alarm.
- A machine brewed decaf: search CloudWatch Logs.
- A retailer's EC2 app stays overloaded: metrics and app logs, an alarm that adds instances, one dashboard.

## Terms

- **Amazon CloudWatch**: real-time monitoring for AWS resources and apps.
- **Metric**: a value tracked over time for a resource or process, such as EC2 CPU use or coffees sold.
- **CloudWatch alarm**: a metric threshold that triggers an action.
- **CloudWatch dashboard**: a self-refreshing console page of metrics.
- **CloudWatch Logs**: central log storage and search.
- **Amazon SNS**: notification service that alarms use to send texts.
- **MTTR**: mean time to resolution.
- **TCO**: total cost of ownership.
