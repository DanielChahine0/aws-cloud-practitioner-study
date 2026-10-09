---
module: 8
lesson: 8
slug: data-analytics-and-ai-ml
title: "Data Analytics and AI/ML"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 8: AI/ML and Data Analytics, lesson: Data Analytics and AI/ML"
concepts:
  - data-pipelines
  - amazon-dynamodb
  - amazon-kinesis-data-streams
  - amazon-data-firehose
  - amazon-s3
  - aws-glue-data-catalog
  - amazon-athena
  - amazon-sagemaker-ai
---

# Data Analytics and AI/ML

## Objectives

- Explain how a company can automate ingesting, processing and delivering data.

## Notes

### The problem

- An e-commerce app's recommendation model needs regular retraining on fresh customer data.
- Its data scientists want to query that data too.
- Nonstop collection and analysis suit an efficient, repeatable, error-free automated pipeline.
- Customer history sits in Amazon DynamoDB, great for fast reads and writes but impractical to scan in full for training, so the data must move to a data lake.

### The pipeline, marker by marker

- **1 Make recommendations**: the ML model suggests products to shoppers.
- **2 Store app data**: DynamoDB keeps the customer history.
- **3 Ingest data**: with no direct DynamoDB-to-Firehose link today, changes go through Amazon Kinesis Data Streams, then Data Firehose aggregates them (near real time, little setup, auto scaling).
- **4 Process data**: records arrive as JSON, but the data scientist and ML engineer want .csv, so Firehose invokes an AWS Lambda function to convert them.
- **5 Deliver data**: Firehose writes it to the S3 data lake, which holds all the company's ML and analytics data for many consumers.
- **6 Catalog data**: an AWS Glue Data Catalog table notes the data's schema and where it sits in S3, so ad hoc queries can find it.
- **7 Perform data analytics**: data scientists query S3 in place with standard SQL in Amazon Athena, which reads the catalog table to recognize the structure.
- **8 Train model**: Amazon SageMaker AI pulls that same S3 data so ML engineers can retrain the recommendation model.

### Why automate

- Once built, the pipeline reruns on a schedule, so data scientists focus on insights and ML engineers on keeping the model current.
- Reusing one dataset is common, and the course calls automation key to efficiency and innovation.

## Visuals

- Architecture diagram: the eight numbered markers above, ending in a split to Athena (analytics) and SageMaker AI (training) that shows one pipeline serving both.

## Key takeaways

- DynamoDB suits app reads and writes, not training scans, so data moves to an S3 data lake.
- Kinesis Data Streams bridges DynamoDB to Firehose, which can call Lambda to reshape records before S3.
- One scheduled pipeline feeds both Athena analysis and SageMaker AI training from the same S3 data.

## Scenarios

- A fresh model plus data scientists' queries on the same data: an automated pipeline.
- Data arriving as JSON but needed as .csv: Firehose invoking a Lambda function.

## Terms

- **AWS Lambda**: Runs functions; here Firehose invokes one to transform records before delivery (see [AWS Lambda](../03-exploring-compute-services/02-aws-lambda.md)).
