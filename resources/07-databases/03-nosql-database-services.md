---
module: 7
lesson: 3
slug: nosql-database-services
title: "NoSQL Database Services"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 7: Databases, lesson: NoSQL Database Services"
concepts:
  - nosql-databases
  - key-value-data-model
  - flexible-schema
  - amazon-dynamodb
  - amazon-dynamodb-global-tables
  - amazon-dynamodb-auto-scaling
---

# NoSQL Database Services

## Objectives

- Explain NoSQL databases.
- Describe Amazon DynamoDB, its benefits and use cases.

## Notes

### Relational versus NoSQL

- Relational databases (MySQL, say), long the default, need a set schema and SQL.
- In certain cases they struggle to perform or scale, and fixed schemas suit changing attributes poorly.
- NoSQL (nonrelational) databases hold key-value pairs: a unique key names an item and attributes carry its values, like a dictionary headword and definition.
- Items can differ in attributes, which come and go freely (one customer has a favorite drink, another a birthday).
- The core difference is flexible versus rigid schema, not speed or scaling, and NoSQL still indexes the primary key by default.

### Amazon DynamoDB

- Fully managed, serverless NoSQL for key-value and document data.
- Single-digit millisecond latency at any scale, with no patching, upgrades, maintenance windows, downtime or cold starts.
- Data spreads over many servers and SSDs with no practical size cap, you pay per use, and security is built in.
- Use cases: gaming, finance and global mobile apps, served worldwide by **global tables**.
- **Auto scaling with provisioned capacity**: throughput automatically follows real use toward your target utilization, steady at peaks, cheaper when quiet.
- **Availability**: 99.999%, copies in three facilities per Region and in other Regions.
- **Encryption**: automatic at rest and in transit, with a choice of keys.
- Pick it for speed, changeable schemas and offloaded management.

## Visuals

- **Key-value table**: two items with different attributes.
- **Accordion**: four benefit panels.

## Key takeaways

- NoSQL differs from relational mainly by flexible schemas.
- DynamoDB is serverless, single-digit millisecond fast and maintenance-free.
- Auto scaling avoids the waste or slow peaks of hand-set read/write capacity.

## Scenarios

- Prime Day 2024 on global tables: tens of trillions of calls in 48 hours, peaking at 146 million requests per second.
- A knowledge check matches unpredictable traffic to auto scaling.

## Terms

- **NoSQL database**: a nonrelational, flexible-schema database.
- **Key-value pair**: a unique key plus an item's attributes.
- **Item and attribute**: a DynamoDB record and its name-value pairs, with values such as numbers, sets or documents.
- **Amazon DynamoDB**: AWS's fully managed, serverless NoSQL database.
- **DynamoDB global tables**: the feature for worldwide DynamoDB apps, as on Prime Day.
