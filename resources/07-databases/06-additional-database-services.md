---
module: 7
lesson: 6
slug: additional-database-services
title: "Additional Database Services"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 7: Databases, lesson: Additional Database Services"
concepts:
  - purpose-built-databases
  - semistructured-data
  - amazon-documentdb
  - amazon-neptune
  - graph-databases
  - amazon-managed-blockchain
  - amazon-dynamodb-accelerator
  - aws-backup
---

# Additional Database Services

## Objectives

- Describe Amazon DocumentDB, AWS Backup and Amazon Neptune, with benefits and use cases.

## Notes

### Purpose-built databases

- Fit the database to the business need, not the data to the database, as none suits every job.
- AWS steers each workload to its best-fit purpose-built tool, and offers more than the course covers.

### Amazon DocumentDB (with MongoDB compatibility)

- Where DynamoDB handles key-value data, DocumentDB takes semistructured data too complex for rows and columns.
- Fully managed, it stores, queries and indexes JSON-like documents with dynamic schemas, ideal when schemas change often.
- Continuous backup and enterprise-grade security come built in.
- Use cases: content management, catalogs and inventory, user profiles and personalization.
- Not ideal for strict-compliance banking (relational fits better), archives or in-memory caching.
- **MongoDB compatibility**: MongoDB APIs, drivers, tools, code and skills carry over with few changes.
- **Scaling**: storage grows on its own in 10 GB steps to 64 TB, compute scales either way, and it serves millions of requests per second.
- **Read throughput**: up to 15 replicas share storage.

### Amazon Neptune

- A fully managed graph database for highly connected data, like social webs that are clumsy in relational tables.
- Low-latency queries and high-throughput reads and writes suit real-time apps, with automatic failover and backups.
- Use cases: social network mapping, fraud detection, search and recommendations.
- Not for general streaming analytics, replacing all SQL databases, or document text search.
- **Relationships**: property graph and RDF (Resource Description Framework) models for mapping relationships and matching patterns.
- **Scale**: billions of relationships in milliseconds as complexity grows, storage up to 64 TB, and a traversal-tuned engine.

### Other specialized options

- **Amazon Managed Blockchain** runs blockchain networks, such as a grocer's food-safety shipment tracking.
- **DynamoDB Accelerator (DAX)** is a built-in cache that sharply cuts DynamoDB read times.

### AWS Backup

- A backup service for databases and storage alike, not a database.
- Separate disk and database backup plans overlap and confuse, so it unifies them in one dashboard.
- It covers EBS, Amazon EFS, RDS, DynamoDB and more, even on-premises data.
- Use cases: central disaster recovery, consistent compliance policies, one backup interface.
- **Central management**: one view of jobs, restore points and compliance across services and accounts, with schedules, encryption and auto-protection of new resources.
- **Cross-Region redundancy**: copies in other Regions allow restores during a Regional outage.
- **Compliance**: audit logs, reports, organization-wide policies and activity tracking.

## Visuals

- **Benefit accordions**: eight panels across the three services.

## Key takeaways

- Use purpose-built databases, since none fits every workload.
- DocumentDB stores semistructured JSON with MongoDB compatibility.
- Neptune answers fast when data is a dense web of relationships.
- AWS Backup centralizes backups across services, accounts, Regions and on premises.

## Scenarios

- Mapping a social network: Neptune.
- A grocer tracing shipments: Managed Blockchain.
- Backups scattered over EBS, EFS, RDS and DynamoDB: AWS Backup.

## Terms

- **Purpose-built database**: one designed for a specific workload.
- **Semistructured data**: varied, complex data that defies rigid schemas.
- **Amazon DocumentDB (with MongoDB compatibility)**: a fully managed MongoDB-compatible document database.
- **Amazon Neptune**: a fully managed graph database.
- **Graph database**: one built around connections.
- **Amazon Managed Blockchain**: a service for building and running blockchain networks.
- **DynamoDB Accelerator (DAX)**: a built-in DynamoDB cache.
- **AWS Backup**: central, automated backup for AWS and on-premises data.
