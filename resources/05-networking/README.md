---
module: 5
slug: networking
title: "Module 5: Networking"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 5: Networking"
lessons: 7
assessment_questions: 14
---

# Module 5: Networking

## What this module covers

This module explains how AWS networks are built, starting with Amazon VPC, subnets and the gateways that let traffic in or keep it out.
It compares ways to connect remote users and on-premises sites to AWS, from Client VPN and Site-to-Site VPN to dedicated AWS Direct Connect lines, and shows how PrivateLink gives a VPC private access to services as if they were inside it.
It then shows how security groups and network ACLs filter traffic, walks through building a VPC in the console, and finishes with edge services (Route 53, CloudFront, Global Accelerator) and real multi-Region designs.

## Lessons

### Module 5 Introduction

1. **[Introduction to Networking](01-introduction-to-networking.md)**: what VPCs and public and private subnets are, and how to read AWS network diagrams.

### Network Components in the AWS Cloud

2. **[Organizing AWS Cloud Resources](02-organizing-aws-cloud-resources.md)**: VPC benefits, internet gateways, virtual private gateways with VPNs, and a first look at Direct Connect.
3. **[More Ways to Connect to the AWS Cloud](03-more-ways-to-connect-to-the-aws-cloud.md)**: Client VPN, Site-to-Site VPN, PrivateLink and Direct Connect, plus Transit Gateway, NAT gateway and API Gateway.
4. **[Subnets, Security Groups, and Network Access Control Lists](04-subnets-security-groups-and-network-access-control-lists.md)**: how packets are filtered by stateless network ACLs and stateful security groups, and who owns that job.
5. **[Amazon VPC Demo](05-amazon-vpc-demo.md)**: a console walkthrough that sets up a VPC whose public and private subnets span two AZs, then gives the public ones internet access.
6. **[Global Networking](06-global-networking.md)**: edge networking, DNS, Route 53, CloudFront and Global Accelerator.

### Cloud in Real Life

7. **[Global Architectures](07-global-architectures.md)**: choosing VPN or Direct Connect, failover between them, and multi-Region delivery with Route 53 and CloudFront.

## Key takeaways

- Amazon VPC gives you a logically isolated network in AWS, and subnets split it into public and private IP address ranges.
- An internet gateway is the public way into a VPC, while a virtual private gateway admits encrypted VPN traffic only from approved networks.
- Client VPN serves remote workers, Site-to-Site VPN serves offices and data centers, PrivateLink gives a VPC private access to services and other VPCs, and Direct Connect gives a dedicated, high-bandwidth line.
- VPNs ride shared networks and can slow under load, so Direct Connect suits large transfers, steady performance and compliance, often with a VPN kept as failover.
- Network ACLs filter at the subnet edge, are stateless and support allow and deny rules, while security groups filter per instance, are stateful and use allow rules only.
- Under the AWS Shared Responsibility Model, configuring network ACLs and security groups is the customer's job.
- A subnet becomes public only when its route table sends traffic to an attached internet gateway.
- DNS turns domain names into IP addresses, and Route 53 adds routing policies, health checks and domain registration on top.
- CloudFront caches content at edge locations near users, and Global Accelerator gives static IPs and health-aware routing over the AWS global network with fast failover.

## What the assessment focuses on

The module assessment has 14 questions, one per concept below.

- **Networking in the AWS Cloud**: 1 question, on the basic definition of networking.
- **Availability Zones**: 1 question, on their role in availability and fault tolerance.
- **Virtual private gateway**: 1 question, on securing a hybrid link between a data center and a VPC.
- **Private subnets**: 1 question, on isolating resources from internet users.
- **Security groups**: 1 question, on instance-level, fine-grained traffic rules.
- **Network ACLs**: 1 question, on broad subnet-level control with allow and deny rules.
- **AWS Shared Responsibility Model**: 1 question, on who secures network traffic using security groups and network ACLs (also relevant to the two topics above, but counted only here).
- **AWS Site-to-Site VPN**: 1 question, on encrypted, cost-conscious links between sites and AWS.
- **AWS Client VPN**: 1 question, on managed, scalable access for a remote workforce.
- **AWS Direct Connect**: 1 question, on a dedicated link with more bandwidth and consistency.
- **DNS**: 1 question, on its core purpose.
- **Amazon CloudFront**: 1 question, on low-latency content delivery to a global audience.
- **Amazon Route 53**: 1 question, on managing domains and routing traffic.
- **AWS Global Accelerator**: 1 question, on health-aware routing with fast failover across application locations.

## Summary

The recap starts with the core building blocks: a VPC to keep your workload isolated, plus gateways, security groups and network ACLs to control what moves in and out.
For reaching AWS from your own sites, you can pick a VPN, which encrypts traffic across the shared public internet, or Direct Connect, a private connection nobody else uses.
Finally, edge services bring content and lookups close to users, with Route 53 handling DNS and CloudFront keeping cached copies near consumers.

## Further reading

- [Amazon Virtual Private Cloud](https://aws.amazon.com/vpc/): the service for provisioning an isolated network section of the AWS Cloud.
- [Subnet](https://docs.aws.amazon.com/vpc/latest/userguide/configure-subnets.html): configuring public and private subnets in a VPC.
- [Internet gateway](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html): the component linking a VPC to the internet.
- [Virtual private gateway](https://docs.aws.amazon.com/vpn/latest/s2svpn/how_it_works.html#VPNGateway): the AWS-side entry for protected traffic from approved networks.
- [AWS Client VPN](https://aws.amazon.com/vpn/client-vpn/): a managed, elastic VPN for remote workers.
- [AWS Site-to-Site VPN](https://aws.amazon.com/vpn/site-to-site-vpn/): encrypted links from data centers and branch offices to AWS.
- [AWS PrivateLink](https://docs.aws.amazon.com/vpc/latest/privatelink/what-is-privatelink.html): private connections from a VPC to services as if they were local.
- [AWS Direct Connect](https://aws.amazon.com/directconnect/): a dedicated private line from your data center into a VPC.
- [Network Access Control List (network ACL)](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html): stateless allow and deny rules at the subnet level.
- [Security groups](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html): stateful traffic rules at the instance level.
- [Domain Name System (DNS)](https://aws.amazon.com/route53/what-is-dns/): how domain names become IP addresses.
- [Amazon Route 53](https://aws.amazon.com/route53/): a DNS service that also offers advanced routing policies, health checks and domain registration.
- [Amazon CloudFront](https://aws.amazon.com/cloudfront/): a CDN delivering content from edge locations quickly and with little delay.
- [AWS Global Accelerator](https://aws.amazon.com/global-accelerator/): routing over the AWS global network for better availability and performance.
- [AWS Transit Gateway](https://aws.amazon.com/transit-gateway/): a hub that interconnects VPCs and on-premises networks.
- [NAT Gateway](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html): lets private-subnet instances start connections to outside services while blocking connections started from outside.
- [API Gateway](https://aws.amazon.com/api-gateway/): a service for building and running APIs at any scale, able to take on call volumes in the hundreds of thousands at once.
