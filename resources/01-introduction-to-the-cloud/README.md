---
module: 1
slug: introduction-to-the-cloud
title: "Module 1: Introduction to the Cloud"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 1: Introduction to the Cloud"
lessons: 6
assessment_questions: 8
---

# Module 1: Introduction to the Cloud

## What this module covers

This module lays the groundwork for the course, starting from the client-server model and the coffee shop analogy used throughout.
It defines cloud computing, compares cloud-based, on-premises and hybrid deployments, and lists the six benefits of the AWS Cloud.
It then introduces AWS Regions and Availability Zones as the basis for high availability and fault tolerance, and explains how the AWS Shared Responsibility Model divides security work.
A closing real-life case shows how these ideas combine for a company expanding worldwide.

## Lessons

Only the six content lessons have notes files: the course's opening "How to Use Each Module" lesson covers the course player, not AWS, and the Assessment and Module Summary feed this page.

### Module 1 Introduction

1. **[Welcome to AWS Cloud Practitioner Essentials](01-welcome-to-aws-cloud-practitioner-essentials.md)**: the client-server model through the coffee shop, where cloud computing fits in it, and why you pay only for what you use.

### The AWS Cloud

2. **[What is Cloud Computing?](02-what-is-cloud-computing.md)**: how AWS started, the four-part definition of cloud computing, data centers, and the cloud-based, on-premises and hybrid deployment types.
3. **[Benefits of the AWS Cloud](03-benefits-of-the-aws-cloud.md)**: the six benefits, from trading fixed for variable expense to going global in minutes.
4. **[Introduction to AWS Global Infrastructure](04-introduction-to-aws-global-infrastructure.md)**: Regions, Availability Zones, and how they deliver high availability and fault tolerance.
5. **[The AWS Shared Responsibility Model](05-the-aws-shared-responsibility-model.md)**: security of the cloud versus security in the cloud, plus the duties that vary by service.

### Cloud in Real Life

6. **[Applying Cloud Concepts to Real Life Use Cases](06-applying-cloud-concepts-to-real-life-use-cases.md)**: a Seattle ecommerce company uses Regions, AZs and the shared responsibility split to expand to Ireland and Singapore.

## Key takeaways

- A client requests, and a server validates, processes and replies, and cloud computing is a version of this client-server model that supplies scalable servers over the internet.
- The course defines cloud computing in four parts, in order: (1) on-demand delivery (2) of IT resources (3) over the internet (4) with pay-as-you-go pricing.
- Resources can be provisioned when needed and deprovisioned when not, and billing stops right away.
- The three deployment types are cloud-based, on-premises and hybrid, and hybrid fits when some systems must stay in-house.
- The six benefits of the AWS Cloud are trade fixed expense for variable expense, benefit from massive economies of scale, stop guessing capacity, increase speed and agility, stop spending money running and maintaining data centers, and go global in minutes.
- A Region holds three or more Availability Zones, and each Availability Zone is an isolated part of one Region that houses one or more data centers.
- Spreading resources across multiple AZs, and across Regions for disaster protection, gives high availability and fault tolerance.
- AWS handles security of the cloud, including all physical data center security, while customers handle security in the cloud, including their OS patches, applications, data and client-side encryption.
- Some duties, such as server-side encryption and firewall configuration, shift between AWS and the customer depending on the service.

## What the assessment focuses on

The assessment has 8 questions, 2 of them multiple response (select two).

- How the client-server model relates to cloud computing: 1 question.
- What cloud computing is and how it affects fixed costs: 1 question.
- Picking a cloud deployment type for a scenario: 1 question.
- Matching a business goal to one of the six benefits of the AWS Cloud: 1 question.
- AWS Regions compared with Availability Zones: 1 question.
- Benefits of AWS Global Infrastructure (multiple response): 1 question.
- AWS Shared Responsibility Model, for physical infrastructure and for customer duties (one multiple response): 2 questions.

## Summary

The module builds one picture in layers.
The cloud is the client-server model offered as on-demand, internet-reached, pay-as-you-go resources, and that model is where the six business benefits come from.
AWS Global Infrastructure, with Regions made of Availability Zones made of data centers, is what lets those resources stay highly available and fault tolerant around the world.
The AWS Shared Responsibility Model then draws the security line: AWS protects that infrastructure, and customers protect what they build on it.
The ecommerce case shows all of these at work in a single design.

## Further reading

- [What is Cloud Computing?](https://aws.amazon.com/what-is-cloud-computing/?nc1=f_cc): AWS's introduction to cloud computing fundamentals.
- [AWS Shared Responsibility Model](https://aws.amazon.com/compliance/shared-responsibility-model/): AWS's page on how security duties are split.
- [Regions and Availability Zones](https://aws.amazon.com/about-aws/global-infrastructure/regions_az/): AWS's page listing every Region.
