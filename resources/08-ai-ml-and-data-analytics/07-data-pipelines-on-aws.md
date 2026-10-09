---
module: 8
lesson: 7
slug: data-pipelines-on-aws
title: "Data Pipelines on AWS"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 8: AI/ML and Data Analytics, lesson: Data Pipelines on AWS"
concepts:
  - amazon-kinesis-data-streams
  - amazon-data-firehose
  - amazon-s3
  - amazon-redshift
  - aws-glue
  - amazon-emr
  - amazon-quicksight
  - amazon-opensearch-service
---

# Data Pipelines on AWS

## Objectives

- Match AWS services to each phase of a typical data pipeline.

## Notes

### What a pipeline does

- It automates source-to-destination flow (ingest, catalog, transform, deliver) from apps, databases, sensors and streams, cutting manual work and errors.
- Insight needs the data pooled in one place: a flexible data lake for vast raw data, or a more structured data warehouse built for business intelligence.
- Ingestion moves source data into that store, in real time when needed at once, or in batches when delay is tolerable.
- Cataloging records metadata centrally as an inventory of the organization's data, much as a phone selfie carries its time, place and file format.
- Processing then cleans and transforms the data, and consumers query and visualize it.

### Services by phase

| Phase | Service | Key facts |
| --- | --- | --- |
| Ingest | Amazon Kinesis Data Streams | Serverless, real time, terabytes from apps, streams and sensors; several apps can read one stream at once; on-demand mode provisions and scales itself |
| Ingest | Amazon Data Firehose | Fully managed streaming ETL in near real time; provisions and scales itself; lands data in seconds in lakes, warehouses or analytics tools |
| Store | Amazon S3 | The usual data lake: secure, fully elastic object storage holding nearly unlimited structured or unstructured data |
| Store | Amazon Redshift | Managed warehouse for structured or semistructured data at petabyte scale; scales, pay-as-you-go |
| Catalog | AWS Glue Data Catalog | A Glue feature; managed, scalable central metadata store that eases discovery and speeds pipelines by serving metadata to stores and analytics tools |
| Process | AWS Glue | Managed ETL that makes prep simpler, faster and cheaper; visual job builder, built-in scheduling, many sources and formats, code-free scripts; jobs read Catalog metadata to shape transforms |
| Process | Amazon EMR | Large-scale work on Apache Spark, Hadoop or Hive; handles provisioning, clusters and scaling |
| Query | Amazon Athena | Serverless SQL over object, relational, nonrelational or custom sources in S3, on premises or other clouds; pay per query |
| Query | Amazon Redshift | Columnar storage plus massively parallel processing for complex SQL on big datasets |
| Visualize | Amazon QuickSight | BI at scale: experts and non-experts build interactive dashboards and reports without infrastructure or developers; Amazon Q in QuickSight adds natural language |
| Visualize | Amazon OpenSearch Service | Searches, monitors and analyzes business and operational data live, by keyword or natural language; dashboards for logs, traces, metrics; website search, log analytics, app monitoring, observability |

- **Exam guide update** (verified_on 2026-10-09, [Amazon Quick Sight](https://aws.amazon.com/quicksight/)): AWS now spells the business intelligence service the course calls QuickSight as Amazon Quick Sight, which delivers AI-powered business intelligence.

## Key takeaways

- Order: ingest, store, catalog, process, then query and visualize.
- Kinesis Data Streams is real time with many readers, while Firehose is near real time with managed delivery.
- S3 is the lake for raw data of any shape, while Redshift is the warehouse for structured or semistructured data.
- Glue suits a simplified approach, while EMR suits complex jobs, big data expertise and custom configurations.
- Athena queries data where it lives and bills per query, while Redshift handles frequent, heavy SQL.
- QuickSight is for BI dashboards, while OpenSearch Service is for real-time search and monitoring.

## Scenarios

- Live stock data feeding instant trades: Kinesis Data Streams.
- Gathering every smart home device's data for long-term analysis: Data Firehose.

## Terms

- **Data ingestion**: Moving source data into storage.
- **Data warehouse**: Structured store optimized for business intelligence.
- **Metadata**: Details that describe data, like a photo's time, place and format.
- **Amazon Kinesis Data Streams**: Serverless real-time ingestion.
- **Amazon Data Firehose**: Managed near-real-time ingestion and delivery.
- **Amazon Redshift**: Managed data warehouse.
- **AWS Glue Data Catalog**: Central metadata repository within AWS Glue.
- **AWS Glue**: Managed ETL service.
- **Amazon EMR**: Big data processing on Apache frameworks.
- **Amazon Athena**: Serverless, pay-per-query SQL.
- **Amazon QuickSight**: BI dashboards and reports.
- **Amazon OpenSearch Service**: Real-time search and monitoring.
