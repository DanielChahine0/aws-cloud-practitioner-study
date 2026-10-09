---
module: 5
lesson: 7
slug: global-architectures
title: "Global Architectures"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 5: Networking, lesson: Global Architectures"
concepts:
  - vpn
  - aws-direct-connect
  - direct-connect-failover
  - virtual-private-gateway
  - multi-region-architecture
  - amazon-route-53
  - route-53-routing-policies
  - amazon-cloudfront
---

# Global Architectures

## Objectives

- Recognize when a VPN fits and when Direct Connect fits.
- Describe how a VPC uses a VPN connection and Direct Connect together.
- Describe how CloudFront and Route 53 support a multi-Region architecture.

## Notes

### Beyond one VPC

- Global firms often run many accounts, Regions and VPCs, even hybrid setups, and these diagrams are for context, not mastery.

### VPN or Direct Connect

- The common starting point is a VPC reached by VPN, an encrypted tunnel over the public internet that remote staff often use for sensitive data in AWS.
- Weak spots: it shares the local internet link, so big data loads can drag, and strict compliance or regulatory needs may favor Direct Connect.
- Direct Connect runs traffic from the data center via a Direct Connect location and a virtual private gateway into the VPC on a private dedicated path.
- Payoff: faster bulk transfers, better app performance and safer data movement.
- Rule of thumb: VPN for flexible secure remote access, modest transfers or no need for a dedicated line, and Direct Connect for big on-premises-to-AWS transfers needing far more bandwidth.

### Using both: failover and aggregation

- Direct Connect is a physical cable that can be cut, so a VPN often stands by as its failover, or a second Direct Connect line does.
- Several connections can also be bundled for more total (aggregate) bandwidth.
- Course example: customer clients and servers go through a content router or firewall and several Direct Connect links to a virtual private gateway, reaching private VPC resources securely.

### Content across Regions

- For worldwide users, CloudFront serves content from global edge locations, and Route 53 latency-based routing aims for the lowest latency by sending each user to the closest Region.
- Flow: the custom domain hits a Route 53 DNS record, a routing policy picks the nearest Region, the user goes to its CloudFront edge location, and that location gets content from the Region's origin server.
- The site spans several AZs for high availability, with an Application Load Balancer in front of an Auto Scaling group of EC2 instances.

## Visuals

- **Direct Connect failover diagram**: one customer network tied to a two-subnet VPC by several Direct Connect links, for redundancy and aggregate bandwidth.
- **Multi-Region delivery diagram**: Route 53, CloudFront, a load balancer and an Auto Scaling group in sequence, for reaching the closest Region.

## Key takeaways

- A VPN is a flexible encrypted tunnel for remote access and small transfers, but it shares bandwidth.
- Direct Connect is a dedicated private line for large transfers, consistent performance and compliance.
- A VPN or a second Direct Connect line can provide failover, and multiple connections add bandwidth.
- Route 53 latency-based routing plus CloudFront edge locations give low latency across Regions.

## Scenarios

- Remote employees need sensitive data in AWS: a VPN connection.
- A Direct Connect cable is cut: fail over to a VPN or a second Direct Connect line.
- Offices worldwide need fast content: CloudFront with Route 53.
- A knowledge check practiced choosing a dedicated, compliant link for heavy, sensitive data.

## Terms

- **Multi-Region architecture**: a design spreading an application across several Regions and VPCs.
- **Failover**: switching to a backup connection when the primary one fails.
- **Aggregate bandwidth**: the combined capacity of several Direct Connect connections used together.
- **Latency-based routing**: a Route 53 policy that aims to give users the lowest latency, here by sending them to the closest Region.
- **Origin server**: the Region's server that a CloudFront edge location pulls content from.
