---
module: 9
lesson: 2
slug: preventing-unauthorized-access
title: "Preventing Unauthorized Access"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 9: Security, lesson: Preventing Unauthorized Access"
concepts:
  - aws-iam
  - aws-account-root-user
  - multi-factor-authentication
  - principle-of-least-privilege
  - iam-policies
  - aws-iam-identity-center
  - aws-secrets-manager
  - aws-systems-manager
  - iam-access-reports
  - access-keys
  - iam-password-policies
  - cross-account-iam-roles
  - custom-policies
---

# Preventing Unauthorized Access

## Objectives

- Explain why IAM is the first defense against unauthorized access.
- Secure the root user as AWS advises.
- Choose the right IAM identity and policy for an access need.
- Match IAM Identity Center, Secrets Manager and Systems Manager to their jobs.

## Notes

### The AWS account root user

- Every new AWS account comes with a root user, the owner, who can do anything and cannot be restricted.
- Coffee shop analogy: the owner can work the register, the stock system or anything else in the shop.
- Give it a strong password and turn on multi-factor authentication (MFA) right after the first root login.
- MFA requires at least two kinds of proof, such as the password plus a one-time code from a phone app.
- Even then, keep the root user out of daily work and use IAM identities instead.
- **Exam guide update** (verified_on 2026-10-09, [Set an account password policy for IAM users](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_passwords_account-policy.html)): Password policies set account-wide rules for IAM user passwords, such as minimum length, required character types, expiration and preventing reuse, but they never apply to the root user password.

### IAM, default deny and least privilege

- AWS Identity and Access Management (IAM) gives fine-grained control over identities and what each may do, covering authentication and authorization.
- **Default deny** is the mechanism: a new identity has zero permissions, not even to launch an EC2 instance or create an S3 bucket, until explicitly allowed.
- **Least privilege** is the guiding principle: allow only what a person or system needs.
- Not the same thing: a permission boundary caps the most permissions an identity can hold, and role-based access control ties access to a person's job in the organization.

### Which IAM identity when

- **IAM user**: one person or application with its own credentials, and AWS advises one per person who needs access.
- **IAM group**: users who all inherit the group's permissions, ideal when many people need the same baseline access.
- **IAM role**: an identity someone assumes for temporary permissions, with no long-term username or password.
  - Assuming it swaps your earlier permissions for the role's set.
  - Coffee shop analogy: switching from barista to cashier at midday means changing roles.
  - People, external identities, applications and AWS services can use roles, which also enable federated and cross-account access.
  - Roles are not meant for permanent access.
- **Federation at scale**: rather than an IAM user per employee, staff use their corporate login mapped to IAM roles, set up through AWS IAM Identity Center with single sign-on (SSO).
- **Exam guide update** (verified_on 2026-10-09, [Manage access keys for IAM users](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html)): Access keys are long-term credentials, an access key ID plus a secret access key, that sign programmatic requests to the AWS CLI or API, and AWS advises temporary credentials from roles instead and never creating them for the root user.
- **Exam guide update** (verified_on 2026-10-09, [IAM tutorial: Delegate access across AWS accounts using IAM roles](https://docs.aws.amazon.com/IAM/latest/UserGuide/tutorial_cross-account-with-roles.html)): With cross-account IAM roles, users in one AWS account assume a role in another account and get temporary credentials there, so nobody needs a separate IAM user in each account.

### IAM policies

- A policy, written in JSON, holds allow or deny rules for AWS services and resources, scoped as wide as every S3 bucket or as narrow as one.
- It only takes effect once attached to a user, group or role.
- Each statement sets an **Effect** (only Allow or Deny), an **Action** (any AWS API call) and a **Resource** (what the call targets).
- Example: Allow `s3:ListBucket` on one reports bucket lets a user view that bucket and nothing else.
- **Exam guide update** (verified_on 2026-10-09, [IAM last accessed information](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_last-accessed.html)): IAM access reports show last accessed information, meaning which services and actions each user, role or policy actually tried to use, so you can remove unused permissions and keep least privilege.
- **Exam guide update** (verified_on 2026-10-09, [Managed policies and inline policies](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_managed-vs-inline.html)): Custom policies are customer managed or inline policies that you write and change yourself for your own use cases, unlike AWS managed policies, which AWS creates and you cannot edit.

### Lessons from the IAM console demo

- Prefer adding users to a group over attaching policies one by one, since shared permissions then change in one place.
- **AWS managed policies** are prebuilt by AWS and reusable, while **customer managed policies** are your own custom ones.
- A role can require MFA and carry read-only S3 policies, so it reaches that S3 data and nothing else.

### Additional access management services

- Together these three ease administration and strengthen security, all in support of least privilege.
- **AWS IAM Identity Center** centralizes workforce access across AWS accounts and applications.
  - Linked to an existing identity source, it gives staff one login for every connected account and service, which is SSO.
  - This is federated identity management: one credential set for many applications, services or domains.
  - IAM alone lacks the federation needed to connect an outside identity source.
- **AWS Secrets Manager** is the central place to store, fetch and rotate secrets such as passwords, database credentials and API keys.
- **AWS Systems Manager** shows all your nodes, meaning connection points, across accounts, Regions, multi-cloud and hybrid setups in one view.
  - It reports details like node ID and operating system and automates registry changes, user management and security patching.

## Visuals

- **IAM labeled graphic**: five markers around a diagram where the MFA-protected root user sets up users, groups and roles, each governed by permission policies.
- **Policy statement example (video)**: a short JSON snippet with its Effect, Action and Resource parts labeled.

## Key takeaways

- Protect the root user with a strong password and MFA, then keep it out of daily work.
- Default deny is how IAM behaves, and least privilege is the principle for deciding what to allow.
- Users are individuals, groups share permissions, and roles grant temporary permissions without long-term credentials.
- A policy defines access only once it is attached to an identity.
- IAM Identity Center provides workforce SSO by federating with an existing identity source.
- Secrets Manager centrally manages and rotates credentials and API keys, and Systems Manager oversees and patches nodes.

## Scenarios

- The coffee shop owner who can use every system: the AWS account root user.
- Extra permissions needed only for a short task: an IAM role.
- A whole team needs the same baseline access: an IAM group.
- Defining which S3 bucket people may open: an IAM policy attached to their identities.
- Staff should reach AWS with their usual corporate login: IAM Identity Center.
- Apps need passwords and keys kept and rotated centrally: AWS Secrets Manager.

## Terms

- **AWS account root user**: The all-powerful owner identity of an AWS account.
- **Multi-factor authentication (MFA)**: A login needing two or more verification methods.
- **AWS Identity and Access Management (IAM)**: The service that controls identities and their access.
- **Default deny**: IAM's rule that every action is refused until allowed.
- **Principle of least privilege**: Granting only the access that is needed.
- **IAM user**: An identity for one person or application.
- **IAM group**: A set of users sharing the group's permissions.
- **IAM role**: An identity assumed for temporary permissions.
- **IAM policy**: A JSON document of allow and deny rules attached to identities.
- **AWS managed policy**: A prebuilt policy that AWS maintains.
- **Customer managed policy**: A policy you write yourself.
- **Federated identity management**: One set of credentials for many applications, services or domains.
- **Single sign-on (SSO)**: One login for every connected account and service.
- **AWS IAM Identity Center**: The service for central workforce access and SSO.
- **AWS Secrets Manager**: The service that stores, retrieves and rotates secrets.
- **Secret**: Private information such as a password, database credential or API key.
- **AWS Systems Manager**: The service that centrally manages nodes and automates patching.
- **Node**: A connection point in a network, system or structure.
