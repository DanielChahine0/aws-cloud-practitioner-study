---
module: 6
lesson: 3
slug: amazon-elastic-block-store-amazon-ebs-data-lifecycle
title: "Amazon Elastic Block Store (Amazon EBS) Data Lifecycle"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 6: Storage, lesson: Amazon Elastic Block Store (Amazon EBS) Data Lifecycle"
concepts:
  - ebs-snapshots
  - incremental-backups
  - ebs-data-lifecycle
  - amazon-data-lifecycle-manager
  - shared-responsibility-model
---

# Amazon Elastic Block Store (Amazon EBS) Data Lifecycle

## Objectives

- Explain EBS snapshots and how they help manage data.
- Explain the EBS data lifecycle and the service that automates it.
- Identify what the customer owns for snapshots and Amazon Data Lifecycle Manager.

## Notes

### EBS data lifecycle

- Lifecycle management means creating, backing up and deleting volumes and snapshots to control cost and protect data.
- Your data is your job under shared responsibility, so you provision, move, deprovision and back up volumes.

### EBS snapshots

- A snapshot is a point-in-time backup, taken as often as needed, from daily to monthly.
- Uses: disaster recovery, data migration, volume resizing and consistent production backups.
- Monday's first snapshot copies everything and Tuesday's only the changes, so later ones are faster and much cheaper.
- A snapshot can create many new volumes, each an exact copy of the source at that moment.
- Snapshots sit in Amazon S3, redundantly across several Availability Zones.

### How the snapshot chain works

- The first snapshot is a full baseline of all blocks in use.
- Later ones store only changed blocks and reference earlier ones, forming a chain for point-in-time recovery.
- Each still acts as a full copy, AWS manages the links, and deleting one frees only data no other snapshot uses.

### Duties and benefits

- Your part: schedule snapshots, prune them to control cost, encrypt sensitive data, verify integrity and test restores.
- Benefits: recovery from corruption, deletion or failure; cross-Region migration, resizing, cloning and cross-account sharing; and lower cost from storing only changes.

### Amazon Data Lifecycle Manager

- Snapshotting thousands of volumes by hand each week is slow and error-prone.
- This fully managed service uses policies to create, keep and delete snapshots and EBS-backed AMIs on a schedule.
- It can run snapshots off-peak to limit performance impact, purge old backups and apply one policy organization-wide, which aids compliance.
- It acts only on resources already in AWS.
- Policy steps: create it (EC2 console, API, AWS CLI, SDKs or AWS CloudFormation), target volumes or instances, optionally exclude root or data volumes, set schedules, then add extras.
- Extras include cross-Region copies, cross-account sharing, tags, snapshot archiving and Amazon EBS fast snapshot restore.

## Visuals

- **Snapshot chain illustration**: three markers go from a full baseline to linked incremental snapshots to safe deletion, teaching how incremental backups still act as complete copies.
- **Data Lifecycle Manager slides**: the policy-building steps.

## Key takeaways

- Snapshots are point-in-time, incremental EBS backups kept in Amazon S3 across several Availability Zones.
- Only the first snapshot is full, and deleting one never removes data another needs.
- The customer schedules snapshots, controls their cost, encrypts them and tests restores.
- Amazon Data Lifecycle Manager automates snapshot creation, retention and deletion through policies.

## Scenarios

- Restoring a volume after corruption starts from its latest snapshot.
- Weekly manual snapshots across thousands of volumes give way to a Data Lifecycle Manager policy.
- Knowledge checks practised snapshots for copying production into test environments and Data Lifecycle Manager for backups and cleanup at scale.

## Terms

- **Amazon EBS snapshot**: a point-in-time, incremental backup of an EBS volume stored in Amazon S3.
- **Point-in-time backup**: a copy of data as it stood at one moment.
- **Incremental backup**: a backup holding only what changed since the previous one.
- **Amazon Data Lifecycle Manager**: fully managed service whose policies automatically create, keep and delete EBS snapshots and EBS-backed AMIs.
- **Snapshot policy**: a Data Lifecycle Manager rule set of targets, schedules and extra actions.
