---
module: 12
lesson: 6
slug: transferring-data-online
title: "Transferring Data Online"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 12: Migrating to the AWS Cloud, lesson: Transferring Data Online"
concepts:
  - online-data-transfer
  - aws-datasync
  - aws-transfer-family
  - aws-direct-connect
  - transfer-protocols
---

# Transferring Data Online

## Objectives

- Match online transfer needs to DataSync, Transfer Family or Direct Connect, with offline ([lesson 7](07-transferring-data-offline.md)) as the fallback.

## Notes

### Before moving data

- Check safety, integrity, timing and bandwidth.
- Databases use AWS DMS; DataSync suits most other data.

### AWS DataSync

- Automates and speeds large, secure moves from on-premises storage into AWS storage like Amazon S3.
- It handles instances, encryption and network tuning, and lets you throttle, schedule, filter and report on tasks.

### AWS Transfer Family

- Fully managed file transfer in and out of Amazon S3 and Amazon EFS over FTP, SFTP, FTPS and other transfer protocols.
- It adds encryption and authentication with less infrastructure to manage.

### AWS Direct Connect

- A dedicated private line to a VPC ([networking module](../05-networking/03-more-ways-to-connect-to-the-aws-cloud.md)) that adds bandwidth and can cut network costs.
- It is only the path; DataSync still manages the move.

## Visuals

- Four businesses illustration: each has one transfer worry (scheduling, bandwidth, validation, security).

## Key takeaways

- DataSync manages most data moves, with scheduling and task reports.
- Transfer Family does managed, protocol-based file transfer.
- Direct Connect is a link, not a migration manager.

## Terms

- **AWS DataSync**: A service that automates data transfer into AWS storage.
- **AWS Transfer Family**: A managed multi-protocol file transfer service.
- **Transfer protocol**: A rule set for how data moves between places.
- **AWS Direct Connect**: A dedicated private network link to AWS.
