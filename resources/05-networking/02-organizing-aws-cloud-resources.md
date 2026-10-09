---
module: 5
lesson: 2
slug: organizing-aws-cloud-resources
title: "Organizing AWS Cloud Resources"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 5: Networking, lesson: Organizing AWS Cloud Resources"
concepts:
  - amazon-vpc
  - subnets
  - internet-gateway
  - virtual-private-gateway
  - vpn
  - aws-direct-connect
---

# Organizing AWS Cloud Resources

## Objectives

- Explain the role of a virtual private gateway.
- Name the core building blocks of a VPC.
- Explain the role of an internet gateway.

## Notes

### Grouping resources in a VPC

- A VPC is your private network in AWS, with a private IP range you choose for resources such as EC2 instances and load balancers.
- Resources go into specific subnets, chunks of the VPC's IP addresses that, together with networking rules, make them public or private.
- Public suits internet-facing items like a website or load balancer, and private suits internal items like an HR app or backend database.
- Without boundaries, traffic would flow unchecked among the millions of resources AWS customers run.

### Amazon VPC benefits

- **Increased security**: protect and watch connections, filter traffic and limit who can reach instances.
- **Control**: you decide where resources sit, how they connect and how they are secured.
- **Convenience**: less time spent building, running and checking the network than on premises.

### Internet gateway

- An internet gateway joins a VPC to the internet, and you must attach one before public traffic can flow in or out.
- Attaching alone is not enough, since public subnets also need a route to it ([Amazon VPC Demo](05-amazon-vpc-demo.md)).
- Coffee shop: it is the front door, and without it no customer can get in.
- The assessment adds that it is a managed, highly available VPC part that scales horizontally and carries traffic both ways.

### Virtual private gateway and VPN

- A VPC with only private resources skips the internet gateway and uses a virtual private gateway, which admits traffic only from an approved network.
- The internet is like the public road to the coffee shop, and a VPN is an encrypted tunnel along it that hides your traffic from ISPs and snoopers.
- The virtual private gateway is the AWS-side piece that lets this protected traffic into the VPC from your own data center or company network.
- Coffee shop: the shop now sits inside a corporate office building, and you must badge in before buying coffee.

### VPN versus AWS Direct Connect

- Trade-off: a VPN is encrypted but shares a network with others, so heavy use can slow it.
- AWS Direct Connect gives you your own private fiber line from the data center to the VPC, adding steady high performance to security.
- A local Direct Connect partner installs the line, which also helps with compliance and bandwidth limits.
- Course analogy: a VPN is like reaching the shop through a crowded shared office tower, while Direct Connect is a private door straight in.

### Telling the acronyms apart

- **VPC**: draws a boundary around your resources.
- **Virtual private gateway**: lets protected traffic enter the VPC.
- **VPN**: encrypts traffic against interception or monitoring.

## Visuals

- **Organizing resources image**: a company sending traffic into a VPC of AWS resources inside a boundary.
- **VPC benefits image**: icons for security, time savings and control.
- **Internet gateway image**: a client reaching EC2 instances through the gateway attached to the VPC.
- **Virtual private gateway image**: oddly, an internet gateway picture (a client, the gateway, one subnet of three EC2 instances).
- **Acronym flashcards**: VPC, virtual private gateway and VPN cards for separating look-alike names.

## Key takeaways

- Subnets plus networking rules decide whether resources are public or private.
- Amazon VPC brings security, control and convenience.
- An internet gateway is required for any internet traffic to reach the VPC.
- A virtual private gateway with a VPN gives an encrypted link that only approved private networks can use.
- VPNs share network capacity, while Direct Connect gives a dedicated line for steady performance, bandwidth and compliance.

## Scenarios

- A knowledge check practiced the secure, isolated data center link: a virtual private gateway and VPN in front of private subnets.
- Why the other paths fail: an internet gateway adds no protection, public subnets isolate nothing, and a VPC without subnets cannot isolate resources at all.

## Terms

- **Internet gateway**: the component that connects a VPC to the internet.
- **Virtual private gateway**: the AWS-side component that lets protected traffic from approved networks into a VPC.
- **Virtual private network (VPN)**: an encrypted tunnel across the internet that hides your traffic.
- **AWS Direct Connect**: a dedicated private physical link between your data center and AWS.
