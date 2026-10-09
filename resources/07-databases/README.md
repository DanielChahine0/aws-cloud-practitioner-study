---
module: 7
slug: databases
title: "Module 7: Databases"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 7: Databases"
lessons: 6
assessment_questions: 12
---

# Module 7: Databases

## What this module covers

This module tours the AWS database portfolio, starting with how the shared responsibility model splits database work into fully managed, managed and unmanaged.
It covers relational options (Amazon RDS, Amazon Aurora and AWS DMS for migrations), the NoSQL service Amazon DynamoDB and a console demo of both RDS and DynamoDB.
It then adds in-memory caching with Amazon ElastiCache and purpose-built databases (Amazon DocumentDB, Amazon Neptune, Amazon Managed Blockchain and DynamoDB Accelerator).
It ends with AWS Backup, a backup service that protects databases and storage alike.

## Lessons

### Module 7 Introduction

1. **[Introduction to Databases](01-introduction-to-databases.md)**: who handles which database tasks under fully managed, managed and unmanaged services, and when self-hosting on EC2 makes sense.

### AWS Database Services

2. **[Relational Database Services](02-relational-database-services.md)**: relational databases and SQL, lift-and-shift with AWS DMS, Amazon RDS and Amazon Aurora.
3. **[NoSQL Database Services](03-nosql-database-services.md)**: flexible-schema key-value databases and Amazon DynamoDB with its global tables and auto scaling.
4. **[AWS Databases Demonstration](04-aws-databases-demonstration.md)**: building an RDS for MySQL database and a DynamoDB table in the console, and how the two differ.
5. **[In-Memory Caching Services](05-in-memory-caching-services.md)**: why caches relieve database bottlenecks and how Amazon ElastiCache works alongside a database.
6. **[Additional Database Services](06-additional-database-services.md)**: purpose-built databases (DocumentDB, Neptune, Managed Blockchain, DAX) and AWS Backup for central backups.

## Key takeaways

- Fully managed databases leave you only data structure design and access control, while self-managing on Amazon EC2 pays off only when you need OS-level control.
- Relational databases use a rigid schema of related tables and SQL, and NoSQL databases differ mainly by using flexible schemas.
- Amazon RDS automates patching, backups and failover for operational workloads, and Multi-AZ deployments keep it available.
- Amazon Aurora delivers commercial-grade performance at about one-tenth the cost, with up to 5x MySQL throughput and six copies across three AZs.
- AWS DMS minimizes application downtime because the source database stays live during migration.
- Amazon DynamoDB is a fully managed, serverless NoSQL database with single-digit millisecond latency and auto scaling that follows real traffic.
- Amazon ElastiCache complements a database with in-memory caching, offloading reads and allowing smaller instances.
- Amazon DocumentDB serves semistructured JSON documents with MongoDB compatibility, and Amazon Neptune serves highly connected graph data.
- AWS Backup centralizes backup policies across AWS services, accounts, Regions and on-premises resources.
- AWS recommends a purpose-built database for each workload rather than one database for everything.

## What the assessment focuses on

The module assessment has 12 questions.

- Shared responsibility for database services, including customer duties under fully managed services and when self-managing on Amazon EC2 makes sense: 2 questions.
- What Amazon RDS is: 1 question.
- Amazon Aurora use cases, especially its cost advantage over commercial engines: 1 question.
- The problem AWS Database Migration Service solves: 1 question.
- Amazon DynamoDB and how NoSQL differs from relational databases: 2 questions.
- In-memory caching and Amazon ElastiCache benefits: 2 questions.
- AWS Backup features: 1 question.
- Amazon DocumentDB use cases: 1 question.
- Amazon Neptune use cases: 1 question.

## Summary

- The thread running through the module is matching each workload to the right database, with AWS taking on more of the operations the more managed the service is.
- For structured, transactional data, Amazon RDS is the starting point, Aurora steps in when you want commercial-grade speed and availability for less, and AWS DMS gets existing databases there without a long outage.
- When schemas need to flex or traffic is huge, DynamoDB is the NoSQL choice, while DocumentDB fits JSON documents and Neptune fits relationship-heavy graphs.
- When reads swamp a database, ElastiCache adds a memory layer next to it, and AWS Backup ties the protection of all these data stores together in one place.

## Further reading

- [Amazon Relational Database Service (Amazon RDS)](https://aws.amazon.com/rds/): start here to compare the engines RDS runs and the upkeep it automates.
- [Amazon RDS Security](https://aws.amazon.com/rds/features/security/): open this when setting up the security controls that stay your job under RDS.
- [Amazon Aurora](https://aws.amazon.com/rds/aurora/): read before choosing Aurora over plain MySQL or PostgreSQL.
- [AWS Database Migration Service (AWS DMS)](https://aws.amazon.com/dms/): useful when planning a move to AWS that cannot take the source offline.
- [Amazon DynamoDB](https://aws.amazon.com/dynamodb/): check it when an app needs fast NoSQL access that holds up at scale.
- [Amazon ElastiCache](https://aws.amazon.com/elasticache/): worth a look when database reads are the bottleneck.
- [Amazon DocumentDB](https://aws.amazon.com/documentdb/): relevant if you run MongoDB workloads and want them managed on AWS.
- [AWS Backup](https://aws.amazon.com/backup/): the place to plan one backup approach for AWS and on-premises data.
- [Amazon Neptune](https://aws.amazon.com/neptune/): go here when your data is mostly relationships, such as social or fraud graphs.
- [What Is a Relational Database?](https://aws.amazon.com/relational-database/): a primer for revisiting tables, schemas and SQL.
- [What Is a NoSQL Database?](https://aws.amazon.com/nosql/): a primer that sets NoSQL data models against relational ones.
- [What Is an In-Memory Caching Service?](https://aws.amazon.com/caching/aws-caching/): background on why RAM-based caches answer so quickly.
- [AWS Shared Responsibility Model](https://aws.amazon.com/compliance/shared-responsibility-model/): the full split of security duties between AWS and you.
