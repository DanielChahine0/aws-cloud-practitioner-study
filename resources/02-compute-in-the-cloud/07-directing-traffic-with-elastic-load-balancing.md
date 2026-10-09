---
module: 2
lesson: 7
slug: directing-traffic-with-elastic-load-balancing
title: "Directing Traffic with Elastic Load Balancing"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 2: Compute in the Cloud, lesson: Directing Traffic with Elastic Load Balancing"
concepts:
  - elastic-load-balancing
  - load-balancing
  - load-balancing-routing-methods
  - elastic-load-balancing-with-auto-scaling
  - loose-coupling
  - high-availability
---

# Directing Traffic with Elastic Load Balancing

## Objectives

- Explain why spreading traffic and scaling are hard on AWS.
- Recognize what Elastic Load Balancing (ELB) adds.
- Describe how ELB and Amazon EC2 Auto Scaling split the work.

## Notes

### Uneven load

- Spreading a workload keeps any one resource from carrying it all, which boosts performance.
- When customers crowd one cashier while others idle, a host at the door who sends each arrival to the shortest line fixes it.
- On AWS a load balancer plays the host, so no EC2 instance sits idle or overloaded.

### Load balancers and ELB

- A load balancer receives incoming requests and decides which instance serves each one.
- Third-party load balancers run on AWS, but you then own their upkeep: upgrades, patches, maintenance and failover.
- Elastic Load Balancing (ELB) is AWS's managed option: set it up once and AWS does that upkeep.
- "Elastic" means it grows and shrinks with traffic at no extra hourly cost.
- It handles internal and external traffic and routes by Round Robin, Least Connections, IP Hash or Least Response Time (see Terms).
- In front of an Auto Scaling group it is the single entry point, spreading requests evenly over whatever instances exist.

### Decoupling tiers

- An ordering website has tiers such as ordering, production and storage.
- Without ELB, every front-end instance must track every back-end instance, which is unmanageable at hundreds or thousands.
- ELB is Regional, so front ends need only its single URL, and it passes each request to the back-end instance with the fewest outstanding requests.
- A new back-end instance just tells ELB it is ready, unseen by the front end, so each tier scales on its own and the architecture is decoupled.

### ELB and Amazon EC2 Auto Scaling

- They are separate services with complementary jobs: Auto Scaling sets how many instances run, and ELB spreads traffic across them.
- ELB never adds, removes or resizes instances itself.
- Together they keep performance consistent and availability high.

### Example: a hospital patient portal

- **Quiet start**: a few early patients, and existing servers cope.
- **Scaling out** (the course's tab says "scaling up"): at peaks like early mornings or before weekends, servers are added automatically, which [lesson 6](06-scaling-amazon-ec2.md) calls horizontal scaling.
- **Load balancing**: new requests go to a less busy server, so none is overwhelmed.
- ELB plus Auto Scaling keeps the portal reliable at peak demand.

## Visuals

- **ELB benefits flashcards**: traffic distribution, automatic scaling and simplified management.
- **Routing methods graphic**: one column per routing method.
- **Patient portal tabs**: quiet, scaled out, then balanced.

## Key takeaways

- ELB benefits: even traffic spread, automatic scaling as instances come and go, and less management thanks to decoupled tiers and AWS-run maintenance and failover.
- Auto Scaling changes the instance count, and ELB only routes traffic across those instances.
- ELB is a Regional single entry point that scales without raising hourly cost.

## Scenarios

- Front-end instances struggle to track changing back-end instances: put ELB between the tiers.

## Terms

- **Load balancer**: a component that distributes incoming requests across instances.
- **Elastic Load Balancing (ELB)**: AWS's managed, Regional service that spreads traffic across EC2 instances and other resources.
- **Round Robin**: routing that cycles through servers in order.
- **Least Connections**: routing toward the server with the fewest open connections.
- **IP Hash**: routing that pins each client IP address to one server.
- **Least Response Time**: routing toward the fastest-responding server to cut latency.
- **Tier**: one functional layer of an application, such as ordering or storage.
