---
module: 6
lesson: 6
slug: amazon-s3-demonstration
title: "Amazon S3 Demonstration"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 6: Storage, lesson: Amazon S3 Demonstration"
concepts:
  - aws-management-console
  - s3-buckets
  - s3-object-metadata
  - s3-bucket-policies
  - s3-block-public-access
  - s3-versioning
---

# Amazon S3 Demonstration

## Objectives

- Move around the AWS Management Console.
- Create and configure an S3 bucket.
- Upload single files and whole folders.
- Set system-defined and user-defined object metadata.

## Notes

### Creating a bucket

- Search for S3 in the console and choose Create bucket.
- No bucket in any AWS account may share the name, and the demo keeps the N. Virginia Region.
- Block all public access starts on, keeping outsiders out, and stays on in the demo.

### Folders and uploads

- A folder adds structure to the empty bucket, with the default encryption accepted.
- Upload, then Add files, puts single files in the folder.
- Whole folders need drag and drop, the AWS CLI or an AWS SDK, and S3 preserves their hierarchy.

### Object metadata

- System-defined metadata records basics such as creation date, size and storage class.
- User-defined metadata holds your own details, such as tags.

### Bucket-level settings

- Properties: versioning, tags, default encryption, Intelligent-Tiering archive configuration, static website hosting and more.
- Permissions: Block Public Access, the bucket policy, object ownership and cross-origin resource sharing (CORS).
- Management: lifecycle, replication and inventory configurations.

### Writing a bucket policy

- Bucket policies are JSON documents controlling who may reach the objects inside.
- The demo's policy lets another AWS account upload while the bucket owner keeps full control.
  - Effect: allow.
  - Principal: the AWS account number allowed to upload.
  - Action: the PutObject API call.
  - Resource: the parts of the bucket covered.
  - Condition: cross-account uploads succeed only when object ownership metadata is set correctly.

### Object-level settings

- The object URL works for anyone only when Block Public Access is off and bucket permissions allow it.
- With Block Public Access on, the bucket policy decides exactly who gets in.
- Object properties also include Object Lock, checksums, server-side encryption, the storage class, tags and metadata.
- The Versions tab lists earlier versions to restore or delete.

## Key takeaways

- Bucket names are globally unique, and each bucket lives in a Region you choose.
- New buckets block all public access by default.
- Whole folders upload by drag and drop, the AWS CLI or an SDK, keeping their structure.
- Object metadata is either system-defined or user-defined.
- The demo's bucket policy is JSON with an effect, a principal, an action, a resource and a condition.

## Scenarios

- Letting another AWS account upload to your bucket uses a bucket policy whose condition protects owner control.
- Recovering an overwritten or deleted file uses the Versions tab once versioning is on.

## Terms

- **AWS Management Console**: the web interface the demo uses to configure S3.
- **System-defined metadata**: object details S3 records itself, such as size and storage class.
- **User-defined metadata**: custom details you attach to an object, such as tags.
- **Principal**: the account or identity a bucket policy statement applies to.
- **PutObject**: the S3 API action that uploads an object.
