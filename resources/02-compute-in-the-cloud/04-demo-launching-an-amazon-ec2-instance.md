---
module: 2
lesson: 4
slug: demo-launching-an-amazon-ec2-instance
title: "Demo: Launching an Amazon EC2 Instance"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 2: Compute in the Cloud, lesson: Demo: Launching an Amazon EC2 Instance"
concepts:
  - launching-ec2-instances
  - amazon-machine-image
  - ami-repeatability
  - ec2-key-pairs
  - ec2-user-data
  - aws-marketplace
---

# Demo: Launching an Amazon EC2 Instance

## Objectives

- Identify the main settings for launching an EC2 instance.
- Explain how AMIs keep scaled-out instances consistent.

## Notes

### Launching a web server

- In the EC2 console's launch instance flow, the demo sets these.
- **Name**: to find the instance later.
- **AMI**: OS and bundled apps, here the default Amazon Linux AMI.
- **Instance type**: compute power, here t2.micro (1 vCPU, 1 GB memory, Free Tier).
- **Key pair**: a public key on the instance and a private key you keep for logging in, created at launch or reused.
- **Network settings**: allow HTTP from the internet.
- **Storage**: an 8 GB gp3 Amazon Elastic Block Store (Amazon EBS) volume.
- **User data**: a launch script, here installing and starting Nginx, which the generic AMI lacks.
- Browsing to the public IP address then shows the web page.

### What an AMI is and is not

- An AMI holds the OS, architecture, storage layout, preinstalled software and launch permissions.
- It does not set size or networking, and it is no data store or backup, since instance data typically lives on volumes like Amazon EBS.
- Build a custom AMI, use an AWS one for common operating systems and software, or buy one on AWS Marketplace.
- Launching from one AMI with automated deployments gives identical setups, consistent dev and test, fewer errors, easier scaling and simpler large fleets.

## Visuals

- **AMI timeline**: contents, sources and repeatability of AMIs.

## Key takeaways

- Each setting has a job: AMI for software, instance type for hardware, storage for disk, key pair for login, network settings for traffic.
- An AMI is a configuration template, not a backup.
- User data configures an instance at launch.

## Scenarios

- A generic Linux instance must serve web pages: install Nginx with user data.
- Identical servers for scaling out: launch them from one AMI.

## Terms

- **Amazon Machine Image (AMI)**: a prebuilt image with an instance's OS, software and setup.
- **Key pair**: public and private keys used to log in to an instance.
- **User data**: a script run at launch to configure an instance.
- **Amazon Elastic Block Store (Amazon EBS)**: volumes, such as gp3, that give an instance its disk.
- **AWS Marketplace**: where third-party vendors sell specialized AMIs.
