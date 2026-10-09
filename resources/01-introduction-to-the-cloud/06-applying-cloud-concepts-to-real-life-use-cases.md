---
module: 1
lesson: 6
slug: applying-cloud-concepts-to-real-life-use-cases
title: "Applying Cloud Concepts to Real Life Use Cases"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 1: Introduction to the Cloud, lesson: Applying Cloud Concepts to Real Life Use Cases"
concepts:
  - aws-global-infrastructure
  - aws-regions
  - availability-zones
  - latency
  - high-availability
  - fault-tolerance
  - shared-responsibility-model
  - go-global-in-minutes
---

# Applying Cloud Concepts to Real Life Use Cases

## Objectives

- Follow one company's expansion to see Regions, AZs and the AWS Shared Responsibility Model working side by side.

## Notes

### Cloud in Real Life segments

- These recurring segments apply the deliberately simplified course concepts to realistic business problems, showing services combining like building blocks.

### Going global: Regions and Availability Zones

- The company, based in Seattle, Washington, wants customers worldwide, but the farther its servers are from them the higher the latency.
- It therefore hosts its application in Regions close to its main customer groups:
  - Europe: eu-west-1 in Ireland.
  - Asia: Singapore, ap-southeast-1 (remember the video's code, as the graphic's ap-southwest-1 conflicts with it).
- Each extra Region raises availability, and in Ireland it runs the same configuration in two AZs and fails over if one breaks, which the course calls designing for high availability and fault tolerance.
- Existing Regions let it reach new markets in minutes, not the months or years of building sites, and without big upfront capital, which especially helps startups.

### Shared responsibility in the same design

- AWS secures the Ireland data center and all physical infrastructure, so the company never picks data center door locks.
- The company's own focus is higher-level: encrypting and protecting its data, controlling access to its AWS resources, and setting up applications to comply with card-payment rules.
- This is security of the cloud versus security in the cloud in practice.

## Visuals

- Ecommerce expansion graphic: three markers tracing the company from Seattle to Ireland and Singapore, with Region choice, availability gains and the security split.

## Key takeaways

- Global infrastructure and shared responsibility work together in a real design, not as separate topics.
- Hosting in Regions near customers cuts latency.
- Several Regions plus at least two AZs with failover deliver high availability and fault tolerance.
- With physical security handled by AWS, the company focuses on data, access and compliant configuration.

## Scenarios

- Serving Europe from eu-west-1: picking Regions to cut latency.
- Opening in Singapore within minutes: go global in minutes.
- Mirroring the setup across two AZs: high availability and fault tolerance.
- The company encrypts its data while AWS guards the buildings: the AWS Shared Responsibility Model.

## Terms

- **Cloud in Real Life**: a recurring segment applying concepts to realistic cases.
- **Latency**: delay in answering requests, growing with distance from the infrastructure.
- **eu-west-1**: the Ireland Region code in this example.
- **ap-southeast-1**: the Singapore Region code given in the video.
