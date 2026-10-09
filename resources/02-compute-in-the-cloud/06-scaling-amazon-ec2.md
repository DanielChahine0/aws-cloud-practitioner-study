---
module: 2
lesson: 6
slug: scaling-amazon-ec2
title: "Scaling Amazon EC2"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 2: Compute in the Cloud, lesson: Scaling Amazon EC2"
concepts:
  - scalability
  - elasticity
  - horizontal-scaling
  - vertical-scaling
  - high-availability
  - amazon-ec2-auto-scaling
  - dynamic-scaling
  - predictive-scaling
---

# Scaling Amazon EC2

## Objectives

- Recognize scalability and elasticity and how they differ on AWS.
- Describe how AWS lets a business match compute capacity to shifting demand.

## Notes

### Why fixed capacity fails

- A site that keeps timing out is usually getting more requests than it can serve.
- Demand has busy and quiet seasons, and new businesses cannot predict peaks.
- Buying for the peak wastes money and buying for the average leaves customers waiting, so capacity should track demand hour by hour.
- The coffee stands for any instance output, like web responses.

### Redundancy and high availability

- One instance in a role is a single point of failure: lose the only order-taker and the business stops.
- With a second, programmatically created copy, one keeps serving while a replacement for the failed one spins up.
- Back-end instances need the same redundancy, for a highly available system.
- Best practice is to spread redundant instances over multiple AZs in a Region, so the rest carry the load if one zone has trouble.

### Scalability versus elasticity

- Scalability looks ahead: long-term capacity planning so a system can absorb more users or work by adding resources.
- Elasticity reacts in the moment: resources scale out automatically when demand spikes and back in when it falls, so each moment costs only what it needs.

### Scaling out versus scaling up

- **Scaling out (horizontal)**: more instances share the work in parallel.
- **Scaling up (vertical)**: give running instances more power.
- More power per instance does not always help, since a faster cashier cannot hurry an undecided customer, but extra cashiers serve more people at once.
- Each tier scales on its own, so order-takers can outnumber drink-makers while the back end has no backlog, and nothing is overprovisioned.
- After the rush, the surplus instances are scaled in.

### Amazon EC2 Auto Scaling

- It adds instances as demand and key metrics rise and decommissions them as demand falls, keeping the desired number running every minute.
- Amazon CloudWatch collects the performance, latency and other metrics that trigger these changes.
- **Dynamic scaling** responds to demand in real time, and **predictive scaling** schedules capacity ahead of expected demand.
- It improves availability, and you pay only for the EC2 instances it runs, while they run.

### Auto Scaling groups

- An Auto Scaling group is a set of EC2 instances that scales in and out within three settings.
- **Minimum capacity**: the floor, launched as soon as the group is created (4 in the example).
- **Desired capacity**: the count it aims to hold for the current load, defaulting to the minimum if unset (6).
- **Maximum capacity**: the ceiling that prevents over-scaling and caps cost (12), with scaling between minimum and maximum.

## Visuals

- **Scalability and elasticity timeline**: an instance growing (up) beside instances multiplying (out), then capacity flexing with demand.
- **Auto Scaling group tabs**: one group drawn at minimum (4), desired (6) and maximum (12) capacity.

## Key takeaways

- Scalability is planned, long-term growth, while elasticity is automatic, real-time adjustment.
- Redundant instances across multiple AZs remove single points of failure.
- Auto Scaling uses CloudWatch metrics to add and remove instances, dynamically or predictively.
- An Auto Scaling group stays between its minimum and maximum and aims for its desired capacity.

## Scenarios

- A new store cannot predict its traffic spikes: let Auto Scaling follow demand.
- An application runs in a single AZ: add redundant instances in another AZ.
- More customers arrive, but a bigger server cannot serve any one faster: scale out.

## Terms

- **Scalability**: the ability to take on more load by adding resources, planned long term.
- **Elasticity**: automatic, real-time growing and shrinking of resources with demand.
- **Scaling out (horizontal scaling)**: adding instances to work in parallel.
- **Scaling up (vertical scaling)**: making a running instance more powerful.
- **Scaling in**: removing instances as demand falls.
- **High availability**: staying in service with no single point of failure.
- **Amazon EC2 Auto Scaling**: a service that adds and removes EC2 instances automatically with demand.
- **Dynamic scaling**: Auto Scaling that reacts in real time.
- **Predictive scaling**: Auto Scaling that schedules capacity ahead of anticipated demand.
- **Auto Scaling group**: EC2 instances scaled together between set limits.
- **Amazon CloudWatch**: the metrics service behind scaling decisions, see [module 10](../10-monitoring-compliance-and-governance/03-amazon-cloudwatch.md).
