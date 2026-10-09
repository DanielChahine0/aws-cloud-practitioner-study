---
module: 2
lesson: 3
slug: how-to-provision-aws-resources
title: "How to Provision AWS Resources"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 2: Compute in the Cloud, lesson: How to Provision AWS Resources"
concepts:
  - aws-apis
  - aws-management-console
  - aws-cli
  - aws-sdk
  - aws-cloudshell
  - shared-responsibility-model
  - unmanaged-services
  - security-groups
---

# How to Provision AWS Resources

## Objectives

- Choose between the console, the AWS CLI and the AWS SDK when working with AWS.
- Split virtual machine duties between customer and AWS.
- Start telling managed from unmanaged services (EC2 is the unmanaged example, and managed services come later).

## Notes

### APIs behind every action

- Every AWS task, from launching to stopping or changing an instance, is an API request.
- An application programming interface (API) gives fixed entry points to provision, configure and manage resources.
- The console, the AWS CLI and the AWS SDK all call the same APIs.

### AWS Management Console

- A browser-based visual interface with search, quick service access and simplified workflows.
- Best for learning, test environments, bills, monitoring, non-technical tasks and one-time manual setups.
- Its mobile app checks resources, alarms and billing for several signed-in identities.
- Repeating its screens for every production launch is slow and invites slips like a missed checkbox.

### AWS CLI

- The AWS Command Line Interface (AWS CLI) issues API calls as text commands on Windows, macOS or Linux, so repetitive work can be scripted, and automation keeps deployments predictable.
- AWS CloudShell is an AWS-managed cloud terminal with the AWS CLI ready.
- Demo: `aws ec2 run-instances` creates a new instance, and `aws ec2 describe-availability-zones` lists the Region's AZs.

### AWS SDK

- The AWS Software Development Kit (AWS SDK) lets code in languages like Python, C++, Java and .NET call AWS, with AWS docs and sample code.
- The demo lists EC2 instances from a Python script.

### Shared responsibility for compute

- Under the AWS Shared Responsibility Model, AWS covers hardware and infrastructure, and you cover what runs on it: applications, data and access.
- EC2 is unmanaged, so you configure its security, the guest OS and its updates, and firewall rules called security groups.

## Visuals

- **Interacting with AWS accordion**: console, CLI and SDK, each with the user it suits.
- **Shared responsibility image**: customer duties for an unmanaged service atop AWS infrastructure.

## Key takeaways

- All AWS interaction is API calls, made through one of three tools.
- The console suits visual and one-off work, the CLI suits scripts, and the SDK suits application code.
- With EC2, the customer owns the guest OS, updates and security groups.

## Terms

- **API (application programming interface)**: a predefined way to manage resources programmatically.
- **AWS Management Console**: AWS's web-based graphical interface.
- **AWS Command Line Interface (AWS CLI)**: a tool for calling AWS APIs with typed commands.
- **AWS Software Development Kit (AWS SDK)**: language libraries for calling AWS from code.
- **AWS CloudShell**: a managed cloud terminal with the AWS CLI ready.
- **Unmanaged service**: a service like EC2 where the customer handles security and management.
- **Security group**: a customer-configured firewall for an EC2 instance.
