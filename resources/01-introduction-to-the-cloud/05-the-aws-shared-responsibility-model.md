---
module: 1
lesson: 5
slug: the-aws-shared-responsibility-model
title: "The AWS Shared Responsibility Model"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 1: Introduction to the Cloud, lesson: The AWS Shared Responsibility Model"
concepts:
  - shared-responsibility-model
  - security-of-the-cloud
  - security-in-the-cloud
  - client-side-encryption
  - operating-system-patching
---

# The AWS Shared Responsibility Model

## Objectives

- Sort security duties into AWS, customer and shared.
- Name the model's components.

## Notes

### Who secures what

- House analogy: the builder makes the doors solid, the owner locks them.

| Owner | Duties |
|---|---|
| AWS (of the cloud) | Upkeep of facilities, hardware, networking and software behind all services; physical security, never shared (door locks, access control lists, privilege separation, surveillance, environmental controls); network and hypervisor isolation of customers |
| Customer (in the cloud) | The OS you run (as in the video) and its patches, applications, data, access, client-side encryption |
| Varies by service | Server-side encryption, traffic protection, platform and application management, OS, network and firewall configuration |

- Only you can sign in to your OS or add users, since AWS has no back door.
- The vendor supplies OS patches, but applying them is yours alone.
- You choose what data to store and, via AWS controls, who reaches it: everyone, some users, one person under conditions, or nobody.
- Encrypted data stays unreadable even if access is left open.

## Visuals

- Components graphic: three markers, for customer, shared and AWS duties.

## Key takeaways

- AWS owns security of the cloud, including all physical security, and the customer owns security in the cloud.
- Customers patch their OS and secure applications, data, access and client-side encryption.
- Server-side encryption and OS, network and firewall setup vary by service.

## Scenarios

- AWS spots a flaw in a customer's OS: it can only alert them, and they patch.
- Public retail photos versus locked-down bank records: customer-controlled access.

## Terms

- **AWS Shared Responsibility Model**: AWS and customers dividing security for an environment both can trust.
- **Security of the cloud**: AWS's share.
- **Security in the cloud**: the customer's share.
- **Hypervisor layer**: a virtualization layer that AWS secures.
- **Client-side encryption**: encrypting data on the client before the server gets it.
- **Server-side encryption**: encryption by the service, owner varying by service.
