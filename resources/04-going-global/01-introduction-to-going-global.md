---
module: 4
lesson: 1
slug: introduction-to-going-global
title: "Introduction to Going Global"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 4: Going Global, lesson: Introduction to Going Global"
concepts:
  - aws-global-infrastructure
  - region-selection
  - edge-locations
  - infrastructure-as-code
  - aws-cloudformation
---

# Introduction to Going Global

## Objectives

- Recap the parts that make up the AWS Global Infrastructure.

## Notes

### What the module adds

- On top of Regions and Availability Zones (AZs), the module covers Region selection, edge locations, and automated deployment with AWS CloudFormation.
- Together these give a business elasticity and agility, not only high availability.
- The end goal is applications that are robust, scalable and reachable worldwide.

### The coffee shop goes international

- **New shops**: where to open depends on local demand, rules and costs, just as several factors decide which AWS Regions to use.
- **Coffee carts**: small, light outlets sell only the best sellers, fast, like edge locations.
- Edge locations cache popular images, videos and other assets near users, so nobody waits for a trip to a central location.
- **Same drink everywhere**: shared recipes and machine settings copied to every shop keep the product identical, like infrastructure as code (IaC) with CloudFormation.
- IaC lets a business grow responsibly, with matching deployments across environments and Regions.

## Visuals

- **Going global timeline**: three steps tie new shops to Region choice, carts to low-latency edge locations, and a consistent product to IaC with CloudFormation.

## Key takeaways

- Region choice is a multi-factor business decision, unpacked in [Choosing AWS Regions](02-choosing-aws-regions.md).
- Edge locations serve frequently requested content quickly from a cache close to users.
- IaC with CloudFormation repeats the same reliable setup each time the business grows.

## Terms

- **Edge location**: A small AWS site that caches popular content close to users.
- **Infrastructure as code (IaC)**: Defining infrastructure in files so deployments are automated and alike.
- **AWS CloudFormation**: The AWS IaC service for automating resource deployment.
