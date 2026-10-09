---
module: 7
lesson: 2
slug: relational-database-services
title: "Relational Database Services"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 7: Databases, lesson: Relational Database Services"
concepts:
  - relational-databases
  - sql
  - migration-strategy-rehost
  - aws-database-migration-service
  - amazon-rds
  - multi-az-deployment
  - amazon-rds-read-replicas
  - amazon-aurora
---

# Relational Database Services

## Objectives

- Explain what a relational database is.
- Describe Amazon RDS and Amazon Aurora, their benefits and their use cases.

## Notes

### Relational databases

- Transactional data, like the coffee shop's orders and loyalty records, usually sits in a relational database management system.
  - Spotting repeat drink orders lets the shop send a discount.
- Tables of rows and columns follow a rigid schema and share attributes, so one query spans customers and orders.
- SQL is the usual interface, on engines like MySQL, PostgreSQL and Microsoft SQL Server, and the model keeps structured data consistent and scalable.
- AWS's fully managed relational options remove admin work but keep availability and security, and familiar engines (MySQL, PostgreSQL, Oracle) ease migration.

### Moving an existing database

- Lift-and-shift puts an on-premises database as is on Amazon EC2, keeping control of OS, memory, CPU and storage.
- AWS Database Migration Service (AWS DMS) eases the move and minimizes app downtime, since the source stays live throughout.

### Amazon RDS

- A relational service for operational workloads, not data warehousing, that automates patching, backups, provisioning, failover and disaster recovery.
- The course labels RDS and Aurora both managed and fully managed.
- AWS runs infrastructure, OS, patching and backups, while you own security measures and encryption at rest and in transit.
- Instance classes favor memory, performance or I/O, scaling is vertical or horizontal, and storage is not fixed.
- Engines: Aurora, MySQL, PostgreSQL, MariaDB, Microsoft SQL Server and Oracle Database.
- Resilience: Multi-AZ, automated backups on your schedule, and manual DB snapshots (full copies for point-in-time recovery or archives).
- Use cases: web apps, enterprise workloads, e-commerce inventories.

| Benefit | How |
| --- | --- |
| Cost | No hardware, pay-as-you-go, less admin |
| Multi-AZ | A standby in another AZ takes over automatically |
| Performance | Read replicas offload reads, Performance Insights shows live load |
| Security | VPC isolation, encryption, backups, Multi-AZ |

### Amazon Aurora

- MySQL- and PostgreSQL-compatible, built to cut needless I/O (the video also lists distributed SQL, DSQL).
- About one-tenth the cost of high-end commercial databases at similar performance, so it suits replacing pricey commercial engines.
- Up to 5x MySQL and 3x PostgreSQL throughput comes from distributed storage, not automatic CPU scaling.
- Storage grows on its own from 10 GB to 128 TB, backed up continuously to Amazon S3, encrypted at rest and continuously monitored.
- Six copies over three AZs, 99.99% availability, failover to healthy replicas without data loss, and up to 15 Aurora Replicas.
- Through AWS Backup, point-in-time restore reaches back up to 35 days.
- Use cases: games, media and content management, real-time analytics.
- Overkill for temporary dev or rarely read data, and not for unstructured streams.

## Visuals

- **Inventory table**: one coffee product per row with ID, name, size and price.
- **Benefit accordions**: four RDS and three Aurora panels, summarized above.

## Key takeaways

- Relational databases pair a rigid schema with SQL and suit transactional data.
- AWS DMS minimizes downtime by keeping the source live.
- RDS automates upkeep for operational workloads, while you own security and encryption.
- Multi-AZ fails RDS over to a standby automatically.
- Aurora matches commercial databases at about a tenth of the cost.

## Scenarios

- Rewarding repeat orders: relate customer and order tables.
- Keeping a familiar setup in the cloud: lift-and-shift to EC2, with AWS DMS.
- Knowledge checks practise RDS Multi-AZ for always-on data and Aurora's storage design for peak MySQL load.

## Terms

- **Relational database**: related tables under a fixed schema.
- **SQL**: the language for querying relational data.
- **Lift-and-shift**: moving a database unchanged onto EC2.
- **AWS DMS**: a migration service that keeps the source running.
- **Amazon RDS**: AWS's relational database service with automated upkeep.
- **Multi-AZ deployment**: a standby in another AZ that takes over on failure.
- **DB snapshot**: a manual full backup of an RDS instance.
- **Read replica**: a copy that takes read traffic off the primary.
- **Performance Insights**: real-time RDS load analysis.
- **Amazon Aurora**: a high-throughput MySQL- and PostgreSQL-compatible database.
- **Aurora Replica**: one of up to 15 cluster copies that traffic can fail over to.
