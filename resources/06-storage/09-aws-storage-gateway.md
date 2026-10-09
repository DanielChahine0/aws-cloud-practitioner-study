---
module: 6
lesson: 9
slug: aws-storage-gateway
title: "AWS Storage Gateway"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 6: Storage, lesson: AWS Storage Gateway"
concepts:
  - aws-storage-gateway
  - hybrid-cloud-storage
  - s3-file-gateway
  - volume-gateway
  - tape-gateway
---

# AWS Storage Gateway

## Objectives

- Explain AWS Storage Gateway, its benefits and its use cases.
- Describe its three gateway types.

## Notes

### What it is

- A hybrid storage service bridging on-premises systems and AWS, giving local apps virtually unlimited cloud capacity with little or no rework.
- It suits organizations still running mainly on premises that want cloud benefits such as backups.
- Local storage extends into AWS while frequently used data stays fast on site.
- It deploys as a virtual machine, a hardware appliance or an Amazon EC2 instance.

### Use cases and benefits

- Disaster recovery: critical data gets a cloud copy without changing backup routines.
- Archiving: rarely used data moves to the cloud for long-term keeping.
- Hybrid access: local file shares backed by AWS, and fast local access to AWS data.
- Benefits: intact workflows, central management for access, security and compliance, local caching of hot data, and lower on-premises storage costs.

### Gateway types

- Amazon S3 File Gateway: appears locally as a normal file server using NFS or SMB.
  - Files land in Amazon S3 as objects, recent data stays cached, and AWS services can reach the files.
- Volume Gateway: presents cloud-backed block storage as iSCSI volumes that local apps mount.
  - Cached volume mode keeps the main dataset in the cloud and hot data cached locally.
  - Stored volume mode keeps everything local and backs it up asynchronously as EBS snapshots.
- Tape Gateway: virtual tapes in Amazon S3 that backup software treats as tape hardware, with rarely used data movable to a cheaper class.

### Picking a gateway

- File-share workflows point to S3 File Gateway.
- Apps mounting iSCSI block volumes point to Volume Gateway, cached mode when only hot data stays local and stored mode when all of it must.
- Tape backup software points to Tape Gateway, which is for backup and archiving with no file-level access for daily work.
- EFS and FSx run in AWS without an on-site cache, so neither replaces a gateway for low-latency on-premises access to hot files.

## Visuals

- **Gateway types timeline**: three steps describe S3 File Gateway, Volume Gateway with its two modes, and Tape Gateway, teaching which gateway matches file, block or tape workloads.

## Key takeaways

- Storage Gateway gives on-premises apps hybrid access to virtually unlimited AWS storage.
- S3 File Gateway puts files into S3 behind a familiar file share with local caching.
- Volume Gateway serves iSCSI block volumes in cached or stored mode, backed up as EBS snapshots.
- Tape Gateway lets tape backup software write virtual tapes to Amazon S3.

## Scenarios

- A business still on physical tape backups moves them to the cloud with Tape Gateway.
- A company keeping its backup routine but adding a cloud copy for disaster recovery uses Storage Gateway.
- Knowledge checks practised S3 File Gateway for file-share workflows and Volume Gateway cached mode for local access to frequently used data.

## Terms

- **AWS Storage Gateway**: hybrid service connecting on-premises environments to AWS storage.
- **Amazon S3 File Gateway**: a local file share whose files are stored in Amazon S3.
- **Volume Gateway**: cloud-backed iSCSI block volumes for local apps.
- **Cached volume mode**: main dataset in the cloud, hot data cached locally.
- **Stored volume mode**: all data local, backed up asynchronously as EBS snapshots.
- **Tape Gateway**: emulated tape hardware storing virtual tapes in Amazon S3.
- **iSCSI volume**: the block-volume form Volume Gateway presents to local apps.
