---
module: 7
lesson: 4
slug: aws-databases-demonstration
title: "AWS Databases Demonstration"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 7: Databases, lesson: AWS Databases Demonstration"
concepts:
  - amazon-rds
  - amazon-dynamodb
  - aws-management-console
  - foreign-keys
  - amazon-dynamodb-partition-key
  - amazon-dynamodb-scan
  - amazon-dynamodb-query
  - aws-sdk
---

# AWS Databases Demonstration

## Objectives

- Launch an Amazon RDS instance in the AWS Management Console and use SQL to build and fill tables.
- Create a DynamoDB table in the console, add items, then scan it.

## Notes

### Amazon RDS in the console

- Setup is a handful of choices: the MySQL engine, the free tier template for trials, an identifier (database-1), admin credentials and the default VPC.
- Public access was turned on only so a SQL client could reach it, and real systems allow just authorized apps.
- Once the status reads available, a client connects with the endpoint and port from the connectivity and security tab plus the credentials.
- SQL then created users, products and orders tables tied by foreign keys, inserted rows, and joined them to list one user's orders.
- Every row had to fill the same columns, showing the rigid schema.

### Amazon DynamoDB in the console

- A table needs only a name (orders) and a partition key (order number, type Number), and is usable once active.
- Each item must carry a partition key value, while its other attributes can vary.
- Apps reach DynamoDB by calling its APIs through the AWS SDK, as a Python script did to load 10 items.
- A scan (Explore table items, then Run) read back everything, and a notes attribute appeared on only some items.
- A query for order number 5 returned that single item, the better tool as tables grow.

### RDS versus DynamoDB

| | Amazon RDS | Amazon DynamoDB |
| --- | --- | --- |
| You work with | An instance holding related tables | Stand-alone tables, no instances |
| Schema | Rigid, same columns per row | Flexible, only the partition key required |
| Linking data | Foreign keys and joins | No foreign keys |
| Querying | SQL | Its own query language |
| App access | Client via endpoint, port, credentials | AWS SDK calls to DynamoDB APIs |

## Key takeaways

- An RDS database takes a few console choices, and clients connect via endpoint, port and credentials.
- RDS links rigid tables with foreign keys, and DynamoDB tables stand alone with flexible schemas.
- A DynamoDB table needs just a name and a partition key.
- A scan returns the whole table, while a query fetches items by partition key.

## Scenarios

- Just trying RDS out: use the free tier template.
- Letting a demo SQL client connect: enable public access, then lock it down in production.
- Finding one order in a growing table: query the partition key instead of scanning.

## Terms

- **Free tier template**: an RDS setup preset for trying the service.
- **DB instance identifier**: an RDS instance's name, such as database-1.
- **Endpoint and port**: the address clients use to reach an RDS instance.
- **Foreign key**: the link relating one RDS table to another, absent in DynamoDB.
- **Partition key**: the required attribute that identifies DynamoDB items and that a query looks up.
- **Scan**: a DynamoDB read of every item in a table.
- **Query**: a DynamoDB read of the items matching a partition key value.
- **AWS SDK**: what application code uses to invoke DynamoDB's APIs.
