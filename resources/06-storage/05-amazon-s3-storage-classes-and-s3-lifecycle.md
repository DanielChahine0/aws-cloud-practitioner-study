---
module: 6
lesson: 5
slug: amazon-s3-storage-classes-and-s3-lifecycle
title: "Amazon S3 Storage Classes and S3 Lifecycle"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 6: Storage, lesson: Amazon S3 Storage Classes and S3 Lifecycle"
concepts:
  - s3-storage-classes
  - s3-standard
  - s3-intelligent-tiering
  - s3-standard-ia
  - s3-one-zone-ia
  - s3-express-one-zone
  - s3-glacier-storage-classes
  - s3-lifecycle
---

# Amazon S3 Storage Classes and S3 Lifecycle

## Objectives

- Describe each S3 storage class and how they differ.
- Explain S3 Lifecycle policies and how they affect cost.

## Notes

### Why storage classes exist

- Each class balances performance, access, resiliency and cost, and some target data residency, unpredictable access or archiving.
- One bucket can mix classes, chosen per object by access pattern.
- Cost depends mainly on the class: per-GB storage rate, retrieval charges and minimum storage duration (none for S3 Standard, 180 days for S3 Glacier Deep Archive).
- The bucket's Region affects price too, though the class is a primary driver.

### Frequent and changing access

- S3 Standard: the general-purpose default when no class is named, with fast retrieval at an affordable price, for apps, games, dynamic websites, content distribution and big data analytics.
- S3 Intelligent-Tiering: for unknown or shifting access, S3 tracks use and moves each object to its cheapest suitable tier, with no lifecycle rules to manage.
  - The slide names three tiers (frequent, infrequent, archive instant access), while the video says four.
  - Good for data lakes and large datasets whose usage changes.

### Infrequent access

- S3 Standard-IA: data used less often but needed fast, with S3 Standard's durability, throughput and latency, cheaper storage and a per-GiB retrieval fee, for backups and disaster recovery files.
- S3 One Zone-IA: one Availability Zone instead of Standard-IA's three, so cheaper, for secondary backups or easily recreated data without high availability needs.

### Single-zone speed

- S3 Express One Zone: a single-zone class for the hottest, latency-sensitive data, answering consistently in single-digit milliseconds.
  - Versus S3 Standard, access is up to 10x faster and requests up to 80% cheaper.
- Both one-zone classes cut cost or add speed but risk data loss if that zone is damaged.

### Glacier archive classes

- S3 Glacier Instant Retrieval: rarely read archives returned in milliseconds, up to 68 percent cheaper than Standard-IA at equal speed, for things like medical images or media.
- S3 Glacier Flexible Retrieval: cheaper archives read about once or twice a year, for backup, disaster recovery and offsite copies.
  - Expedited retrieval takes 1-5 minutes, and free bulk retrieval 5-12 hours.
- S3 Glacier Deep Archive: the lowest-cost class, for data touched perhaps once or twice a year, with a default 12-hour retrieval.
  - Meant for long-term retention and digital preservation, such as compliance archives that finance, healthcare or government keep 7-10 years or more.

### Amazon S3 Outposts

- Brings S3 storage, APIs and features to an on-premises AWS Outposts environment, for local data residency and for speed when data must stay near local apps.

### S3 Lifecycle

- Interest in data often fades, like a social media post that is busy for days and ignored months later.
- Lifecycle configurations automate this for an object or group of objects with two kinds of action.
  - Transition actions move objects to another class at a set age, such as Standard-IA after 30 days or Glacier Deep Archive after a year.
  - Expiration actions delete objects for good, such as when compliance no longer needs them.
- Transitions happen within the same bucket, with no manual copying between buckets.
- Rules should follow the access curve, since archiving too early blocks quick access and expiring too early deletes needed data.
- Typical candidates are periodic logs kept a week or a month, and documents that cool off, are archived for a set period, then deleted.
- S3 Storage Class Analysis studies access patterns to show when a cheaper class pays off.

## Visuals

- **Storage class slides**: nine slides from S3 Standard to S3 Outposts, teaching which class fits which access pattern.
- **Lifecycle example diagram**: an untouched object moves from S3 Standard to Standard-IA after 30 days, to Glacier Instant Retrieval after 60 more, and is deleted after 365 days there.

## Key takeaways

- S3 Standard is the default for frequently used data, and Standard-IA or One Zone-IA cost less for data used less.
- Glacier classes are for archives: Instant Retrieval in milliseconds, Flexible Retrieval in minutes to hours, Deep Archive in about 12 hours at the lowest price.
- Intelligent-Tiering moves objects among its own access tiers when usage is unknown or changing.
- S3 Lifecycle transition and expiration actions move or delete objects as they age.
- Price depends on the class's storage rate, retrieval fees and minimum storage duration.

## Scenarios

- Medical images opened rarely but needed instantly fit Glacier Instant Retrieval.
- Regulatory archives kept for a decade fit Glacier Deep Archive.
- Moving old data to Glacier after a year and deleting it when compliance ends is a lifecycle policy.
- Knowledge checks practised matching lifecycle transitions to a fading access pattern and defining S3 Lifecycle.

## Terms

- **S3 storage class**: an S3 tier with its own performance, resiliency and price.
- **S3 Standard**: the default general-purpose class.
- **S3 Intelligent-Tiering**: a class that moves objects among its access tiers automatically.
- **S3 Standard-IA**: a class for infrequently used data needing fast retrieval, with a retrieval fee.
- **S3 One Zone-IA**: a cheaper infrequent-access class in one Availability Zone.
- **S3 Express One Zone**: a single-zone class for the fastest, most frequent access.
- **S3 Glacier Instant Retrieval**: an archive class with millisecond retrieval.
- **S3 Glacier Flexible Retrieval**: an archive class with retrieval in minutes to hours.
- **S3 Glacier Deep Archive**: the cheapest class, with retrieval in about 12 hours.
- **Amazon S3 Outposts**: S3 storage delivered on premises through AWS Outposts.
- **Minimum storage duration**: the shortest storage period a class commits you to.
- **S3 Lifecycle**: rules that transition or expire objects automatically.
- **Transition action**: a lifecycle rule that moves objects to another class.
- **Expiration action**: a lifecycle rule that permanently deletes objects.
- **S3 Storage Class Analysis**: a feature that analyzes access patterns to suggest class changes.
