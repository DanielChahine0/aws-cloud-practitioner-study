---
module: 8
lesson: 6
slug: introduction-to-data-analytics
title: "Introduction to Data Analytics"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 8: AI/ML and Data Analytics, lesson: Introduction to Data Analytics"
concepts:
  - data-analytics
  - data-lakes
  - etl
  - elt
  - zero-etl
  - data-pipelines
---

# Introduction to Data Analytics

## Objectives

- Explain the purpose and benefits of ETL pipelines.
- Define data analytics.

## Notes

### Analytics next to AI/ML

- Data enables AI/ML, whose predictions reshape analysis.
- Both need plenty of clean, easy-to-reach data.
- Data analytics: analysts turn raw history into insights and trends.
- Still vital: explaining loan decisions, hypothesis tests on clinical trials, insurance risk models regulators can understand and approve, and cheaper, more efficient work on small datasets.

### Data lakes

- Purchases, logins and browsing leave data scattered across systems and formats, and a data lake, pictured as a huge reservoir, gathers it all.

### ETL, ELT and zero-ETL

- Data must also suit analytics tools and AI algorithms.
- ETL: extract and store, transform to one format, load into a warehouse or analytics platform.
- ELT: load first, transform as needed; needs and infrastructure decide.
- Zero-ETL: skip it when data is already usable and in place.

### Pipelines and AWS

- Pipelines are assembly lines automating ingest, process and serve, so each ETL run repeats reliably.
- Named here: Amazon Kinesis and AWS Glue (ingest), Amazon S3 and Redshift (store), Amazon EMR (process), Amazon QuickSight (visualize).
- [Lesson 7](07-data-pipelines-on-aws.md) moves Glue to cataloging and processing, leaving ingestion to Kinesis Data Streams and Firehose.
- One S3 dataset can feed marketing's QuickSight BI and SageMaker AI training.

## Key takeaways

- Analytics still matters beside AI/ML.
- A data lake centralizes scattered data.
- ETL transforms before loading, ELT after, and zero-ETL not at all.
- Pipelines make each ETL run consistent and hands-off.

## Scenarios

- Explaining a loan decision: traditional analytics.

## Terms

- **Data analytics**: Raw history turned into insights.
- **Data lake**: One store for all of a business's data.
- **ETL**: Extract, transform, load, which formats data before loading.
- **ELT**: Extract, load, transform, which formats data after loading.
- **Zero-ETL**: Using already-usable data as-is.
- **Data pipeline**: Automated ingest-process-deliver line.
