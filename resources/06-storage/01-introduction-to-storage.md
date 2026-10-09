---
module: 6
lesson: 1
slug: introduction-to-storage
title: "Introduction to Storage"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 6: Storage, lesson: Introduction to Storage"
concepts:
  - block-storage
  - object-storage
  - file-storage
  - shared-responsibility-model
  - fully-managed-services
  - managed-services
  - unmanaged-services
---

# Introduction to Storage

## Objectives

- Tell block, object and file storage apart.
- Name the main AWS service for each type.
- Apply the shared responsibility model to storage.

## Notes

### Why several storage types

- Virtual AWS storage removes hardware from your data center and scales with demand.
- The coffee shop keeps bean stock, sales, marketing material and secret recipes, each in a fitting container from jars to a safe, and data likewise needs matching storage.
- Images and PDFs must come back whole, logs need fast, steady reads and writes, and shared manuals must reach every employee.
- Databases, for constantly queried data, come in a later module.

### Block storage

- Data is split into blocks for fast access, and an edit rewrites only changed blocks, which suits frequently updated apps and databases.
- Persistent, low-latency volumes attach to EC2 like drives and can be encrypted, snapshotted and modified in use without disruption.
- Services: Amazon EC2 instance store (unmanaged, temporary, high performance) and Amazon EBS (managed, persistent).

### Object storage

- An object holds data, a unique ID and metadata, and any change rewrites the whole object.
- Objects sit in flat buckets with practically unlimited room for unstructured data, and rich metadata helps search and analytics.
- Best for rarely changing files such as videos, backups or logs.
- Service: Amazon S3, fully managed, for any amount of data from anywhere.

### File storage

- A hierarchical file system shared over a network, needing little or no code change and growing without hardware to manage.
- Fits shared-access apps such as content management systems.
- Services: Amazon EFS (fully managed NFS) and Amazon FSx (fully managed Windows, Lustre and NetApp ONTAP file systems).

### Other storage services

- AWS Storage Gateway gives on-premises systems hybrid access to cloud storage.
- AWS Elastic Disaster Recovery recovers physical, virtual and cloud servers into AWS.

### Shared responsibility for storage

- Fully managed: AWS covers the whole stack, including durability, availability, encryption at rest and replication, and you handle data, access and configuration.
- Managed: AWS keeps infrastructure, hardware redundancy and volume replication, and you plan backups, encryption, performance and capacity.
- Unmanaged: AWS keeps only hardware and network running, and the data, durability included, is yours.

## Visuals

- **Responsibility images**: the customer's share grows from fully managed to managed to unmanaged.

## Key takeaways

- Block storage updates in pieces and serves EC2 through instance store and Amazon EBS.
- Object storage keeps whole objects with metadata in flat Amazon S3 buckets.
- File storage shares one file system through Amazon EFS and Amazon FSx.
- Less AWS management means more customer responsibility.

## Scenarios

- Marketing images and PDFs that must come back whole point to object storage.
- Manuals the whole shop opens point to file storage.

## Terms

- **Block storage**: storage that rewrites only the blocks that change.
- **Object storage**: storage of self-contained objects (data, ID, metadata) in flat buckets.
- **File storage**: a shared, hierarchical file system reached over a network.
- **Fully managed, managed, unmanaged**: the three groups showing how much storage administration AWS takes on.
