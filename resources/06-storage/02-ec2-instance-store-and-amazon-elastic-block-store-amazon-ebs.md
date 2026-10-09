---
module: 6
lesson: 2
slug: ec2-instance-store-and-amazon-elastic-block-store-amazon-ebs
title: "EC2 Instance Store and Amazon Elastic Block Store (Amazon EBS)"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 6: Storage, lesson: EC2 Instance Store and Amazon Elastic Block Store (Amazon EBS)"
concepts:
  - ec2-instance-store
  - amazon-ebs
  - ebs-volumes
  - ebs-volume-types
  - data-persistence
  - block-storage
---

# EC2 Instance Store and Amazon Elastic Block Store (Amazon EBS)

## Objectives

- Explain EC2 instance store, its benefits and when to use it.
- Explain Amazon EBS, its benefits and when to use it.

## Notes

### Block-level storage on EC2

- Block storage keeps a file as bytes in disk blocks, so an update rewrites only the affected blocks.
- That efficiency suits databases, enterprise software and file systems, like a laptop's hard drive.

### Amazon EC2 instance store

- Instance store is disk physically attached to the instance's host, not a stand-alone service, and is the default storage on some instance types.
- Stopping or terminating the instance erases it, since a restarted instance usually lands on another host without that disk.
- Being ephemeral, it suits data you can lose, such as buffers, caches and scratch space for heavy processing.
- It serves one instance only and cannot be shared the way Amazon EFS can.
- Benefits: included with many instance types at no extra cost, with very low latency and high I/O because it sits on the host.

### Amazon Elastic Block Store (Amazon EBS)

- EBS volumes are virtual hard drives that attach to instances like external drives.
- They live apart from the host on durable SSD or HDD media, so data survives stops, starts and terminations.
- You choose size, type and configuration, provision the volume, attach it and let the application write to it.
- A volume gives consistent low latency, attaches to one instance at a time, and can be backed up, resized and moved to another instance.
- EBS replicates each volume automatically within its Availability Zone for availability and durability.
- A volume lives in one Availability Zone, and so in one Region, and snapshots carry its data elsewhere.
- Volume types differ in price and in performance, measured in IOPS (input/output operations per second) and tied to type and often size.
- A volume never grows by itself, so you modify it to add capacity.
- Back volumes up with incremental Amazon EBS snapshots.
- Use cases: database hosting, application backups and quick development environments built from snapshots.

### Benefits of detachable volumes

- Migration and disaster recovery: snapshots copy data to other Availability Zones or Regions and restore it there.
- Instance type changes: reattach a volume to a bigger or smaller instance and keep the data.
- Cost and performance tuning: change type, size or IOPS on the fly without downtime.

## Visuals

- **Instance store markers**: a running instance holds data, the instance stops, and the data is gone, teaching non-persistence.
- **EBS markers**: the same three steps with an EBS volume end with the data intact, teaching persistence.

## Key takeaways

- Instance store does not persist, so a stop or termination erases it.
- EBS persists, so an attached volume keeps its data through stops and terminations.
- Instance store gives top I/O at no extra cost, but only for temporary data on one instance.
- EBS volumes are sized and typed by you, sit in one Availability Zone and are protected by incremental snapshots.

## Scenarios

- Scratch space for heavy calculations fits instance store.
- A database that must survive instance stops fits an EBS volume.
- Moving to a larger instance type keeps the data by reattaching the EBS volume.
- Knowledge checks practised instance store for fast temporary data and EBS for persistent, low-latency block storage.

## Terms

- **Amazon EC2 instance store**: temporary block storage on the instance's host, lost on stop or termination.
- **Amazon EBS**: managed service providing persistent block storage volumes for EC2 instances.
- **EBS volume**: a virtual hard drive in one Availability Zone that you attach to an instance.
- **IOPS**: input/output operations per second, the performance measure for EBS volumes.
- **Ephemeral storage**: storage whose data is lost when the instance stops or terminates.
