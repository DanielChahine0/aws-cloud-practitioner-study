---
module: 11
slug: pricing-and-support
title: "Module 11: Pricing and Support"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 11: Pricing and Support"
lessons: 6
assessment_questions: 10
---

# Module 11: Pricing and Support

## What this module covers

This module explains how AWS charges for its services, through three pricing principles and three main cost drivers, and which tools help you estimate, track, budget and forecast spending.
It then covers where help comes from, comparing the AWS Support plans and the extra resources around them, such as re:Post, solutions architects, AWS Professional Services, AWS Marketplace and the AWS Partner Network.
A closing real-life example applies these ideas to cost optimization across EC2, RDS and S3.

## Lessons

### Module 11 Introduction

1. **[Introduction to Pricing and Support](01-introduction-to-pricing-and-support.md)**: the two questions the module answers, told through the coffee shop's bills, broken espresso machine and waste.

### AWS Pricing

2. **[AWS Pricing Concepts](02-aws-pricing-concepts.md)**: pay as you go, save when you commit, pay less by using more, and the compute, storage and outbound data transfer cost drivers.
3. **[AWS Pricing and Billing Services](03-aws-pricing-and-billing-services.md)**: consolidated billing with AWS Organizations, and a side-by-side guide to the billing dashboard, AWS Budgets, AWS Cost Explorer and the AWS Pricing Calculator.

### AWS Support

4. **[AWS Support Plans](04-aws-support-plans.md)**: a comparison table of the five plans, TAMs, the 2027 end-of-support notice and help beyond the plans.
5. **[AWS Marketplace and AWS Partners](05-aws-marketplace-and-aws-partners.md)**: the catalog of third-party software, data and services, and the AWS Partner Network with its partner benefits.

### Cloud in Real Life

6. **[Cost Optimization](06-cost-optimization.md)**: rightsizing, Spot Instances, auto scaling, read replicas, S3 storage classes and VPC endpoints in one architecture.

## Key takeaways

- AWS pricing rests on three principles: pay as you go, save when you commit and pay less by using more.
- Compute, storage and outbound data transfer are the three fundamental cost drivers, and inbound transfer is usually free.
- AWS Organizations, not the billing dashboard, consolidates billing for many accounts into one bill sent to the primary account.
- The billing dashboard shows current charges, AWS Budgets is the one tool that alerts on thresholds, AWS Cost Explorer analyzes and forecasts spending, and the AWS Pricing Calculator estimates costs before deployment.
- Support plans are cumulative, from free Basic Support through Developer, Business and Enterprise On-Ramp to Enterprise, with faster responses and more personal help at each step.
- The course notes that Developer, Business and Enterprise On-Ramp Support will be discontinued on January 1, 2027.
- Only Enterprise On-Ramp and Enterprise include technical account managers, and Enterprise alone has a 15-minute response for critical outages.
- AWS re:Post, the Trust and Safety Center, solutions architects, AWS Professional Services and AWS documentation add help outside the plans.
- AWS Marketplace offers ready-made third-party software, data and services, and the AWS Partner Network helps partners build, market and sell AWS-based solutions.
- Rightsizing, Spot Instances, auto scaling, read replicas, the right S3 storage class and VPC endpoints combine into significant savings.

## What the assessment focuses on

The assessment has 10 questions.

- The three ways customers pay for AWS: 1 question.
- The three fundamental cost drivers: 1 question.
- AWS Organizations for consolidating billing across accounts: 2 questions, the answer in 1.
- The AWS Pricing Calculator for estimating costs before a migration: 1 question.
- AWS Budgets and AWS Cost Explorer as look-alike billing tools: 2 questions, never the answer.
- The Billing and Cost Management dashboard, which shows costs but does not manage accounts, as a look-alike: 1 question.
- Enterprise Support for a 15-minute response when mission-critical systems are down: 1 question, with Basic Support also a look-alike in 1 more.
- AWS Professional Services for security best practices and audits: 2 questions, the answer in 1.
- Self-support resources such as documentation, SDK guides and the AWS Blog: 2 questions, the answer in 1.
- The Trust and Safety team or center, re:Post and solutions architects as look-alike support options: 2 questions.
- AWS Marketplace as the fast route to compliance-ready software: 1 question, with AWS Shield from an earlier module as a look-alike.
- The APN's role in helping partners build, market and sell AWS-based solutions: 1 question.
- AWS Partner Funding as a key partner benefit: 1 question, where the look-alikes fail because the general training catalog serves every customer, early access is limited to some programs, and Dedicated Hosts and Instances are open to any paying customer.

## Summary

Paying for AWS comes down to three pricing principles, three cost drivers and a set of billing tools that each answer a different question: who pays, what is being spent, when to raise an alarm, what drives the bill, and what a new design will cost.
Help scales with need, from free Basic Support to an Enterprise plan with a designated TAM, and reaches past the plans to community answers, AWS experts, consultants, Marketplace software and partners.
The closing example shows that savings come from tuning a whole architecture rather than a single service.
[Module 12](../12-migrating-to-the-aws-cloud/README.md) moves on to migrating resources to the cloud.

## Further reading

- [Amazon S3 Pricing](https://aws.amazon.com/s3/pricing/?nc=sn&loc=4): Open it to see real rates for the S3 cost components, plus Free Tier details.
- [Amazon EC2 On-Demand Pricing](https://aws.amazon.com/ec2/pricing/on-demand/): Look up per-instance rates and the outbound data transfer chart behind the nonprofit example.
- [What is AWS Organizations?](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_introduction.html): Read before setting up several accounts with shared policies and one bill.
- [AWS Billing Console](https://aws.amazon.com/aws-cost-management/aws-billing/): Where to download invoices, check credits and discounts, and review spend across accounts.
- [AWS Budgets](https://aws.amazon.com/aws-cost-management/aws-budgets/): Go here to set spending limits that warn you, or even act, before costs run over.
- [AWS Cost Explorer](https://aws.amazon.com/aws-cost-management/aws-cost-explorer/): Use it when you need custom reports and forecasts of where money goes.
- [AWS Pricing Calculator Documentation](https://docs.aws.amazon.com/pricing-calculator/): How to price a design for free before building it.
- [AWS re:Post](https://repost.aws/): Ask the community, or search answers others already shared.
- [AWS Trust and Safety Center](https://repost.aws/aws-trust-and-safety): Report abuse and learn to protect your applications and messaging.
- [AWS Professional Services](https://aws.amazon.com/professional-services/): See what hands-on expert help for a cloud move looks like.
- [Welcome to AWS Documentation](https://docs.aws.amazon.com/index.html): The self-support starting point for every service.
- [AWS Marketplace](https://aws.amazon.com/marketplace): Browse ready-to-buy third-party software, data and services.
- [Engage with AWS Partners](https://partners.amazonaws.com/): Find a partner to help with your cloud journey.
- [Funding Benefits for AWS Partners](https://aws.amazon.com/partners/funding/): Check the credits and discounts partners can unlock.
- [AWS Partner Events](https://aws.amazon.com/events/aws-partner-events/?events-master-all.sort-by=item.additionalFields.startDateTime&events-master-all.sort-order=asc&awsf.events-master-type=*all&awsf.events-master-tech-category=*all&awsf.events-master-location=*all): Find upcoming partner webinars, workshops and in-person sessions.
- [AWS Partner Training and Certification](https://aws.amazon.com/partners/training/?nc2=sb_pt_pto): Partner-focused courses and certifications for building cloud skills by role.
