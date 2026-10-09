---
module: 11
lesson: 6
slug: cost-optimization
title: "Cost Optimization"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 11: Pricing and Support, lesson: Cost Optimization"
concepts:
  - cost-optimization
  - rightsizing
  - aws-compute-optimizer
  - spot-instances
  - amazon-ec2-auto-scaling
  - amazon-rds-read-replicas
  - s3-storage-classes
  - vpc-endpoints
---

# Cost Optimization

## Objectives

- Describe cost optimization techniques.

## Notes

### Look across services

- Solutions usually combine services, so look for savings across the design (here EC2, RDS in a VPC, and S3).
- EC2 is where many teams look first.

### Amazon EC2

- Rightsizing: measure real workload needs and resize to fit.
- AWS Compute Optimizer, a cost-minded sidekick, flags overprovisioned instances.
- Spot Instances sell spare EC2 capacity at up to 90 percent off On-Demand, for flexible, interruption-tolerant jobs.
- Some firms halved compute costs with Spot for noncritical work.

### Auto scaling and cleanup

- Auto scaling replaces hand-managing a fleet and sheds surplus capacity as demand falls.
- Application load balancing spreads traffic across instances.
- Forgotten EBS volumes and snapshots keep billing until deleted.

### Amazon RDS

- Rightsize databases too; storage autoscaling matches storage to demand.
- Read replicas scale reads horizontally, sparing the primary a bigger, costlier instance.
- Caching hot data in Amazon ElastiCache also lightens the primary.

### Amazon S3

- S3 Intelligent-Tiering suits unknown or shifting access, and S3 Glacier Deep Archive suits data read once or twice a year.
- Compress text-heavy objects, for instance with a Lambda function on upload.
- Lifecycle policies can delete old versions; one customer paid for 10 years of daily backups but needed 30 days.

### Data transfer

- Transfer is not always free, so keep cross-AZ and internet traffic low; as with road traffic, less is better.
- This squares with [AWS Pricing Concepts](02-aws-pricing-concepts.md): in-Region transfer is usually, not always, free.
- VPC endpoints connect a VPC privately to supported services, and one used for S3 trims transfer costs, notably out-of-Region.

### The bigger picture

- Small tweaks add up and often improve performance and reliability too.
- Aim for the right balance of cost, performance and operational efficiency.

## Visuals

- **Architecture diagram**: four markers (EC2, auto scaling, RDS, S3) placing each technique.

## Key takeaways

- Rightsize EC2 with AWS Compute Optimizer, and RDS with storage autoscaling.
- Spot Instances cut up to 90 percent for interruption-tolerant work.
- Auto scaling trims idle capacity, and deleting unused EBS volumes and snapshots stops waste.
- Read replicas and ElastiCache spare the primary database from scaling up.
- Match S3 classes to access, compress and expire old versions.
- Keep cross-AZ and internet traffic low, and use VPC endpoints for S3.

## Scenarios

- Overprovisioned instances: AWS Compute Optimizer.
- Years of unneeded backups: S3 lifecycle policies.

## Terms

- **Rightsizing**: Matching resources to real workload needs.
- **AWS Compute Optimizer**: A service that flags overprovisioned compute.
- **Spot Instances**: Discounted spare EC2 capacity for interruptible work.
- **AWS Auto Scaling**: Automatic fleet sizing that drops spare capacity as demand falls; [Module 2](../02-compute-in-the-cloud/06-scaling-amazon-ec2.md) covers scaling out.
- **RDS storage autoscaling**: Resizes RDS storage with demand.
- **Read replica**: An RDS copy that serves reads.
- **Amazon ElastiCache**: A cache that offloads frequent reads.
- **S3 Intelligent-Tiering**: A class for unknown or changing access patterns.
- **S3 Glacier Deep Archive**: A low-cost class for data read once or twice a year.
- **Lifecycle policy**: An S3 rule that can delete old object versions; [Module 6](../06-storage/05-amazon-s3-storage-classes-and-s3-lifecycle.md) covers more.
- **VPC endpoint**: A private VPC link to AWS services, off the public internet.
