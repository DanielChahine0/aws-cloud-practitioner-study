---
module: 3
lesson: 3
slug: containers-and-orchestration-on-aws
title: "Containers and Orchestration on AWS"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 3: Exploring Compute Services, lesson: Containers and Orchestration on AWS"
concepts:
  - containers
  - containers-vs-virtual-machines
  - container-orchestration
  - amazon-ecr
  - amazon-ecs
  - amazon-eks
  - aws-fargate
  - kubernetes
---

# Containers and Orchestration on AWS

## Objectives

- Explain how containers make an app's environment consistent and portable.
- Explain how Amazon ECR stores, manages and versions images.
- Identify how ECS and EKS deploy, scale and manage containers.
- Describe Fargate as serverless hosting for containers.

## Notes

### Why containers

- "It works on my machine": apps run locally but fail elsewhere because environments differ.
- A container packs code, runtime, dependencies and configuration into one isolated unit that runs the same anywhere.
- It is not a way to reach several operating systems, and it still needs configuration files.

### Containers versus VMs

- Containers share the host's OS, so they are lighter, start faster and use resources better.
- A VM runs its own full OS on a hypervisor, making it heavier and slower to start.

### Why orchestration

- Running containers yourself on EC2 means owning health checks, starts, stops, updates and networking.
- That breaks down once a few containers on one host become thousands on many.
- Containers do not scale themselves, so orchestrators run their lifecycle across a cluster, scale them with traffic, and handle recovery, monitoring and updates.

### AWS container tools

- AWS groups them as orchestration (ECS, EKS), registry (ECR) and compute (EC2, Fargate, where containers actually run).
- In practice: push images to ECR, pick ECS or EKS, then pick EC2 or Fargate.

### Orchestrators: ECS and EKS

- ECS is the streamlined, integrated orchestrator, for Docker containers and others.
- You set images plus resources like instance types and load balancers, and ECS manages the rest.
- EKS runs Kubernetes, the open source platform automating container deployment, scaling and management.
- AWS fully manages EKS, while Kubernetes gets updates and support from its open source community.
- EKS suits large-scale or hybrid setups that want extra control and flexibility.

### Amazon ECR

- A fully managed registry to keep, manage and deploy images, stored securely in repositories.
- Orchestrators pull images from it, and you push and pull with standard tools and CLIs.
- Images must meet Open Container Initiative (OCI) standards.

### Launch types for ECS and EKS: EC2 or Fargate

- EC2: you manage the VMs under your containers, for full control plus upkeep.
- Fargate: serverless, so AWS runs the servers while ECS or EKS orchestrates, and you pay only for resources used.

## Visuals

- **Key takeaways timeline (three steps)**: containers versus VMs, consistent environments cutting failed deployments, and orchestration as containers multiply.

## Key takeaways

- Containers bundle an app and its dependencies into one portable unit, which suits workloads needing high security, reliability and scalability.
- Sharing the host OS makes them lighter and faster than VMs.
- ECS or EKS adds the scaling and lifecycle care that containers lack on their own.
- Choose EKS for Kubernetes and large or hybrid setups, and ECS for a streamlined, integrated option.
- ECR stores images securely, ECS or EKS orchestrates them, and EC2 or serverless Fargate runs them.

## Scenarios

- Small or medium business app needing specific hardware or networking: ECS on EC2.
- Startup web app with variable traffic: ECS on Fargate.
- Enterprise with complex, large workloads needing deep instance tuning: EKS on EC2.
- Team wanting Kubernetes without managing servers: EKS on Fargate.

## Terms

- **Container**: a portable, isolated package of an app with all it needs to run.
- **Virtual machine (VM)**: a virtual computer with its own full OS.
- **Hypervisor**: the layer letting each VM run its own full OS.
- **Container orchestration**: automated lifecycle, scaling and health management for many containers.
- **Launch type**: the compute, EC2 or Fargate, under ECS or EKS.
- **Amazon ECS**: AWS's streamlined, integrated container orchestrator.
- **Amazon EKS**: AWS's fully managed service for Kubernetes clusters.
- **Kubernetes**: the open source container platform EKS runs.
- **Amazon ECR**: AWS's fully managed container image registry.
- **AWS Fargate**: serverless container hosting for ECS and EKS.
- **Docker**: a platform for quickly building, testing and shipping apps.
- **Open Container Initiative (OCI)**: the image standards ECR supports.
