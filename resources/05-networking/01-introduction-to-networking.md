---
module: 5
lesson: 1
slug: introduction-to-networking
title: "Introduction to Networking"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 5: Networking, lesson: Introduction to Networking"
concepts:
  - aws-networking
  - amazon-vpc
  - subnets
  - public-subnets
  - private-subnets
  - availability-zones
  - network-diagrams
---

# Introduction to Networking

## Objectives

- Explain the purpose of a VPC.
- Explain the purpose of a subnet.
- Tell public subnets apart from private ones.

## Notes

### Networking and the coffee shop

- Networking links devices to share data and resources, and in AWS it means the infrastructure and services hosting your workloads.
- Coffee shop: cashiers face customers as public resources, while baristas stay private.

### Amazon VPC and subnets

- Amazon VPC gives you a logically isolated part of the AWS Cloud with a virtual network you design.
- Public resources can reach the internet and private ones cannot.
- Subnets organize resources, share some publicly (a website) and keep others isolated and private (a customer database).
- High availability from discrete data centers is an Availability Zone trait, not a subnet one.

### Reading network diagrams

- A diagram is a map and blueprint that shows at a glance whether a network is redundant, secure and scalable.
- Boxes nest from the outside in: AWS Cloud, Region (a separate geographic area picked for latency, compliance, data residency, services and cost), then the VPC as a solid box.
- The VPC is your isolated network, where you control resources and security.
- AZs sit side by side in a Region, each one or more data centers in separate facilities with redundant power and networking, so using several protects apps if one location fails.
- Subnets are IP address ranges that split the VPC, drawn solid when private and dashed when public (reached through an internet gateway).

## Visuals

- **Components timeline**: buildings feeding a padlocked cloud with a VPC, then the VPC split into two subnets.
- **Diagram slides**: the full map (a user entering via an internet gateway to two public and two private subnets over two AZs), then rebuilt layer by layer.

## Key takeaways

- A VPC is your own logically isolated network in the AWS Cloud.
- Subnets organize resources into public (internet-facing) and private (internal) ranges.
- Resilience to a failed location comes from multiple AZs, not from subnets.

## Scenarios

- A knowledge check practiced naming what subnets are for, apart from what AZs provide.

## Terms

- **Networking**: devices linked to exchange data and resources.
- **Amazon Virtual Private Cloud (Amazon VPC)**: an isolated slice of the AWS Cloud with a virtual network you define.
- **Subnet**: a block of VPC IP addresses used to group resources.
- **Public subnet**: a subnet reaching the internet through an internet gateway.
- **Private subnet**: a subnet hidden from the public internet.
- **Network diagram**: a picture of how users and apps reach your AWS resources.
