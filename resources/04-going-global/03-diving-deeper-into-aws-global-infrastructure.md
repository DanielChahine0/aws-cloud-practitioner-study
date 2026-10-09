---
module: 4
lesson: 3
slug: diving-deeper-into-aws-global-infrastructure
title: "Diving Deeper into AWS Global Infrastructure"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 4: Going Global, lesson: Diving Deeper into AWS Global Infrastructure"
concepts:
  - high-availability
  - fault-tolerance
  - availability-zones
  - multi-az-deployment
  - multi-region-architecture
  - edge-locations
  - amazon-cloudfront
  - amazon-route-53
---

# Diving Deeper into AWS Global Infrastructure

## Objectives

- Explain the benefits of multi-Region and multi-AZ deployments.
- Say what an edge location is.
- Tell Regions, AZs and edge locations apart.

## Notes

### Redundancy for uptime

- A redundant architecture replicates resources across layers of AWS infrastructure so backups take over, for long-term stability and near-zero downtime.
- With high availability and fault tolerance, resources keep working when one hosting location fails.
- **Multi-AZ** covers one AZ failing: the app moves to a backup AZ you set up, with quicker disaster recovery, continuity, lower latency and compliance as bonuses.
- **Multi-Region** goes one step further and survives a whole Region going down.
- The infrastructure also brings agility and elasticity (see Terms).

### Edge locations

- The Amazon Global Edge Network brings AWS services and content to users beyond standard Regions with low latency.
- Edge locations sit apart from Regions, in spots like Atlanta and Shanghai, and cache data, video and apps for higher transfer speeds and lower latency.
- Regions run most AWS services; edge locations are not for heavy compute, databases or redundant storage.
- Amazon CloudFront, a content delivery network (CDN) and cache, uses them to serve images, video, apps and APIs near users.
- They also host AWS Global Accelerator and Amazon Route 53, a Domain Name System (DNS) service that routes users to internet apps by turning URLs into IP addresses.
- For more speed than a Region plus CloudFront, AWS Outposts runs AWS services on premises.

### Regions vs AZs vs edge locations

| Layer | Made of | Role |
|---|---|---|
| Region | Data centers in one geographic area, split into three or more AZs | Scalable, redundant hosting for most AWS services |
| AZ | One or more data centers with their own power, networking and connectivity | High availability and fault tolerance, isolated from failures elsewhere |
| Edge location | A caching site outside any Region or AZ | Fast content delivery for the AWS CDN |

## Visuals

- **Key elements of AWS Global Infrastructure**: three markers placing AZs inside Regions and edge locations apart, as the table shows.

## Key takeaways

- Multi-AZ and multi-Region designs give high availability, fault tolerance and low latency for end users.
- A Region has three or more AZs, and each AZ has one or more data centers.
- Edge locations sit outside Regions and cache content for lower latency and faster transfers.

## Scenarios

- AZ or Region outage -> switch to a configured backup AZ or another Region.
- Slow-loading images in the shop's app -> CloudFront.
- The knowledge check practised matching each layer to its definition.

## Terms

- **High availability**: Running without failing, riding out component failures without significant downtime.
- **Fault tolerance**: Staying operational when a hosting location has an outage.
- **Agility**: Adapting fast to change, such as by redeploying services quickly.
- **Elasticity**: Scaling resources up or down automatically with demand.
- **Amazon CloudFront**: The AWS content delivery network (CDN), running on edge locations.
- **Amazon Route 53**: The AWS DNS service that maps URLs to IP addresses.
- **AWS Outposts**: Running AWS services on premises.
