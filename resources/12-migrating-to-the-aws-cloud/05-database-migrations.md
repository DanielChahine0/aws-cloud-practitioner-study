---
module: 12
lesson: 5
slug: database-migrations
title: "Database Migrations"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 12: Migrating to the AWS Cloud, lesson: Database Migrations"
concepts:
  - aws-database-migration-service
  - aws-schema-conversion-tool
  - homogeneous-database-migration
  - heterogeneous-database-migration
  - database-schema
---

# Database Migrations

## Objectives

- Explain why changing database engines complicates a migration.
- Know what AWS DMS and AWS SCT each do and when to choose them.

## Notes

### Migration types

- Databases move to cut costs or modernize, a chance to redesign them; AWS managed or open source targets can lower licensing costs.
- Homogeneous: the same engine on both ends, so fairly simple.
- Heterogeneous: a new engine, such as legacy commercial to Amazon Aurora, which is harder and may need app changes.
- A heterogeneous move must recreate the schema, the database's blueprint (tables, field types, relationships), which is slow by hand.

### How AWS DMS works

- It moves relational and NoSQL databases, data warehouses and analytics workloads to AWS.
- You name the source and target, and a scheduled task on a replication VM copies the data while the source stays live.
- You can fall back to the original or replicate into other Regions or Availability Zones.

### AWS DMS versus AWS SCT

| | AWS DMS | AWS SCT |
|---|---|---|
| Job | Moves and replicates data; covers planning, assessment, conversion and the move itself | Converts schemas and code objects (stored procedures, views, functions) to a new engine |
| Strengths | Low downtime, high availability, both migration types, low-cost terabyte moves | Flags manual work, estimates effort, automates analysis at scale, works with popular engines |
| Uses | Managed databases, dropping licenses, ongoing replication, data lake integration | Commercial to open source, big data warehouses, updating schemas in place |

- Both save time and money, ease adopting new databases and follow AWS security best practices.

## Visuals

- Bird cartoon: birds lifting a database to the cloud are unsure where it goes, so they reach for AWS SCT.

## Key takeaways

- AWS DMS keeps the source live and handles both migration types.
- AWS SCT helps heterogeneous moves by converting schema and code, saving weeks or months.
- Rule: schema or code conversion points to SCT; moving data or one end-to-end tool points to DMS.

## Scenarios

- Commercial database to Amazon Aurora: AWS SCT converts schema and code, then AWS DMS moves the data.

## Terms

- **AWS Database Migration Service (AWS DMS)**: A service that migrates and replicates databases to AWS.
- **AWS Schema Conversion Tool (AWS SCT)**: A tool that converts schemas and code objects between engines.
- **Homogeneous migration**: A move between databases on the same engine.
- **Heterogeneous migration**: A move to a database on a different engine.
- **Schema**: The blueprint of a database's tables, field types and relationships.
