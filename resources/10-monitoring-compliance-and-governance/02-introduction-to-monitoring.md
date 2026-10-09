---
module: 10
lesson: 2
slug: introduction-to-monitoring
title: "Introduction to Monitoring"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 10: Monitoring, Compliance, and Governance in the AWS Cloud, lesson: Introduction to Monitoring"
concepts:
  - cloud-monitoring
  - monitoring-metrics
  - monitoring-alerts
  - amazon-ec2-auto-scaling
---

# Introduction to Monitoring

## Objectives

- Define cloud monitoring and what it gains you.

## Notes

### Definition

- Monitoring constantly gathers, charts and tracks how healthy and fast your AWS infrastructure, services and apps run.
- Its goal is peak performance and early warning of problems.
- The loop: watch, gather metrics, judge them over time, then act.

### Coffee shop metrics

- The owner cannot watch all day, so wants a report (coffees sold, average wait, stock-outs) and an alert when waits run long.

### Why the cloud needs it

- AWS services scale on their own, so you must keep checking they behave.
- AWS tools measure performance, warn when something is off, and help debug and troubleshoot.
- With observability, it underpins reliability, availability, performance and security.
- It uses live tools, dashboards, and log gathering and analysis.

## Visuals

- Benefits image: a locked badge, a geared clock for saved time, and a cloud with sliders.

## Key takeaways

- Monitoring means collecting metrics, judging them and acting.
- Dynamic scaling makes it essential on AWS.
- It can trigger automatic actions or alert people.

## Scenarios

- An overloaded EC2 instance: EC2 Auto Scaling launches another.
- An error spike in an app: staff get notified.

## Terms

- **Monitoring**: ongoing tracking of resource health and performance.
- **Metric**: a value tracked over time for a resource or process, such as EC2 CPU use or coffees sold.
