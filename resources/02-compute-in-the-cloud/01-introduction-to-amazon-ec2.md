---
module: 2
lesson: 1
slug: introduction-to-amazon-ec2
title: "Introduction to Amazon EC2"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 2: Compute in the Cloud, lesson: Introduction to Amazon EC2"
concepts:
  - amazon-ec2
  - compute-as-a-service
  - on-premises-vs-cloud
  - multi-tenancy
  - hypervisor
  - vertical-scaling
  - amazon-machine-image
  - connecting-to-ec2-instances
---

# Introduction to Amazon EC2

## Objectives

- Explain how cloud compute is requested and managed.
- Weigh virtual servers in the cloud against physical servers on premises.
- Define multi-tenancy for Amazon EC2.

## Notes

### Compute in the cloud

- Compute is processing power for applications, data and calculations, rented on demand as virtual machines with no hardware to own.
- On AWS, the servers behind any business's client-server model (the coffee shop staff) are EC2 instances.

### EC2 versus owning servers

- Owning means upfront purchases, delivery waits, installation and fixed capacity.
- AWS keeps huge capacity running, so instances are usable within minutes.
- EC2 suits startups and enterprises and needs less setup and upkeep.
- You pick server count, security, networking, storage and scale, which speeds up development and deployment.
- Usage can swing widely, and you are never locked into servers you no longer need.

### Stopping, terminating and billing

- Only running instances are billed.
- A stopped instance can be restarted later, a terminated one is deleted, and neither restarts by itself unless configured to.

### Multi-tenancy

- Many EC2 instances, which are virtual machines (VMs), share one physical host: multi-tenancy.
- A hypervisor on the host shares resources among them while isolating them, and AWS manages host, hypervisor and isolation.
- The course also calls the sharers tenants, or users, kept apart for security and performance.

### What you control

- You choose the OS (Windows or Linux, across up to thousands of instances), fully control the software, and decide which requests get in and whether access is public or private.
- Changing an instance's CPU and memory is vertical scaling.
- What is new is not the VM but buying servers as a service: Compute as a Service.

### Launch, connect, use

- **Launch**: pick an instance type (CPU, memory, network performance) and an AMI (OS plus optional software).
- The AZ is usually set for you, bandwidth follows the instance type, and no backup plan or user count is needed.
- Storage can be added after launch, though the [demo](04-demo-launching-an-amazon-ec2-instance.md) sets a volume up front.
- **Connect**: by network for applications, or SSH (Linux), Remote Desktop Protocol (RDP) (Windows) or AWS Systems Manager.
- **Use**: run commands, install software, add storage, organize files.

## Visuals

- **On-premises versus cloud timeline**: slow, fixed hardware buying versus EC2's fast, pay-while-running model.
- **How Amazon EC2 works**: launch, connect, use.

## Key takeaways

- EC2 is more flexible, cheaper and faster to start than owned servers, for any business size.
- Billing stops when an instance stops, and only termination deletes it.
- In multi-tenancy, isolated instances share a host whose hypervisor AWS manages.
- A launch needs an instance type and an AMI, and instances resize vertically.

## Scenarios

- Servers for new websites: launch EC2 instances instead of buying hardware.

## Terms

- **Compute**: processing power for applications and calculations.
- **Amazon Elastic Compute Cloud (Amazon EC2)**: AWS's on-demand, resizable virtual server service.
- **EC2 instance**: a virtual server on Amazon EC2.
- **Multi-tenancy**: isolated VMs sharing one physical host.
- **Hypervisor**: host software that shares resources among VMs and isolates them.
- **Vertical scaling**: changing an instance's CPU and memory.
- **Compute as a Service**: renting servers on demand.
- **Instance type**: an instance's hardware profile of CPU, memory and network performance.
- **AWS Systems Manager**: an AWS service for secure, simplified instance access.
