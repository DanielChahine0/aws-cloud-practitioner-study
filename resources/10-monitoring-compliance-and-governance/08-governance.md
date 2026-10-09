---
module: 10
lesson: 8
slug: governance
title: "Governance"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 10: Monitoring, Compliance, and Governance in the AWS Cloud, lesson: Governance"
concepts:
  - cloud-governance
  - aws-control-tower
  - control-tower-landing-zone
  - control-tower-account-factory
  - control-tower-controls
  - aws-service-catalog
  - aws-license-manager
  - bring-your-own-license
---

# Governance

## Objectives

- Explain when to use AWS Control Tower, AWS Service Catalog and AWS License Manager.

## Notes

### Why governance

- Growth makes accounts, services and licenses harder to keep in check.
- Governance means rules that keep building and running a deployment efficient and aligned with business goals.
- Cloud Town: a booming city's mayor lets builders act alone but enforces rules, like a height cap for a planned airport.
- On AWS, a rule might require department tags for costs, though any root user could in theory ignore it.

### AWS Control Tower

- It is Cloud Town's control room: one place to apply security, operations and compliance rules to every account and organization, however many.
- It matters more as builders multiply and setup grows complex.
- Blueprints automate setup, including federated access management and account provisioning workflows.
- Its four parts:
  - **Landing zone**: the outer, best-practice multi-account boundary; every OU, account, user and resource you want under compliance rules lives inside it.
  - **Account Factory**: stamps out each new account from one configurable template.
  - **Controls (guardrails)**: high-level rules, like road crash barriers, that block nonconforming deployments and catch and fix noncompliant accounts and resources.
  - **Dashboard**: an ongoing visual summary of provisioned accounts, controls and compliance status.
- Preconfigured controls speed multi-account setup, automate governance and integrate third-party software, saving time and adding control.
- Use it to ship apps fast and issue compliant accounts, whether new to AWS, building an environment or launching a cloud initiative.

### AWS Service Catalog

- Fielding every request is slow, but staff guessing at settings is worse.
- It lets you build, share and organize a curated catalog of approved resources, such as baseline networking and security tools for new accounts, for consistent governance.
- Staff self-serve quickly and stay agile across accounts.
- Uses: cross-account provisioning, access controls, faster CI/CD pipelines.
- It governs resources, while Control Tower governs account creation.

### AWS License Manager and BYOL

- Leaving on premises means deciding what to do with existing licenses.
- BYOL reuses vendor-bought licenses (Microsoft, say) on EC2 Dedicated Hosts or Amazon WorkSpaces, flexibly and often far cheaper than AWS-bought ones.
- License Manager tracks and controls those licenses and tunes their cost.
- It curbs noncompliance with usage caps, blocked launches and other controls.
- It also eases Microsoft License Mobility through Software Assurance and automates entitlement rollout across accounts.

## Visuals

- Control Tower graphic: the tower's dashboard oversees, Account Factory builds accounts with controls, a truck delivers them to the landing zone.
- License image: an employee sure they own a license they cannot find.
- Flashcards: one line each on the three services.

## Key takeaways

- Governance keeps cloud work efficient and aligned with company goals.
- Control Tower builds and polices a governed multi-account environment, with the landing zone as its outer boundary.
- Service Catalog offers curated, approved self-service resources.
- License Manager tracks licenses, enforces limits and supports BYOL.

## Scenarios

- Staff unsure which resources to launch: Service Catalog.
- Microsoft licenses moving to EC2 Dedicated Hosts: BYOL plus License Manager.
- A government agency wants each new account to meet approved requirements: Control Tower, not CloudTrail (records API calls) or License Manager (licenses).

## Terms

- **Governance**: rules keeping cloud work efficient and goal-aligned.
- **AWS Control Tower**: builds and polices a governed multi-account environment.
- **Landing zone**: the governed boundary around OUs, accounts, users and resources.
- **Account Factory**: one template for every new account.
- **Controls (guardrails)**: high-level governance rules.
- **AWS Service Catalog**: curated catalog of approved resources.
- **AWS License Manager**: manages software licenses and their cost.
- **BYOL**: using vendor-bought licenses on AWS.
