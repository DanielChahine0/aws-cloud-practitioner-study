---
module: 2
lesson: 5
slug: amazon-ec2-pricing
title: "Amazon EC2 Pricing"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 2: Compute in the Cloud, lesson: Amazon EC2 Pricing"
concepts:
  - on-demand-instances
  - savings-plans
  - reserved-instances
  - spot-instances
  - dedicated-hosts
  - dedicated-instances
  - capacity-reservations
  - reserved-instance-flexibility
---

# Amazon EC2 Pricing

## Objectives

- Compare the ways to pay for Amazon EC2.
- Choose a pricing model to fit a workload.
- Describe how Capacity Reservations work and how RI discounts flex.

## Notes

### Options at a glance

| Option | Commitment | Max discount | Best for |
| --- | --- | --- | --- |
| On-Demand | None | None | New, unknown or test workloads |
| Savings Plans | $/hour spend, 1 or 3 years | 72% | Steady, critical use, incl. Fargate, Lambda, SageMaker AI |
| Reserved Instances | 1 or 3 years, one family and Region | 75% | Steady-state, predictable use |
| Spot Instances | None, AWS can reclaim | 90% | Batch and other interruptible jobs |
| Dedicated Hosts | A whole physical server | Pricier than RIs | Compliance, security or licensing needs |
| Dedicated Instances | Hardware only for your account | Not stated | Isolation without server control |

### Commitments and flexibility

- On-Demand bills per hour or second, by instance type and OS, and is where most customers learn their baseline usage.
- Savings Plans and RIs both accept all upfront, partial upfront or no upfront payment.
- A Savings Plan applies whatever the Region, tenancy, OS, family or size, while an RI stays within its family and Region.
- Critical, always-on workloads that want dependable capacity and a predictable bill fit Savings Plans.
- RI flexibility: the discount flows automatically to other sizes in the family, by instance size footprint, and across the Region's AZs, aiding distribution and fault tolerance.

### Spot, isolation and reservations

- AWS warns two minutes before reclaiming a Spot Instance, so the job can save progress and resume later.
- A Dedicated Host gives control over instance placement and resource allocation, which helps with compliance and with licensing such as Windows or SQL Server.
- Dedicated Instances are isolated from other accounts, though AWS picks the server, so they sit outside the [multi-tenant](01-introduction-to-amazon-ec2.md) model while keeping shared-infrastructure savings.
- Amazon EC2 Capacity Reservations hold capacity in one AZ for critical workloads, billed at the On-Demand rate even when unused.
- The course also says you pay only for the instances you run, without squaring this with the charge for unused reservations.

## Visuals

- **Pricing flashcards**: one card per model.
- **Dedicated Host versus Dedicated Instance graphic**: a whole machine against a dedicated slice of one.
- **Cost optimization accordion**: Savings Plans, Capacity Reservations and RI flexibility.

## Key takeaways

- Match the model to the usage: unknown means On-Demand, steady means Savings Plans or RIs, and interruptible but never critical means Spot.
- Savings Plans flex across families, Regions and serverless services, and RIs do not.
- Dedicated Hosts cost more than RIs, so use them only when you need server control.

## Scenarios

- Steady usage across EC2, Fargate and Lambda: one Savings Plan.
- Isolation from other customers without choosing servers: Dedicated Instances.
- A critical launch needing guaranteed capacity in one AZ: a Capacity Reservation.

## Terms

- **On-Demand Instances**: pay-while-running compute with no commitment.
- **Savings Plans**: discounts for committing to steady hourly compute spend.
- **Reserved Instances (RIs)**: discounts for a 1- or 3-year term in one family and Region.
- **Spot Instances**: discounted spare capacity that AWS can reclaim.
- **Dedicated Hosts**: whole physical servers reserved for one customer.
- **Dedicated Instances**: instances on hardware dedicated to one account.
- **Amazon EC2 Capacity Reservations**: capacity held in one AZ at On-Demand rates.
- **Instance size footprint**: the measure for applying an RI discount across sizes in a family.
- **AWS Fargate**: a serverless compute option, see [module 3](../03-exploring-compute-services/03-containers-and-orchestration-on-aws.md).
- **AWS Lambda**: a serverless compute option, see [module 3](../03-exploring-compute-services/02-aws-lambda.md).
