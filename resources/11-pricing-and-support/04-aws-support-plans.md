---
module: 11
lesson: 4
slug: aws-support-plans
title: "AWS Support Plans"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 11: Pricing and Support, lesson: AWS Support Plans"
concepts:
  - aws-support-plans
  - aws-trusted-advisor
  - technical-account-manager
  - aws-re-post
  - aws-trust-and-safety-center
  - aws-solutions-architects
  - aws-professional-services
  - aws-self-support-resources
  - aws-business-support-plus
  - aws-enterprise-support
  - aws-unified-operations
---

# AWS Support Plans

## Objectives

- Compare the AWS Support plans.
- Name the other technical support options at AWS.
- Name the AWS self-support resources.

## Notes

### How the plans stack

- Support exists for every customer, and each plan includes the one below plus more tools, personal help and speed.

### Plan comparison

| Plan | Best for | Fastest response | Trusted Advisor | TAM |
|---|---|---|---|---|
| Basic | All customers, free | No incident response | Core | None |
| Developer | Experiments, tests | Guidance under 24 hr, impaired under 12 hr | Core | None |
| Business | Production (minimum) | Impaired under 4 hr, down under 1 hr | Full | None |
| Enterprise On-Ramp | Production, business-critical | Business-critical down under 30 min | Full | Pool, proactive guidance |
| Enterprise | Business- and mission-critical | Critical down under 15 min | Full, plus account team priorities | Designated, architecture and operations advice |

### What the plans add

- Basic: 24/7 customer service, docs, whitepapers, forums, re:Post and the AWS Personal Health Dashboard (service health, with alerts when your resources may be hit).
- Developer adds email to Support, and Business adds phone access plus paid infrastructure event management for big launches or global ad pushes.
- A TAM, your main AWS contact, monitors your environment and advises on services, architecture, cost and AWS programs, such as combining services in one app.

### End of support notice

- Per the course, Developer, Business and Enterprise On-Ramp Support end on January 1, 2027, and a linked page compares the new options.
- **Exam guide update** (verified_on 2026-10-09, [CLF-C02 Domain 4](https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain4.html)): The exam guide names four Support plans: Basic Support, AWS Business Support+, AWS Enterprise Support and AWS Unified Operations.
- **Exam guide update** (verified_on 2026-10-09, [Compare AWS Support plans](https://aws.amazon.com/premiumsupport/plans/)): AWS calls Business Support+ the minimum plan it recommends for production workloads.
- **Exam guide update** (verified_on 2026-10-09, [Compare AWS Support plans](https://aws.amazon.com/premiumsupport/plans/)): With Business Support+, a business-critical or mission-critical system that is down gets a response in under 30 minutes.
- **Exam guide update** (verified_on 2026-10-09, [Compare AWS Support plans](https://aws.amazon.com/premiumsupport/plans/)): Enterprise Support includes a designated technical account manager.
- **Exam guide update** (verified_on 2026-10-09, [Compare AWS Support plans](https://aws.amazon.com/premiumsupport/plans/)): With Enterprise Support, a business-critical or mission-critical system that is down gets a response in under 15 minutes.
- **Exam guide update** (verified_on 2026-10-09, [Compare AWS Support plans](https://aws.amazon.com/premiumsupport/plans/)): Unified Operations is the only plan that includes 24/7 workload monitoring.
- **Exam guide update** (verified_on 2026-10-09, [Compare AWS Support plans](https://aws.amazon.com/premiumsupport/plans/)): With Unified Operations, an Incident Management Engineer responds in under 5 minutes when a business-critical or mission-critical system is down.

### Beyond the plans

- AWS Support looks past problems to customer success, so more help exists.
- AWS re:Post: community Q&A that hosts the AWS Knowledge Center of FAQ articles and videos.
- AWS Trust and Safety Center: report suspected abuse.
- AWS solutions architects: for Business and Enterprise customers, help designing scalable, secure apps, with architecture and best practice advice.
- AWS Professional Services: project-based consulting, such as complex migrations, security audits and performance tuning.
- Self-support: user guides, SDK guides, blog posts and whitepapers.

## Visuals

- **Support plan table**: the five plans side by side.
- **Additional resources graphic**: five markers, one per extra resource.

## Key takeaways

- Plans are cumulative, from free Basic to Enterprise.
- Business is the production minimum and adds the full Trusted Advisor set.
- Outage response: Business 1 hr, On-Ramp 30 min, Enterprise 15 min.
- Only the two Enterprise plans include TAMs.
- Developer, Business and Enterprise On-Ramp end on January 1, 2027.

## Scenarios

- A major launch or campaign: infrastructure event management.
- A security audit or complex migration: AWS Professional Services.
- Suspected abuse on AWS: the AWS Trust and Safety Center.

## Terms

- **AWS Support plans**: Five cumulative tiers, Basic to Enterprise.
- **AWS Trusted Advisor**: Account checks, core or full set by plan; see [Module 10](../10-monitoring-compliance-and-governance/10-aws-trusted-advisor.md).
- **AWS Personal Health Dashboard**: A personal service health view with alerts.
- **Infrastructure event management**: Paid event planning help, from Business up.
- **Technical account manager (TAM)**: Your main AWS contact on Enterprise plans.
- **AWS re:Post**: Community Q&A for AWS.
- **AWS Knowledge Center**: re:Post's FAQ articles and videos.
- **AWS Trust and Safety Center**: Where to report abuse.
- **AWS solutions architects**: Design advisers for Business and Enterprise.
- **AWS Professional Services**: Project-based AWS consulting.
- **Self-support resources**: Docs, SDK guides, blogs and whitepapers.
