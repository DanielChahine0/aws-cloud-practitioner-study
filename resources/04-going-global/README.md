---
module: 4
slug: going-global
title: "Module 4: Going Global"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 4: Going Global"
lessons: 4
assessment_questions: 6
---

# Module 4: Going Global

## What this module covers

This module takes the AWS Global Infrastructure beyond the basics of Regions and Availability Zones.
It explains how to pick a Region, how multi-AZ and multi-Region designs keep applications available, and how edge locations with Amazon CloudFront bring content closer to users.
It closes with infrastructure as code, using AWS CloudFormation to build the same environment anywhere, and compares it with the console and programmatic access.

## Lessons

### Module 4 Introduction

1. **[Introduction to Going Global](01-introduction-to-going-global.md)**: the coffee shop's move abroad as a map of Region choice, edge locations and IaC.

### AWS Global Infrastructure

2. **[Choosing AWS Regions](02-choosing-aws-regions.md)**: the four Region selection factors of compliance, proximity, feature availability and pricing.
3. **[Diving Deeper into AWS Global Infrastructure](03-diving-deeper-into-aws-global-infrastructure.md)**: multi-AZ and multi-Region redundancy, edge locations, CloudFront, Route 53 and Outposts.
4. **[Infrastructure and Automation](04-infrastructure-and-automation.md)**: infrastructure as code with CloudFormation, and when to use the console, the CLI, SDKs or IaC.

### Module 4 Conclusion

The Assessment and Module Summary lessons have no notes files of their own; they feed the assessment and summary sections below.

## Key takeaways

- Choose a Region by checking compliance first, then weighing proximity, feature availability and pricing.
- Regions are isolated, data leaves one only with your permission, and the host country's laws apply to it.
- A Region holds three or more AZs, and each AZ is one or more data centers with independent power, networking and connectivity.
- Multi-AZ and multi-Region designs give high availability, fault tolerance and low latency for end users.
- High availability, agility and elasticity are separate benefits of the global infrastructure.
- Edge locations sit outside Regions and cache content for higher transfer speeds and lower latency, while Regions host most AWS services.
- CloudFront runs on edge locations, which also host Route 53 and Global Accelerator.
- AWS Outposts runs AWS services on premises when even a Region plus CloudFront is too slow.
- CloudFormation models and sets up resources from code, giving identical environments across Regions and accounts with fewer errors.
- Programmatic access suits developers, the console suits newcomers and visual tasks, and IaC suits repeatable, consistent multi-Region deployments.

## What the assessment focuses on

The assessment has 6 questions.

- Factors for choosing a Region: 1 question.
- Benefits of deploying across multiple Regions and AZs: 1 question.
- Purpose of edge locations: 1 question.
- How Regions, Availability Zones and edge locations relate to each other: 1 question.
- AWS CloudFormation features and benefits: 1 question.
- Picking infrastructure as code for consistent, automated multi-Region deployments: 1 question.

## Summary

The module widened the view of the AWS Global Infrastructure along three lines.
First came deciding where to deploy, then why edge locations are worth having, and finally letting services like CloudFormation make deployments faster and automatic.

## Further reading

- [AWS Global Infrastructure](https://aws.amazon.com/about-aws/global-infrastructure/): the official overview of where and how AWS infrastructure is spread.
- [AWS for the Edge](https://aws.amazon.com/edge/?nc2=type_a): AWS's page on its edge sites and networking at the edge.
- [AWS CloudFormation](https://aws.amazon.com/cloudformation/): the service page for the IaC tool from lesson 4.
