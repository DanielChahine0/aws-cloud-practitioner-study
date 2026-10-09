---
module: 9
slug: security
title: "Module 9: Security"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 9: Security"
lessons: 6
assessment_questions: 10
---

# Module 9: Security

## What this module covers

This module explains how cloud security is shared between AWS and its customers, starting with authentication, authorization and the AWS shared responsibility model.
It then walks through three groups of AWS security controls: preventing unauthorized access with AWS IAM and related services, protecting networks, applications and data, and detecting and responding to incidents.
It closes with places to find AWS security documentation and third-party security tools on AWS Marketplace.

## Lessons

### Module 9 Introduction

1. **[Introduction to Security on AWS](01-introduction-to-security-on-aws.md)**: authentication versus authorization, the shared responsibility model and the three groups of AWS security controls.

### AWS Security Controls

2. **[Preventing Unauthorized Access](02-preventing-unauthorized-access.md)**: the root user and MFA, IAM users, groups, roles and policies, least privilege, an IAM console demo, IAM Identity Center, Secrets Manager and Systems Manager.
3. **[Protecting Networks and Applications](03-protecting-networks-and-applications.md)**: DoS and DDoS attacks, the UDP flood, security groups, ELB, Regions, AWS Shield and AWS WAF.
4. **[Protecting Data](04-protecting-data.md)**: encryption at rest and in transit, built-in encryption in S3, EBS and DynamoDB, AWS KMS, ACM and Amazon Macie.
5. **[Detecting and Responding to Security Incidents](05-detecting-and-responding-to-security-incidents.md)**: Amazon Inspector, Amazon GuardDuty, Amazon Detective and AWS Security Hub.
6. **[Additional Security Resources](06-additional-security-resources.md)**: AWS security documentation sources and security tools on AWS Marketplace.

## Key takeaways

- Authentication verifies identity, and authorization decides what that identity may do.
- AWS secures the cloud itself (software, virtualization, hardware, global infrastructure and physical data centers), while customers secure what they put in it (data, workloads, service choices and access).
- AWS supplies security tools such as encryption and IAM, and customers are responsible for configuring and using them.
- Lock down the AWS account root user with a strong password and MFA, and use IAM identities for daily work.
- IAM denies everything by default, and the principle of least privilege guides what you then allow.
- IAM users are individuals, groups share permissions, roles grant temporary permissions, and JSON policies define access once attached to an identity.
- IAM Identity Center gives the workforce single sign-on through federation, Secrets Manager centrally stores, retrieves and rotates credentials and API keys, and Systems Manager oversees and patches nodes.
- Region-scale infrastructure, customer-configured security groups and Elastic Load Balancing absorb DDoS traffic, AWS Shield Standard is free and Shield Advanced is paid, and AWS WAF blocks requests from IP addresses on a web ACL.
- Data is protected at rest by built-in encryption and AWS KMS keys and in transit by SSL/TLS certificates managed in ACM, while Amazon Macie finds sensitive data in S3.
- Amazon Inspector finds vulnerabilities, GuardDuty detects threats, Detective investigates root causes, and Security Hub aggregates findings.

## What the assessment focuses on

The module assessment has 10 questions.

- Authentication and how it differs from authorization: 1 question.
- What AWS secures under the AWS shared responsibility model: 1 question.
- The principle of least privilege: 1 question.
- Protecting the AWS account root user: 1 question.
- IAM groups for permissions shared by many users: 1 question.
- AWS IAM Identity Center for single sign-on with an existing identity source: 1 question.
- AWS Shield for no-cost DDoS protection: 1 question.
- SSL/TLS certificates for encryption in transit: 1 question.
- AWS KMS for creating and managing encryption keys: 1 question.
- Amazon Inspector for automated vulnerability assessments: 1 question.

## Summary

- Security on AWS is a partnership: AWS guards the infrastructure, and each customer guards what they build on it.
- Prevent: control who can act with IAM, a locked-down root user and least privilege.
- Protect: rely on Region-scale infrastructure, AWS Shield and AWS WAF for networks and apps, and on encryption with AWS KMS and ACM for data.
- Detect and respond: find, investigate and track problems with Amazon Inspector, Amazon GuardDuty, Amazon Detective and AWS Security Hub.

## Further reading

- [AWS Identity and Access Management (IAM)](https://aws.amazon.com/iam/): the starting point whenever you decide who in an account may do what.
- [AWS IAM Identity Center](https://aws.amazon.com/iam/identity-center/): for when employees should sign in to AWS with the work login they already have.
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/): for when apps need passwords, database credentials or API keys kept in one place and rotated.
- [AWS Systems Manager](https://aws.amazon.com/systems-manager/): for overseeing and patching many nodes across AWS, other clouds and hybrid setups.
- [AWS Shield](https://aws.amazon.com/shield/): for keeping everyday DDoS floods away from your networks and apps.
- [AWS WAF](https://aws.amazon.com/waf/): for turning away web requests from IP addresses you have blocked.
- [AWS Key Management Service (AWS KMS)](https://aws.amazon.com/kms/): for owning and controlling the keys that lock your data.
- [Amazon Macie](https://aws.amazon.com/macie/): for learning where sensitive data lives in S3 and whether it is safe.
- [AWS Certificate Manager (ACM)](https://aws.amazon.com/certificate-manager/): for issuing and tracking the certificates that keep traffic encrypted.
- [Amazon Inspector](https://aws.amazon.com/inspector/): for scanning workloads for known flaws and weak settings.
- [Amazon GuardDuty](https://aws.amazon.com/guardduty/): for an always-on watch over the account for signs of attack.
- [Amazon Detective](https://aws.amazon.com/detective/): for tracing how a detected threat happened.
- [AWS Security Hub](https://aws.amazon.com/security-hub/): for seeing every security finding and your compliance status in one place.
