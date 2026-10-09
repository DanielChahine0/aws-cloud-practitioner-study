---
module: 6
lesson: 11
slug: comparing-storage-services
title: "Comparing Storage Services"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 6: Storage, lesson: Comparing Storage Services"
concepts:
  - choosing-storage-services
  - s3-static-website-hosting
  - amazon-ebs
  - provisioned-iops-ssd
  - amazon-efs
  - amazon-s3
---

# Comparing Storage Services

## Objectives

- Explain how a company would apply AWS storage services to real situations.

## Notes

### Static website on Amazon S3

- The coffee shop serves its website's static assets from an S3 bucket using S3 static website hosting.
- Setup is uploading HTML, CSS, JavaScript and media files and switching hosting on.
- S3 absorbs any traffic level itself, and you pay for storage plus data transferred out.

### Database storage on Amazon EBS

- A fitness center's class-booking app slows as traffic climbs, and its database on EC2 looks like the bottleneck.
- Popular classes fill fast, so reads and writes need consistently low latency.
- A relational database on EC2 keeps data on EBS volumes, which are tuned for transactional work.
- The fix is moving to Provisioned IOPS SSD, the top-performing volume type for mission-critical apps.
- S3 would not work, since object storage is not built for constant rapid rewrites, while EBS gives databases block-level access.

### Shared media on Amazon EFS

- An auto repair chain wants mechanics at every site to share repair techniques plus high-resolution images, videos and diagrams in real time.
- Many devices and locations using the same data call for a shared file system, so EFS fits.
- EFS scales to petabytes as files change, with low latency and high aggregate throughput and IOPS for media.

## Key takeaways

- S3 is the scalable object store for web assets, backups and similar content.
- EBS gives EC2 instances and databases block storage, and Provisioned IOPS SSD performs best.
- EFS provides managed shared file systems for fast, simultaneous file access.
- Matching storage to the access pattern gives efficient, cost-effective designs.

## Scenarios

- A sudden jump in website visitors needs no scaling work when the site is hosted on S3.
- A database that rewrites data constantly should not sit on S3, because that work needs block storage such as EBS.
- A slow database already on EBS can be sped up by moving to a faster volume type instead of switching services.
- Staff at many locations opening the same large media files at once need a shared file system such as EFS.

## Terms

- **S3 static website hosting**: an S3 feature that serves a site's static files from a bucket.
- **Provisioned IOPS SSD**: the highest-performance EBS volume type, for mission-critical workloads.
- **Transactional workload**: rapid, continuous database reads and writes, which EBS volumes are tuned for.
