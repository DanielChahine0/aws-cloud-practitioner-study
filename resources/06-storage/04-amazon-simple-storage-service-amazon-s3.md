---
module: 6
lesson: 4
slug: amazon-simple-storage-service-amazon-s3
title: "Amazon Simple Storage Service (Amazon S3)"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 6: Storage, lesson: Amazon Simple Storage Service (Amazon S3)"
concepts:
  - amazon-s3
  - s3-objects
  - s3-buckets
  - s3-durability
  - s3-versioning
  - s3-bucket-policies
  - s3-presigned-urls
  - s3-block-public-access
---

# Amazon Simple Storage Service (Amazon S3)

## Objectives

- Explain Amazon S3, its benefits and its use cases.
- Identify the S3 features for managing security.

## Notes

### What S3 is

- A fully managed, highly available object store for virtually unlimited data, ideal for unstructured content like documents, images and video.
- For the coffee shop, that means anything from receipts to staff training videos.
- It integrates with other AWS services and serves cloud apps and on-premises workloads alike, from backups to data lakes.
- Given permission, a bucket is reachable from anywhere, whatever its Region.

### Objects and buckets

- Every file is stored as an object, and objects go in buckets instead of directories, as a file sits in a folder on your drive.
- An object has data, metadata and a key that names it uniquely in its bucket, plus properties such as a version ID and access control details.
- Objects run from a few bytes to 5 TB per upload, and buckets have no size cap.
- Each object is stored durably in multiple facilities, meaning several Availability Zones, within your chosen Region.
- Bucket names are unique across AWS, and you set the name and Region at creation.
- A bucket is the basic unit of access control, holds virtually unlimited objects and takes settings like versioning, logging and permissions.

### Durability and versioning

- For most storage classes AWS keeps redundant copies automatically, giving 11 nines (99.999999999 percent) of durability, so losing an object within a year is vanishingly unlikely.
- Versioning lets you bring back earlier versions after an accidental delete.

### Benefits and uses

- Storage scales with no fixed ceiling, and you pay only for what you store.
- Lifecycle policies move objects between storage classes or expire them by your rules.
- Uses: websites, content and media delivery, backups, archives, app data, data lakes and compliance retention.
- An online store's product images on S3 survive a traffic spike with no scaling work, because AWS runs the service.

### Security and privacy

- Data starts private, reachable only by its creator until you grant access, though you may make buckets and objects public.
- Bucket policies are resource-based, attach only to buckets and allow or deny actions on the bucket and all its objects.
- Identity-based policies sit on users, groups or roles and set which buckets and objects they may use and how.
- Encryption at rest and in transit keeps stored objects and traffic confidential and helps meet security regulations.
- Presigned URLs grant expiring access without touching the bucket policy.
- S3 Access Points simplify separate access rules for groups sharing one dataset.
- S3 Audit Logs record every request, showing who accessed what and when.
- Block Public Access, on the account or the bucket, overrides any bucket policy that would open data to the public.
- Public access is thus set by these settings and policies, not by object tags or static website hosting.

## Visuals

- **S3 elements timeline**: two steps define objects (data, metadata, key) and buckets (globally named containers that group objects and carry policies).
- **Security tabs**: three tabs cover bucket policies, identity-based policies and encryption, teaching the layers of S3 access control.

## Key takeaways

- S3 stores objects (data, metadata, key) in globally named buckets, up to 5 TB per object with no bucket limit.
- Redundant copies give 11 nines of durability, and versioning undoes accidental deletes.
- Everything starts private, and Block Public Access beats a permissive bucket policy.
- Access is granted through bucket policies, identity-based policies, presigned URLs and Access Points.

## Scenarios

- Product images for an online store with traffic spikes fit S3's managed scaling.
- Sharing a file briefly with an outside party fits a presigned URL.
- Several teams with different rights on one dataset fit S3 Access Points.
- Knowledge checks practised S3 for mobile app media, troubleshooting blocked public access and S3 durability for video libraries.

## Terms

- **Amazon S3**: fully managed object storage for virtually unlimited data.
- **S3 object**: the basic S3 storage unit of data, metadata and a key.
- **S3 bucket**: a globally named container that holds objects and carries policies.
- **Object key**: an object's unique name within its bucket.
- **Durability (11 nines)**: the 99.999999999 percent yearly odds that an S3 object stays intact.
- **S3 Versioning**: keeping earlier object versions for restoring.
- **Bucket policy**: a resource-based policy on a bucket and its objects.
- **Identity-based policy**: a policy on a user, group or role that sets its S3 permissions.
- **Presigned URL**: an expiring link granting temporary object access.
- **Amazon S3 Access Points**: per-group access policies on a shared dataset.
- **Amazon S3 Audit Logs**: logs of every request to S3 resources.
- **S3 Block Public Access**: settings that block public access even when a policy allows it.
