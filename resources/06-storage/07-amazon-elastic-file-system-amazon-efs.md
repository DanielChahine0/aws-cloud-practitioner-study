---
module: 6
lesson: 7
slug: amazon-elastic-file-system-amazon-efs
title: "Amazon Elastic File System (Amazon EFS)"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 6: Storage, lesson: Amazon Elastic File System (Amazon EFS)"
concepts:
  - amazon-efs
  - network-file-system
  - efs-storage-classes
  - efs-lifecycle-management
  - ebs-vs-efs
  - file-storage
---

# Amazon Elastic File System (Amazon EFS)

## Objectives

- Explain Amazon EFS, its benefits and its use cases.
- Explain EFS storage classes and their effect on price.
- Explain EFS lifecycle policies and how they move data between classes.

## Notes

### What Amazon EFS is

- Self-hosting a file system that many servers share, such as an analytics fleet on one dataset, means handling capacity, redundancy, backups and upkeep, whereas with EFS AWS scales and replicates it for you.
- EFS is a fully managed, elastic file service on the Linux NFS protocol, supporting POSIX-compliant Linux apps.
- It grows to petabytes and shrinks as files change, without disrupting applications.
- Thousands of concurrent NFS connections let many EC2 instances share files, and every change is visible to all of them at once, with no manual syncing.
- Latency stays consistently low, with EFS Standard under a millisecond, though one instance's local instance store is usually faster.
- Standard classes replicate across Availability Zones in a Region, so one zone failing does not cut access.
- On-premises resources can use it, but it keeps no local cache on site and mainly serves cloud workloads.
- No minimum fee or setup cost, and you pay only for storage used.

### EBS compared with EFS

| | Amazon EBS | Amazon EFS |
|---|---|---|
| Scope | One Availability Zone, with the instance in that zone | Any zone in the Region, or other Regions |
| Access | One instance, like a hard drive | Many instances at once |
| Nature | A volume for files, databases or apps | A true Linux file system |
| Growth | Fixed, so a full 2 TB volume stays full | Grows as you write |

### Storage classes

- EFS Standard and Standard-IA: Multi-AZ, with top durability and availability, at a higher price.
- EFS One Zone and One Zone-IA: one Availability Zone, for lower cost.
- EFS Archive: cold data read a few times a year or less that can skip Standard's sub-millisecond latency, up to 50% cheaper than Infrequent Access.

### Lifecycle management

- New file systems come with preset, customizable policies that move files between classes by access.
- By default, files idle in Standard for 30 days move to IA (priced for a few reads a quarter), and after 90 days to Archive.
- An optional rule returns files to Standard when read in IA or Archive, but by default they stay put.

## Visuals

- **Storage class tabs**: three tabs compare Standard, One Zone and Archive classes on resilience and price.
- **Lifecycle timeline**: three steps show the default moves to IA after 30 days and to Archive after 90 days, and the optional return to Standard.

## Key takeaways

- EFS is a fully managed NFS file system that many EC2 instances share with consistent low latency.
- It scales to petabytes automatically, and you pay only for what you store.
- Standard classes span Availability Zones, while One Zone classes trade resilience for price.
- EBS is a single-zone drive for one instance, while EFS is a shared, Regional, self-scaling file system.

## Scenarios

- Several servers analyzing one large dataset fit EFS shared access.
- On-premises apps needing fast local access to hot files point to [AWS Storage Gateway](09-aws-storage-gateway.md), not EFS.
- Knowledge checks practised EFS elastic capacity behind scaling compute and shared access for teams editing the same files.

## Terms

- **Amazon EFS**: a fully managed, elastic NFS file system for AWS and on-premises resources.
- **Network File System (NFS)**: the Linux file-sharing protocol EFS uses.
- **EFS Standard classes**: Multi-AZ EFS classes with the highest durability and availability.
- **EFS One Zone classes**: cheaper EFS classes kept in one Availability Zone.
- **EFS Archive**: a class for data read a few times a year or less, up to 50% cheaper than EFS Infrequent Access.
- **EFS lifecycle management**: policies that move files between EFS classes based on access.
