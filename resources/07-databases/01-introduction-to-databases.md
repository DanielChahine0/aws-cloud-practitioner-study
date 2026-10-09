---
module: 7
lesson: 1
slug: introduction-to-databases
title: "Introduction to Databases"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 7: Databases, lesson: Introduction to Databases"
concepts:
  - shared-responsibility-model
  - fully-managed-services
  - managed-services
  - unmanaged-services
---

# Introduction to Databases

## Objectives

- Explain how the AWS Shared Responsibility Model splits database work.

## Notes

### Why a database

- A coffee shop loyalty program needs records of who bought what.
- AWS offers relational, nonrelational, in-memory cache and purpose-built options.

### Who does what

| Tier | AWS | You |
| --- | --- | --- |
| Fully managed | Provisioning, scaling, patches, backups, tuning, metrics | Data structures, access |
| Managed | Hardware, patches, backups | Configuration, query tuning |
| Unmanaged (MySQL on EC2) | - | Everything |

- Module 7 is mostly fully managed, a few managed.
- AWS handles antivirus and anti-malware on managed OSes, and you inherit their compliance.
- Managed services ease scaling and licensing, but leave app code to you.
- Self-hosting on EC2 is for full control, OS included, and is not automatically cheaper or faster.

## Key takeaways

- Fully managed leaves you only data design and access control.
- Self-host on EC2 only for OS-level control.
- Managed services free teams to build features.

## Terms

- **Fully managed service**: AWS runs nearly every operation.
- **Managed service**: AWS does upkeep, you configure and tune.
- **Unmanaged database**: one you install and run yourself.
