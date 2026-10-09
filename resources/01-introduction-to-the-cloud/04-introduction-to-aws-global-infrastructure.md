---
module: 1
lesson: 4
slug: introduction-to-aws-global-infrastructure
title: "Introduction to AWS Global Infrastructure"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 1: Introduction to the Cloud, lesson: Introduction to AWS Global Infrastructure"
concepts:
  - aws-global-infrastructure
  - aws-regions
  - availability-zones
  - high-availability
  - fault-tolerance
  - multi-az-deployment
  - multi-region-architecture
---

# Introduction to AWS Global Infrastructure

## Objectives

- Describe how Regions, Availability Zones and data centers nest.
- Explain what high availability and fault tolerance give a business.

## Notes

### Global reach buys availability

- Beyond going global in minutes, global reach brings high availability.
- Coffee shop version: a mishap closes one branch, but the chain's nearby branches keep serving.
- One giant data center is the opposite, since one outage or disaster stops every application.
- **High availability**: minimal downtime, because a standby takes over when one component fails.
- **Fault tolerance**: going further, the system runs on when several components fail, via resilience in every layer.

### Region, Availability Zone, data center

| Level | Key facts |
|---|---|
| Region | Geographic area near customers (such as Ohio, Dublin, Tokyo, Paris, Sao Paulo), sited partly for availability, with three or more physically separate AZs |
| Availability Zone | Isolated location in one Region (never spanning Regions) with its own power, networking and connectivity, kept apart from other AZs as a disaster could cut off a whole AZ |
| Data center | One or more per AZ, with redundant power, networking and connectivity |

- Nearby users get low-latency, fault-tolerant access to services, and advanced components come later.

### Designing for availability

- Spread resources and replicate data across several AZs so one AZ's outage does not stop applications.
- For disaster protection, businesses often run in several Regions with failover.
- High availability means business resources stay up, which no single storage location or data center ensures.

## Visuals

- Regions and AZs graphic: a Region containing three AZs, one marker per level.

## Key takeaways

- A Region holds three or more AZs, and each AZ is an isolated part of one Region holding one or more data centers.
- High availability limits downtime from one failure, fault tolerance survives several, and both come from spreading resources across AZs and Regions.
- Never rely on one data center, however secure.

## Scenarios

- One coffee chain branch closes, others serve: high availability.
- A Region outage triggers failover to another Region: multi-Region deployment.

## Terms

- **AWS Global Infrastructure**: AWS's Regions, AZs and data centers worldwide.
- **AWS Region**: a geographic area with three or more AZs.
- **Availability Zone (AZ)**: an isolated location in a Region, with one or more data centers.
- **High availability**: minimal downtime via standby components.
- **Fault tolerance**: operating on despite multiple failures.
- **Failover**: switching to another AZ or Region when one fails.
