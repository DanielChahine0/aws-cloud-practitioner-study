---
module: 6
lesson: 8
slug: amazon-fsx
title: "Amazon FSx"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 6: Storage, lesson: Amazon FSx"
concepts:
  - amazon-fsx
  - fsx-for-windows-file-server
  - fsx-for-netapp-ontap
  - fsx-for-openzfs
  - fsx-for-lustre
---

# Amazon FSx

## Objectives

- Explain Amazon FSx, its benefits and uses.
- List the file systems FSx offers.

## Notes

### What FSx is

- A fully managed, reliable and scalable service for high-performance file systems, with AWS handling hardware, patching and backups at a lower total cost of ownership (TCO).
- Benefits: standard protocols for existing tools, self-adjusting capacity, and paying only for used storage as cold data tiers down.
- Unlike NFS-focused EFS it supports several file systems, and it runs in the AWS Cloud, not on premises.

### The four file systems

- FSx for Windows File Server: Windows Server storage with SMB, Microsoft Active Directory, data deduplication and steady sub-millisecond latency.
  - Uses: Windows file server and SQL Server moves, hybrid workloads and virtual desktops.
- FSx for NetApp ONTAP: ONTAP data management for Windows and Linux, for migrations, modern apps and business continuity.
- FSx for OpenZFS: ZFS storage over NFS v3 to v4.2, for migrations, analytics, content management and dev and test.
- FSx for Lustre: Lustre speed and scale for machine learning (ML), high performance computing (HPC), big data and media.

### Where FSx fits

- For Windows shares, EFS (NFS, Linux) and EBS (no SMB or Active Directory) fall short, and the SMB-capable gateways mainly bridge sites to the cloud.
- On-premises users reach FSx over AWS Direct Connect or a VPN without local caching, so fast on-site access to hot files needs [AWS Storage Gateway](09-aws-storage-gateway.md).

## Key takeaways

- FSx offers managed file systems in the AWS Cloud.
- SMB and Active Directory point to FSx for Windows File Server, mixed Windows and Linux to ONTAP, NFS on ZFS to OpenZFS, and ML or HPC to Lustre.
- Without an on-premises cache, FSx leaves low-latency hybrid access to Storage Gateway.

## Scenarios

- Moving Windows file servers into AWS fits FSx for Windows File Server.
- Fast shared storage for ML training fits FSx for Lustre.

## Terms

- **Amazon FSx**: managed service that runs popular file systems in AWS.
- **SMB**: Server Message Block, the Windows file-sharing protocol.
- **Lustre**: a high-performance file system for compute-heavy work.
