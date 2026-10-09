---
module: 3
slug: exploring-compute-services
title: "Module 3: Exploring Compute Services"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 3: Exploring Compute Services"
lessons: 4
assessment_questions: 8
---

# Module 3: Exploring Compute Services

## What this module covers

This module looks past Amazon EC2 at the full spectrum of AWS compute, from unmanaged to managed to serverless.
It covers AWS Lambda for event-driven code, containers with the AWS services that store, orchestrate and host them, and four purpose-built services for specific needs.
The goal is to pick the service whose balance of control and convenience fits each workload.

## Lessons

### Module 3 Introduction

1. **[Introduction to Serverless Computing](01-introduction-to-serverless-computing.md)**: unmanaged, managed and serverless services, and who is responsible for what.

### AWS Serverless, Containers, and Solutions Overview

2. **[AWS Lambda](02-aws-lambda.md)**: event-driven functions, triggers, runtimes, millisecond billing and the 15-minute limit.
3. **[Containers and Orchestration on AWS](03-containers-and-orchestration-on-aws.md)**: containers versus VMs, Amazon ECR, Amazon ECS, Amazon EKS and AWS Fargate.
4. **[Additional Compute Services](04-additional-compute-services.md)**: AWS Elastic Beanstalk, AWS Batch, Amazon Lightsail and AWS Outposts.

## Key takeaways

- Unmanaged EC2 leaves the OS and apps to you, managed services shift operations to AWS, and serverless hides servers entirely.
- In serverless, AWS owns provisioning, scaling, availability and maintenance, while you own your code and its permissions.
- Lambda runs code on triggers, scales automatically, bills per millisecond of compute and caps each run at 15 minutes.
- Lambda is a poor fit for long jobs, for web servers that need OS-level control and for hosting databases.
- Containers bundle an app with everything it needs, so it behaves the same in every environment and starts faster than a VM.
- ECR stores images securely, ECS or EKS orchestrates them, and EC2 or Fargate is where they actually run.
- Pick EKS when you want Kubernetes, which suits large or hybrid setups, and ECS when you want a streamlined, integrated orchestrator.
- Fargate is the serverless way to host containers, while EC2 gives full control at the cost of managing instances.
- Elastic Beanstalk deploys web apps for you, AWS Batch handles large parallel jobs, Lightsail offers cost-effective hosting at a predictable monthly price, and Outposts brings AWS on premises.

## What the assessment focuses on

The assessment has 8 questions.

- Serverless service model and the customer's remaining responsibility (the code): 2 questions.
- When AWS Lambda fits (short, event-driven work) and when it does not (long jobs, web servers needing OS control, databases): 1 question.
- Lambda as a wrong option to rule out: 4 more questions.
- Containers for making an app run the same in every environment: 1 question.
- Container orchestration with Amazon ECS or Amazon EKS: 2 questions.
- Amazon ECR as the secure image store: 1 question, with ECR also given as background in 1 more.
- AWS Fargate for running containers without servers: 1 question.
- AWS Batch for large, parallel, scheduled compute jobs: 1 question.
- Amazon Lightsail for simple, low-traffic, cost-effective hosting: 1 question.
- Amazon EC2 as the wrong choice when servers should not be managed or container orchestration is needed: 3 questions.
- Other service models (unmanaged, on premises, hybrid cloud) as wrong choices next to serverless: 1 question.
- Elastic Beanstalk, Lightsail, Fargate and AWS Batch as wrong choices in the AWS Batch and Lightsail questions: 2 questions.

## Summary

- Picking compute is a trade between control and convenience: EC2 when you want to run everything yourself, fully managed Lambda or Fargate when you would rather not.
- Containers fixed apps behaving differently from one environment to the next, and ECS and EKS take over the work of running and scaling them.
- Four purpose-built services fill specific gaps: Lightsail for simple hosting, AWS Batch for big batch workloads, Elastic Beanstalk for web app deployment and Outposts for hybrid cloud.

## Further reading

- [Containers on AWS](https://aws.amazon.com/containers/services/): landing page mapping every AWS container offering to its role as registry, orchestrator or compute.
- [Amazon Elastic Container Registry](https://aws.amazon.com/ecr/): product page for the managed, secure home of your container images.
- [Amazon Elastic Container Service](https://aws.amazon.com/ecs/): product page for ECS, the streamlined, integrated orchestrator from lesson 3.
- [Amazon Elastic Kubernetes Service](https://aws.amazon.com/eks/): product page for managed Kubernetes, usable both on AWS and on premises.
- [AWS Fargate](https://aws.amazon.com/fargate/): product page for the serverless engine that runs ECS and EKS containers.
- [AWS Elastic Beanstalk](https://aws.amazon.com/elasticbeanstalk/): product page for hands-off web app deployment.
- [AWS Batch](https://aws.amazon.com/batch/): product page for the managed batch job service.
- [What is Amazon Lightsail?](https://docs.aws.amazon.com/lightsail/latest/userguide/what-is-amazon-lightsail.html): user guide intro covering Lightsail's servers, containers, databases and predictable pricing.
- [What is AWS Outposts?](https://docs.aws.amazon.com/outposts/latest/server-userguide/what-is-outposts.html): user guide intro to placing AWS infrastructure in your own locations when data must be processed locally with low latency.
- [Choosing a modern application strategy](https://docs.aws.amazon.com/decision-guides/latest/modern-apps-strategy-on-aws-how-to-choose/modern-apps-strategy-on-aws-how-to-choose.html): AWS decision guide for choosing between serverless and Kubernetes based on how your teams and workloads operate.
