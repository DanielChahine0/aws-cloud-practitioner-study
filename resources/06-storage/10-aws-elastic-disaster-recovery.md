---
module: 6
lesson: 10
slug: aws-elastic-disaster-recovery
title: "AWS Elastic Disaster Recovery"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 6: Storage, lesson: AWS Elastic Disaster Recovery"
concepts:
  - aws-elastic-disaster-recovery
  - disaster-recovery
  - block-level-replication
  - point-in-time-recovery
---

# AWS Elastic Disaster Recovery

## Objectives

- Explain Elastic Disaster Recovery, its benefits and its uses.

## Notes

### How it works

- Lightweight agents on source servers replicate block-level data to AWS nonstop, without Storage Gateway.
- It protects general workloads on physical, virtual and cloud servers.
- Exact, current replicas let servers recover in the target AWS Region within minutes, with point-in-time recovery.
- Recovery tests leave production alone, and recovery instances start fast.

### Why use it

- Less downtime and data loss, vital where uptime matters, as in healthcare.
- No secondary data center: low-cost storage, minimal compute and pay-per-use pricing.
- Console automation replaces error-prone manual setup.

## Key takeaways

- Continuous block-level replication enables recovery in minutes.
- It protects on-premises and cloud servers, with point-in-time recovery.
- It removes the cost of a standby data center.

## Scenarios

- Hospital: patient-record servers stay recoverable and tested for regulators.
- Bank: transaction systems return fast if the main data center fails.
- Manufacturer: factory servers fail over to AWS to protect the supply chain.

## Terms

- **AWS Elastic Disaster Recovery**: managed service that continuously replicates servers to AWS for fast recovery.
- **Block-level replication**: copying disk blocks elsewhere as they change.
- **Point-in-time recovery**: restoring a system as it stood at a chosen earlier moment.
