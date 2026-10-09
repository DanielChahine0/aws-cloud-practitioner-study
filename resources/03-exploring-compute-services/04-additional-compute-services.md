---
module: 3
lesson: 4
slug: additional-compute-services
title: "Additional Compute Services"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 3: Exploring Compute Services, lesson: Additional Compute Services"
concepts:
  - aws-elastic-beanstalk
  - aws-batch
  - batch-computing
  - amazon-lightsail
  - aws-outposts
  - hybrid-deployment
---

# Additional Compute Services

## Objectives

- Explain how Elastic Beanstalk eases environment setup.
- Explain how AWS Batch runs big jobs at scale.
- Identify how Lightsail makes web hosting simple.
- Describe how Outposts brings AWS on premises for hybrid cloud.

## Notes

### AWS Elastic Beanstalk

- Give this fully managed service code and settings, and it builds the EC2 setup, scaling, load balancing and health checks.
- You can save configurations to redeploy and still control every resource.
- Raw EC2, by contrast, leaves deployment and scaling to you.
- It supports Java, Python, Docker and more, for web apps, APIs and microservices.

### AWS Batch

- A fully managed service for heavy compute such as huge datasets, simulations and complex math.
- It schedules jobs and scales resources to fit them across a fleet such as EC2 instances.
- It fits parallel work like genomics, media transcoding and ML training.

### Amazon Lightsail

- A cost-effective bundle: virtual private servers (VPSs) plus storage, databases and networking, for a predictable monthly price.
- It skips the complexity of traditional hosting and the full AWS Management Console.
- It fits blogs, small or low-traffic sites, and dev and test.

### AWS Outposts

- A fully managed hybrid cloud offering that brings AWS compute, storage and networking into your data center.
- AWS services run locally with the same tools and APIs as in the cloud.
- It fits compliance, data residency, low latency, remote sites and legacy app modernization.

## Key takeaways

- Each service is purpose-built, so match it to the job.
- Elastic Beanstalk deploys, scales and monitors web apps you still control.
- AWS Batch schedules and scales large parallel jobs.
- Lightsail is the simple, predictably priced pick for small sites.
- Outposts is the only one of the four on premises.

## Terms

- **AWS Elastic Beanstalk**: a service turning your code into a running, auto-scaled web environment.
- **AWS Batch**: a service that plans and scales compute for batch jobs.
- **Batch computing**: running large, compute-heavy jobs, often in parallel.
- **Amazon Lightsail**: easy, budget-friendly AWS hosting for small sites.
- **Virtual private server (VPS)**: the server in Lightsail's monthly bundle.
- **AWS Outposts**: AWS infrastructure running in your own data center.
- **Hybrid cloud**: on-premises infrastructure used alongside AWS.
