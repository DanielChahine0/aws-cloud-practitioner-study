---
module: 10
lesson: 10
slug: aws-trusted-advisor
title: "AWS Trusted Advisor"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 10: Monitoring, Compliance, and Governance in the AWS Cloud, lesson: AWS Trusted Advisor"
concepts:
  - aws-trusted-advisor
  - trusted-advisor-check-categories
  - service-limits
  - iam-access-analyzer
  - principle-of-least-privilege
  - multi-factor-authentication
---

# AWS Trusted Advisor

## Objectives

- Explain what AWS Trusted Advisor checks and how to act on its findings.
- Explain how IAM Access Analyzer supports least privilege.

## Notes

### An automated advisor

- Businesses gain from an outside expert who knows best practices and spots waste, savings and open security gaps.
- AWS Trusted Advisor is that expert, automated: it runs live best-practice checks across your account.
- Its checks fall into five categories: security, cost optimization, performance, service limits and fault tolerance.
- The callout states the same scope as optimizing cost, performance, security and resilience.
- Results appear by category in the AWS Management Console, and email alerts can reach billing, operations and security contacts.
- Some checks come with every account and more depend on your support plan: dozens on all plans, hundreds from Business Support up.
- Optimization is ongoing: turn Trusted Advisor on and act on its prioritized advice to optimize at scale.

### Example checks

- Status colors: red for action recommended, orange for investigation recommended, green for no problem found.

| Category | Checks | Why it matters |
| --- | --- | --- |
| Cost optimization | Idle RDS instances, ELB and EBS utilization, underused EC2 | Scale down or delete what is flagged |
| Performance | EBS volumes held back by their EC2 instance's throughput | - |
| Security | Root user without MFA, security groups open to the public | Exposed resources are at risk |
| Fault tolerance | EBS volumes without snapshots, EC2 not balanced across AZs, S3 buckets without proper logging | No backup means lost data, and one failing AZ or instance can disrupt the app |
| Service limits | Usage near or at a limit | Many are soft limits, raised through the Service Quota console |

### IAM Access Analyzer

- Trusted Advisor checks security broadly, but fine-grained IAM permissions need IAM Access Analyzer.
- It analyzes external access and checks policies against corporate security standards, so you can set, verify and refine permissions.
- It validates and auto-reviews IAM policies, shows who can access what, and trims unused or overly broad access toward least privilege.

### Look-alikes

- Amazon Inspector scans for software vulnerabilities, the AWS Shared Responsibility Model splits duties, and IAM Access Analyzer sets permissions, so none evaluates cost, security and performance.

## Key takeaways

- Trusted Advisor continuously checks your account against best practices in five categories.
- For ongoing cost, security and performance advice, pick Trusted Advisor over Inspector or IAM Access Analyzer.
- Your support plan sets how many checks you get.
- IAM Access Analyzer refines IAM permissions toward least privilege.

## Scenarios

- A multi-Region enterprise wants ongoing cost, security and performance reviews plus best practices: Trusted Advisor.
- EC2 instances crowded into one AZ: spread them across AZs so one failure cannot halt the app.

## Terms

- **AWS Trusted Advisor**: automated best-practice checker for accounts.
- **Soft limit**: a service limit that can be raised to a degree.
- **EBS snapshot**: a backup of an EBS volume.
- **IAM Access Analyzer**: sets, verifies and refines IAM permissions.
- **Least privilege**: granting only the access actually needed.
- **Amazon Inspector**: scans workloads for software vulnerabilities.
