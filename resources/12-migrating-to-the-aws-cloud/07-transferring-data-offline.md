---
module: 12
lesson: 7
slug: transferring-data-offline
title: "Transferring Data Offline"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 12: Migrating to the AWS Cloud, lesson: Transferring Data Offline"
concepts:
  - offline-data-transfer
  - aws-snow-family
  - aws-snowball-edge-storage-optimized
  - edge-computing
---

# Transferring Data Offline

## Objectives

- Know when to ship data on a device instead of the network.
- Describe Snowball Edge Storage Optimized devices.

## Notes

### When to go offline

- Many customers prefer online moves; offline means sending data on a physical device when DataSync falls short.
- Triggers: thin bandwidth, remote sites without internet or Direct Connect, or petabytes that ship faster than they upload.

### Snowball Edge Storage Optimized devices

- AWS Snow Family devices with NVMe storage for multi-petabyte moves from on-premises sites where internet may be unavailable.
- They bring strong compute, large capacity and gigabytes per second, and also serve rugged, secure edge computing.
- Being offline, they do not fit online transfer needs.

## Visuals

- Polar bear cartoon: workers on snowmobiles flee a polar bear near a remote research station, amazed at how fast Snowball Edge devices are.

## Key takeaways

- Go offline when bandwidth, connectivity or volume rules out online transfer.
- Snowball Edge carries multi-petabyte moves and doubles as a rugged edge device.
- It does not fit online transfer.

## Terms

- **Offline data transfer**: Moving data to AWS on a physical device.
- **AWS Snow Family**: The AWS device family for offline transfer, including Snowball Edge.
- **Snowball Edge Storage Optimized device**: An NVMe device for offline, multi-petabyte moves.
- **Edge computing**: A Snowball Edge use case that calls for a secure, rugged device.
