---
module: 2
slug: compute-in-the-cloud
title: "Module 2: Compute in the Cloud"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 2: Compute in the Cloud"
lessons: 8
assessment_questions: 14
---

# Module 2: Compute in the Cloud

## What this module covers

This module introduces Amazon EC2 as the core AWS compute service, from what an instance is and how multi-tenancy works to launching one from an AMI.
It walks through the instance families, the three ways to call AWS APIs, and the EC2 pricing options with their discounts and trade-offs.
It then shows how to keep applications available and efficient with Amazon EC2 Auto Scaling, Elastic Load Balancing, and decoupled messaging through Amazon SQS, Amazon SNS and Amazon EventBridge.

## Lessons

### Module 2 Introduction

1. **[Introduction to Amazon EC2](01-introduction-to-amazon-ec2.md)**: what cloud compute is, EC2 versus on-premises servers, stopping versus terminating, multi-tenancy and how to launch, connect to and use an instance.

### Compute in the Cloud

2. **[Amazon EC2 Instance Types](02-amazon-ec2-instance-types.md)**: the five instance families, how to tell them apart and how to pick a size.
3. **[How to Provision AWS Resources](03-how-to-provision-aws-resources.md)**: calling AWS APIs through the console, the AWS CLI and the AWS SDK, plus shared responsibility for EC2.
4. **[Demo: Launching an Amazon EC2 Instance](04-demo-launching-an-amazon-ec2-instance.md)**: the settings used to launch a web server and what an AMI does and does not do.
5. **[Amazon EC2 Pricing](05-amazon-ec2-pricing.md)**: a side-by-side comparison of On-Demand, Savings Plans, Reserved Instances, Spot Instances, Dedicated Hosts and Instances, and Capacity Reservations.

### Auto Scaling and Load Balancing

6. **[Scaling Amazon EC2](06-scaling-amazon-ec2.md)**: scalability versus elasticity, scaling up versus out, high availability and Auto Scaling groups.
7. **[Directing Traffic with Elastic Load Balancing](07-directing-traffic-with-elastic-load-balancing.md)**: how ELB spreads traffic, its routing methods and how it pairs with Auto Scaling.
8. **[Messaging and Queuing](08-messaging-and-queuing.md)**: tight versus loose coupling, microservices, and the roles of Amazon SQS, Amazon SNS and Amazon EventBridge.

### Module 2 Conclusion

- Course lessons 9 (Assessment) and 10 (Module Summary) have no note files of their own, so the 8 lesson files cover course lessons 1 to 8, and lessons 9 and 10 feed the two sections below.

## Key takeaways

- Amazon EC2 rents virtual servers on demand, faster, cheaper and more flexibly than owned hardware, and only running instances are billed.
- Multi-tenancy lets isolated instances share a physical host, kept apart by a hypervisor that AWS manages.
- Each instance family targets a bottleneck: balance (general purpose), CPU (compute optimized), memory (memory optimized), accelerators (accelerated computing) or local disk (storage optimized).
- Every AWS action is an API call made through the console, the AWS CLI or the AWS SDK, and for unmanaged EC2 the customer handles the guest OS, updates and security groups.
- An AMI is a configuration template rather than a backup, and launching from one AMI keeps instances identical.
- On-Demand needs no commitment, Savings Plans (up to 72%) and Reserved Instances (up to 75%) reward 1- or 3-year commitments, and Spot Instances (up to 90%) suit interruptible work only.
- Dedicated Hosts give a whole server with placement control, while Dedicated Instances give isolation from other accounts without a choice of server.
- Scalability is long-term growth planning and elasticity is automatic real-time adjustment, which Amazon EC2 Auto Scaling delivers within an Auto Scaling group's minimum and maximum.
- Elastic Load Balancing routes traffic across the instances Auto Scaling provides, and redundant instances across AZs give high availability.
- Loose coupling isolates failures: Amazon SQS queues messages for later, Amazon SNS pushes them to subscribers at once, and Amazon EventBridge routes events between services.

## What the assessment focuses on

The module assessment has 14 questions.

- Matching workloads to instance families (accelerated computing, general purpose and compute optimized): 3 questions.
- Choosing among EC2 pricing options (On-Demand, Reserved Instances, Savings Plans and Spot Instances): 3 questions.
- How cloud compute is provisioned and scaled on demand: 1 question.
- What multi-tenancy means for EC2: 1 question.
- The graphical way to work with AWS, the AWS Management Console: 1 question.
- The role of AMIs when scaling: 1 question.
- How Amazon EC2 Auto Scaling changes instance counts: 1 question.
- How Auto Scaling and Elastic Load Balancing divide their work: 1 question.
- How a loosely coupled system behaves when one component fails: 1 question.
- Choosing between Amazon SNS and Amazon SQS for notifications: 1 question.

## Summary

After this module you should be able to explain how Amazon EC2 and related cloud resources let applications grow with demand.
You should also be able to compare instance types and pricing options and pick the right mix for a given business.
Finally, you know which services manage traffic (Elastic Load Balancing and Amazon EC2 Auto Scaling) and which manage communication between components (Amazon SQS and Amazon SNS).

## Further reading

- [Compute on AWS](https://aws.amazon.com/products/compute): AWS's landing page for its range of cloud compute services.
- [AWS Compute Blog](https://aws.amazon.com/blogs/compute/): posts with news, how-tos and good practices across EC2, Lambda, ECS and other compute services.
- [AWS Compute Services](https://docs.aws.amazon.com/whitepapers/latest/aws-overview/compute-services.html): a detailed reference walking through each AWS compute service.
- [Hands-On Tutorials: Compute](https://aws.amazon.com/getting-started/hands-on/?awsf.getting-started-category=category%23compute&awsf.getting-started-content-type=content-type%23hands-on): guided exercises for newcomers who want practice with compute services.
- [Amazon EC2](https://aws.amazon.com/ec2/): the service page for EC2's resizable cloud servers.
- [Amazon EC2 Instance Types](https://aws.amazon.com/ec2/instance-types/): specs and use cases per type, for matching a type to compute, memory or storage needs.
- [Amazon EC2 Pricing](https://aws.amazon.com/ec2/pricing/): how On-Demand, Reserved and Spot pricing work, to choose by usage pattern.
- [Amazon EC2 Auto Scaling](https://aws.amazon.com/ec2/autoscaling/): the service page for growing and shrinking instance counts with demand.
- [Elastic Load Balancing](https://aws.amazon.com/elasticloadbalancing/): the service page for spreading application traffic over EC2 instances so apps survive failures.
- [Amazon Simple Notification Service](https://aws.amazon.com/sns/): the service page for pushing notifications to people or apps by text, email or mobile push.
- [Amazon Simple Queue Service](https://aws.amazon.com/sqs/): the service page for message queues that decouple application parts.
- [Amazon EC2 instance type naming conventions](https://docs.aws.amazon.com/ec2/latest/instancetypes/instance-type-names.html): how a type's name encodes its family and size, referenced in lesson 2.
- [What are Savings Plans?](https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html): the AWS user guide to Savings Plans, referenced in lesson 5.
- [EC2 On-Demand Capacity Reservations](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-capacity-reservations.html): the AWS guide to reserving compute capacity, referenced in lesson 5.
- [How Reserved Instance discounts are applied](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/apply_ri.html): how an RI discount spreads across sizes and zones, referenced in lesson 5.
