---
module: 6
slug: storage
title: "Module 6: Storage"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 6: Storage"
lessons: 11
assessment_questions: 15
---

# Module 6: Storage

## What this module covers

This module walks through the three AWS storage types, block, object and file, and the main service behind each.
It covers EC2 instance store and Amazon EBS with snapshots and Amazon Data Lifecycle Manager, then Amazon S3 with its storage classes and lifecycle rules, then the managed file systems Amazon EFS and Amazon FSx.
It ends with the hybrid and recovery services AWS Storage Gateway and AWS Elastic Disaster Recovery, plus a real-life comparison of S3, EBS and EFS.

## Lessons

### Module 6 Introduction

1. **[Introduction to Storage](01-introduction-to-storage.md)**: the three storage types, their AWS services and how shared responsibility shifts between fully managed, managed and unmanaged services.

### Block Storage

2. **[EC2 Instance Store and Amazon Elastic Block Store (Amazon EBS)](02-ec2-instance-store-and-amazon-elastic-block-store-amazon-ebs.md)**: fast but temporary instance store versus persistent EBS volumes.
3. **[Amazon EBS Data Lifecycle](03-amazon-elastic-block-store-amazon-ebs-data-lifecycle.md)**: incremental EBS snapshots and automating them with Amazon Data Lifecycle Manager.

### Object Storage

4. **[Amazon Simple Storage Service (Amazon S3)](04-amazon-simple-storage-service-amazon-s3.md)**: objects, buckets, 11 nines durability and S3 access controls.
5. **[Amazon S3 Storage Classes and S3 Lifecycle](05-amazon-s3-storage-classes-and-s3-lifecycle.md)**: every S3 storage class, what drives its price, and lifecycle rules that move or expire objects.
6. **[Amazon S3 Demonstration](06-amazon-s3-demonstration.md)**: a console walk-through of buckets, uploads, metadata and a bucket policy.

### File Storage

7. **[Amazon Elastic File System (Amazon EFS)](07-amazon-elastic-file-system-amazon-efs.md)**: the shared, self-scaling NFS file system, its classes, lifecycle and how it differs from EBS.
8. **[Amazon FSx](08-amazon-fsx.md)**: managed Windows File Server, NetApp ONTAP, OpenZFS and Lustre file systems, and where FSx fits next to EFS and Storage Gateway.

### Additional Storage Solutions

9. **[AWS Storage Gateway](09-aws-storage-gateway.md)**: hybrid storage through S3 File Gateway, Volume Gateway and Tape Gateway, and how to pick one.
10. **[AWS Elastic Disaster Recovery](10-aws-elastic-disaster-recovery.md)**: continuous server replication to AWS for fast recovery.

### Cloud in Real Life

11. **[Comparing Storage Services](11-comparing-storage-services.md)**: three businesses matched to S3, EBS and EFS.

## Key takeaways

- Block storage serves EC2, where instance store is very fast but loses data on stop or termination, while EBS volumes persist on their own inside one Availability Zone.
- EBS snapshots are incremental, point-in-time backups kept in Amazon S3, and Amazon Data Lifecycle Manager automates their creation, retention and deletion.
- Amazon S3 holds objects of up to 5 TB in globally named buckets, offers 11 nines of durability and keeps everything private by default.
- S3 storage classes trade retrieval speed and resilience for price, from S3 Standard down to S3 Glacier Deep Archive.
- S3 Lifecycle rules move or delete objects as they age, while S3 Intelligent-Tiering shifts objects among its own access tiers automatically.
- Amazon EFS is a fully managed NFS file system that many instances share and that grows on its own, and its Standard classes replicate across Availability Zones.
- Amazon FSx runs Windows File Server, NetApp ONTAP, OpenZFS and Lustre as managed services in the AWS Cloud.
- AWS Storage Gateway links on-premises systems to AWS storage through file, volume and tape gateways, with local caching for hot data.
- AWS Elastic Disaster Recovery replicates servers continuously so they can be recovered in minutes.
- Customer responsibility grows from fully managed services such as S3 and EFS, to managed EBS, to unmanaged instance store.

## What the assessment focuses on

The assessment has 15 questions.

- Amazon EBS as persistent block storage for EC2: 2 questions.
- EC2 instance store for temporary, high-I/O data: 1 question.
- EBS snapshots for backups, test copies and disaster recovery: 1 question.
- Amazon S3 as scalable object storage, including media distribution: 2 questions.
- Purpose and pricing factors of S3 storage classes: 2 questions.
- Amazon EFS as an elastic, shared Linux file system: 2 questions.
- Amazon FSx, including FSx for Windows File Server: 2 questions.
- AWS Storage Gateway, including S3 File Gateway: 2 questions.
- AWS Elastic Disaster Recovery: 1 question.
- Telling S3, EBS, EFS, FSx and the Glacier classes apart: 11 questions use these services as alternatives to one another.

## Summary

The closing recap walks back through the module one storage type at a time.
On the block side it sets short-lived instance store against durable EBS volumes, with snapshots and Data Lifecycle Manager handling automated protection.
Amazon S3 stands for object storage and is framed as the base layer for much of what runs in the cloud.
For files, EFS covers Linux workloads and FSx covers Windows, Lustre, OpenZFS and NetApp ONTAP, and Storage Gateway rounds things off as the link for hybrid designs.
The recap does not return to S3 storage classes, S3 Lifecycle or AWS Elastic Disaster Recovery, which the lessons above cover.

## Further reading

- [Amazon EC2 Instance Store User Guide](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/InstanceStorage.html): reference for the temporary disks that come with some instance types.
- [Amazon Elastic Block Store (Amazon EBS)](https://aws.amazon.com/ebs/): product page for persistent EC2 volumes.
- [Amazon Elastic Block Store (Amazon EBS) FAQ](https://aws.amazon.com/ebs/faqs/): answers to common EBS questions.
- [Amazon EBS Snapshots User Guide](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-snapshots.html): backing up volumes and restoring them from snapshots.
- [Amazon Data Lifecycle Manager User Guide](https://docs.aws.amazon.com/ebs/latest/userguide/snapshot-lifecycle.html): setting up policies that manage snapshots automatically.
- [Amazon Simple Storage Service (Amazon S3)](https://aws.amazon.com/s3/): product overview of S3 object storage.
- [Amazon Simple Storage Service (Amazon S3) FAQ](https://aws.amazon.com/s3/faqs/): answers to common S3 questions.
- [Amazon S3 Storage Classes](https://aws.amazon.com/s3/storage-classes/): every class side by side, from hot data to deep archive.
- [Amazon S3 Versioning User Guide](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html): how versions protect objects from accidental change or deletion.
- [Amazon S3 Buckets User Guide](https://docs.aws.amazon.com/AmazonS3/latest/userguide/creating-buckets-s3.html): creating and configuring buckets.
- [Amazon Elastic File System (Amazon EFS)](https://aws.amazon.com/efs/): product overview of shared, managed file storage.
- [Amazon Elastic File System (Amazon EFS) FAQ](https://aws.amazon.com/efs/faq/): answers to common EFS questions.
- [Amazon FSx](https://aws.amazon.com/fsx/): overview of the four managed file system options.
- [Amazon FSx for Windows File Server](https://aws.amazon.com/fsx/windows/): managed file storage for Windows applications.
- [Amazon FSx for NetApp ONTAP](https://aws.amazon.com/fsx/netapp-ontap/): managed ONTAP storage usable from Windows and Linux.
- [Amazon FSx for OpenZFS](https://aws.amazon.com/fsx/openzfs/): managed storage built on ZFS, an open-source file system.
- [Amazon FSx for Lustre](https://aws.amazon.com/fsx/lustre/): speed-focused storage for compute-heavy jobs.
- [AWS Storage Gateway](https://aws.amazon.com/storagegateway): product page for the hybrid storage service.
- [Amazon S3 File Gateway](https://aws.amazon.com/storagegateway/file/s3/): file-share access to S3 with a local cache.
- [Tape Gateway](https://aws.amazon.com/storagegateway/vtl/): cloud backups that keep existing tape software in use.
- [Volume Gateway](https://aws.amazon.com/storagegateway/volume/): AWS-backed iSCSI volumes in cached or stored mode.
