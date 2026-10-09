---
module: 3
lesson: 1
slug: introduction-to-serverless-computing
title: "Introduction to Serverless Computing"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 3: Exploring Compute Services, lesson: Introduction to Serverless Computing"
concepts:
  - unmanaged-services
  - managed-services
  - fully-managed-services
  - serverless-computing
  - shared-responsibility-model
  - amazon-ec2
  - coffee-shop-analogy
---

# Introduction to Serverless Computing

## Objectives

- Tell unmanaged, managed and serverless compute services apart.
- State what AWS and the customer each own with serverless compute.

## Notes

### Roadmap

- Serverless computing means AWS looks after the infrastructure under your app.
- Next: AWS Lambda, then Amazon EKS, Amazon ECS and AWS Elastic Beanstalk for easier containers and deployment.

### Amazon EC2: unmanaged

- EC2 virtual machines suit anything from a basic web server to high performance computing.
- You get fine control, but patching, scaling and the OS are yours while AWS runs the hardware.
- Per the AWS Shared Responsibility Model, AWS owns security of the cloud and you own security in the cloud.

### Managed services

- After you configure one, AWS keeps it running with no server management on your part.
- ELB, SNS and SQS are earlier examples.

### Coffee shop analogy

- Unmanaged is a high-end espresso machine: total control over beans, grind and knobs, plus all the upkeep.
- Managed is a pod machine: pop in a pod and press a button, trading customization for speed.
- Sometimes you want to play barista, and sometimes you just want fast coffee.

### Serverless (fully managed)

- Taking infrastructure management away entirely gave rise to serverless.
- The servers hosting your app are hidden and out of reach.
- AWS handles provisioning, maintenance, scaling and high availability.

### Picking a service

- Each step toward managed trades control for convenience, so pick what your app needs.

### Responsibility spectrum

- Unmanaged, like EC2: AWS covers the physical layer, while each instance's OS, network setup and apps are yours to set up, secure and maintain.
- Managed: AWS absorbs much of the operational overhead, though some provisioning or configuration may remain yours depending on the service.
- Fully managed, like serverless Lambda: there are no servers for you to provision or manage, and AWS also covers scaling and availability.
- What stays with you under Lambda is the application code and keeping it secure.
- Later lessons also call Elastic Beanstalk, Batch, Outposts, ECS, EKS and ECR "fully managed", more loosely.

## Visuals

- **Responsibility timeline (two steps)**: your share shrinks with managed services and shrinks again with fully managed (serverless) ones.

## Key takeaways

- The service model tells you which tasks are AWS's and which are yours.
- With EC2, you configure, secure and maintain the OS, networking and apps on each instance.
- Managed services cut infrastructure work, though some setup may remain.
- Serverless leaves you only your code and its security.

## Terms

- **Unmanaged service**: a service such as EC2 where you handle the OS, patching and scaling.
- **Managed service**: a service you configure while AWS runs it day to day.
- **Fully managed service**: in this lesson's model, a service such as a serverless one where AWS runs every server and you look after just your code.
- **Serverless computing**: running apps on servers you never see, which AWS provisions, scales and maintains.
