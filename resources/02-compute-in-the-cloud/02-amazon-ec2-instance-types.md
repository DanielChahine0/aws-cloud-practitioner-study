---
module: 2
lesson: 2
slug: amazon-ec2-instance-types
title: "Amazon EC2 Instance Types"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 2: Compute in the Cloud, lesson: Amazon EC2 Instance Types"
concepts:
  - ec2-instance-types
  - ec2-instance-families
  - general-purpose-instances
  - compute-optimized-instances
  - memory-optimized-instances
  - accelerated-computing-instances
  - storage-optimized-instances
  - ec2-instance-sizing
---

# Amazon EC2 Instance Types

## Objectives

- Tell the EC2 instance types apart by their strengths.
- Match workloads to suitable types.

## Notes

### Instance families

- Like coffee machines suited to different drinks, instance families each mix CPU, memory, storage and networking differently.
- **General purpose**: balanced, for web services, code repositories and unpredictable workloads.
- **Compute optimized**: CPU-heavy work like game servers, HPC, machine learning and scientific modeling.
- **Memory optimized**: fast in-memory processing of large datasets, as in analytics and databases.
- **Accelerated computing**: hardware accelerators such as GPUs, co-processors that do floating-point math, graphics, pattern matching and machine learning more efficiently than software running on a CPU.
- **Storage optimized**: fast access to local data, as in data warehousing, large databases and I/O-heavy apps.
- In analytics, real-time in-memory work points to memory optimized, while big local datasets needing low-latency access and steady, high disk throughput point to storage optimized.

### Sizes

- Bigger sizes cost more, so pick the smallest that performs well and switch later if needed.
- Type names encode family and size.

## Visuals

- **Instance types graphic**: one marker per family.

## Key takeaways

- Unknown workload: start with general purpose.
- Pick the family by the bottleneck: CPU, memory, accelerators or local disk.
- Size trades performance for cost, and nothing is permanent.

## Scenarios

- A multiplayer game server: compute optimized.
- A large in-memory database: memory optimized.
- A data warehouse on local disks: storage optimized.

## Terms

- **Instance family**: types sharing one resource mix.
- **General purpose instances**: balanced, all-round instances.
- **Compute optimized instances**: instances for CPU-heavy work.
- **Memory optimized instances**: instances for big in-memory datasets.
- **Accelerated computing instances**: instances with GPUs or other accelerators.
- **Storage optimized instances**: instances for fast local storage.
- **Hardware accelerator**: a co-processor that runs some functions more efficiently than CPU-run software.
- **Instance size**: an instance's scale within its family.
