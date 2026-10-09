---
module: 9
lesson: 1
slug: introduction-to-security-on-aws
title: "Introduction to Security on AWS"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 9: Security, lesson: Introduction to Security on AWS"
concepts:
  - authentication
  - authorization
  - shared-responsibility-model
  - security-in-the-cloud
  - security-of-the-cloud
  - aws-security-controls
---

# Introduction to Security on AWS

## Objectives

- Tell authentication from authorization.
- Split security duties by owner.
- Name the three AWS control goals.

## Notes

### Authentication and authorization

- Authentication checks credentials, like a username and password, to prove identity.
- Authorization then uses granted rights to limit that identity's actions.
- Example: a portal login is authentication, and seeing only your own file is authorization.
- Encryption (encoding data) and auditing (reviewing logs) are separate.
- Both guard users' personal data, keeping trust and blocking identity theft, fraud and misuse.

### Shared responsibility

- **Customer side: security in the cloud.**
  - Customers control their content, so they secure all they create and manage: data, systems, apps, access.
  - They pick what data and workloads to store or run, and on which services.
- **AWS side: security of the cloud.**
  - AWS runs every layer: service software, virtualization, hardware, Regions, AZs, edge locations.
  - Physical sites too: building access, environmental safeguards, redundant power and surveillance.
- AWS supplies tools such as encryption and IAM, and customers configure them.

### Security controls

- Controls **prevent** incidents by access management, **protect** networks, apps and data, and **detect and respond** to incidents.

## Visuals

- **Key concepts timeline**: portal example, shared model, control goals.

## Key takeaways

- Authentication proves identity, then authorization limits actions.
- Customers secure data, workloads, service choices and access.
- AWS secures the infrastructure and physical sites.
- Controls: prevent, protect, detect and respond.

## Scenarios

- A signed-in user's request is checked against their rights: authorization.
- Sensitive records on AWS: the customer protects them.

## Terms

- **Authentication**: Proving identity with credentials.
- **Authorization**: Deciding what a proven identity may do.
- **AWS Shared Responsibility Model**: The AWS-customer security split.
- **Security in the cloud**: The customer's share of security duties.
- **Security of the cloud**: The AWS share of security duties.
