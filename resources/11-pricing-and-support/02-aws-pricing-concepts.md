---
module: 11
lesson: 2
slug: aws-pricing-concepts
title: "AWS Pricing Concepts"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 11: Pricing and Support, lesson: AWS Pricing Concepts"
concepts:
  - pay-as-you-go-pricing
  - save-when-you-commit
  - pay-less-by-using-more
  - savings-plans
  - cost-drivers
  - outbound-data-transfer
  - s3-pricing
---

# AWS Pricing Concepts

## Objectives

- Explain the core ideas of AWS pricing.
- Name the factors that drive cost.

## Notes

### Three pricing principles

- Most services are pay-as-you-go: you pay for the services you pick, while you use them, with no lengthy contract or licensing.
- Pay as you go: no upfront cost or commitment, so it suits variable or uncertain workloads and shifting needs without over- or underprovisioning.
- Save when you commit: a usage commitment, usually 1 or 3 years, earns big discounts on steady workloads.
  - Example: Savings Plans price certain services, such as compute, below On-Demand.
- Pay less by using more: economies of scale lower the unit price as usage grows, and some services use tiered pricing.
- Committing and using more sound alike, but one rewards a time commitment, the other sheer volume.

### Cost drivers

- Price varies by service category, configuration, Region and pricing model, so check each pricing page.
- The three main drivers are compute, storage and outbound data transfer.
- Compute (EC2, Lambda, ECS): processing power over time, per hour or second, from launch until you stop the instance, unless a reservation fixed the price.
- Storage (S3, EBS): the amount provisioned or used and for how long, typically per gigabyte, across options for keeping, reaching, securing and analyzing data.
- S3 tiers let cost follow how often and how fast you read data.
- S3 has six cost components: storage, requests and retrieval, transfer and acceleration, management and analytics, replication, and S3 Object Lambda processing.
- Data transfer: inbound and most same-Region traffic is free, with exceptions, while outbound data is pooled across services and billed per gigabyte at falling rates.
- Example: downloads from a static website hosted in S3 count as outbound transfer.
- **Exam guide update** (verified_on 2026-10-09, [Understanding data transfer charges](https://docs.aws.amazon.com/cur/latest/userguide/cur-data-transfers-charges.html)): Incoming data transfer costs are nothing for data coming from the internet into AWS, while outgoing data transfer costs apply to data leaving for the internet or for another Region.

### Worked example: a nonprofit on EC2

- Compute: of 500+ instance types with different CPU and memory, the donation app uses t4g.nano, the cheapest that fits.
- Storage: its Amazon EBS cost follows the configured capacity.
- Data transfer: sending data out for analytics is outbound, priced by volume and by the destination Region or internet source.

## Visuals

- **Pricing flashcards**: one card per principle, showing its benefit.
- **Cost driver accordion**: one panel each for compute, storage and data transfer.
- **Pricing scenario graphic**: three markers tracing each driver through the nonprofit's instance.

## Key takeaways

- The principles: pay as you go, save when you commit, pay less by using more.
- Committing earns a time discount, while using more earns a volume discount.
- The fundamental drivers are compute, storage and outbound data transfer.
- Inbound transfer is usually free, and outbound is billed per gigabyte.

## Scenarios

- Visitors downloading from an S3 static website: outbound transfer charges.
- A nonprofit's donation app: instance type, EBS capacity and outbound data shape its bill.

## Terms

- **Pay as you go**: Paying only for what you use, with nothing upfront.
- **Save when you commit**: Discounts for a usage commitment, usually 1 or 3 years.
- **Pay less by using more**: Volume and tiered discounts as usage grows.
- **Savings Plans**: 1-year or 3-year plans priced below On-Demand for certain services.
- **Cost drivers**: Compute, storage and outbound data transfer.
- **Outbound data transfer**: Data leaving AWS, billed per gigabyte.
- **Amazon S3 Object Lambda**: An S3 data processing feature with its own charge.
