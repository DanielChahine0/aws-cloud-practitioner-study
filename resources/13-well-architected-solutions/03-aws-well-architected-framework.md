---
module: 13
lesson: 3
slug: aws-well-architected-framework
title: "AWS Well-Architected Framework"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 13: Well-Architected Solutions, lesson: AWS Well-Architected Framework"
concepts:
  - aws-well-architected-framework
  - operational-excellence-pillar
  - security-pillar
  - reliability-pillar
  - performance-efficiency-pillar
  - cost-optimization-pillar
  - sustainability-pillar
  - aws-well-architected-tool
---

# AWS Well-Architected Framework

## Objectives

- Explain why a working design still needs tuning.
- Describe the six pillars.
- Say what the AWS WA Tool does and does not do.

## Notes

### Why keep improving

- The framework aims past merely working, at secure, high-performing, resilient and efficient designs, with one consistent method for any workload.
- Needs change, so the pillars keep asking you to refine processes, resize as the workload becomes clearer and trim waste.

### The six pillars

- **Operational Excellence**: running and monitoring systems for business value, improving processes, pipeline-automated releases and good event response.
- **Security**: protection built in, with least-privilege access, intact data and guarded systems.
- **Reliability**: planning recovery from failures and adapting as business and customer needs grow.
- **Performance Efficiency**: sizing resources, such as an EC2 instance, to workload and memory needs, and revisiting that as needs move.
- **Cost Optimization**: lower spend through smarter allocation, such as cheaper specs for an underused instance and deprovisioning unneeded services.
- **Sustainability**: energy-efficient, lower-impact designs that avoid always-on resources, like Lambda over a nonstop EC2 instance or a smaller RDS instance, cutting cost, energy and carbon.

### Rightsizing: which pillar?

- The course cites downsizing an underused instance under both Performance Efficiency and Cost Optimization.
- Fitting capacity to the real workload is Performance Efficiency in the assessment; cutting spend via purchase options, budgets or deprovisioning is Cost Optimization.

### AWS Well-Architected Tool

- A free, self-service AWS service for reviewing and improving workloads against the six pillars.
- You define a workload, run the review on your account and get a report of issues, each with a best-practice fix.
- Questions can be marked not applicable and advice overridden.
- Features: workload reviews at its core, milestone tracking and custom lenses that adapt evaluations and improvement plans.
- IAM and API integration support teamwork and progress tracking for architects, engineers and compliance teams.
- Result: consistent, actionable, well-documented reviews.
- It does not migrate workloads across Regions, forecast costs (AWS Cost Explorer and AWS Budgets do) or manage permissions (IAM does, though the tool may use it for access control).

### Worked example: an online florist

- Holiday peaks (Valentine's Day, Mother's Day) test a working design of EC2 for the site, RDS for orders and customers and S3 for photos: how well does it scale?

| Pillar | Finding | Enhancement |
|---|---|---|
| Operational Excellence | Survive instance failures mid-rush; add infrastructure as code and auto-rollback self-healing | EC2 Auto Scaling |
| Security | Beyond the VPC: patching, least-privilege IAM, encryption at rest and in transit, fine-grained access | Stronger encryption and IAM policies |
| Reliability | Already in multiple AZs; add health monitoring and automated recovery | Amazon CloudWatch |
| Performance Efficiency | Rightsize EC2, RDS and Lambda against waste and underprovisioning; Lambda already scales event-driven image jobs, CloudFront already speeds images worldwide | AWS Compute Optimizer |
| Cost Optimization | Replace On-Demand with Spot for spiky traffic and Savings Plans for steady load; track spend live | Savings Plans, AWS Budgets, AWS Cost Explorer |
| Sustainability | Serverless and elastic resources already help; less waste helps planet and profit | AWS Cost & Usage Report |

## Visuals

- Pillar flashcards (two decks of three): name on the front, focus on the back.
- Florist walkthrough (arrow-driven process): finished design first, then the starting setup and one screen per pillar with its enhancement.
- WA Tool review screen (video): workload name, pillars, question drop-downs, an applicability toggle and per-question help.

## Key takeaways

- Pillar cues: automated releases point to Operational Excellence, least privilege and encryption to Security, multiple AZs and recovery to Reliability.
- Fitting size to workload points to Performance Efficiency, purchase options and deprovisioning to Cost Optimization, serverless over always-on to Sustainability.
- The free AWS WA Tool reviews workloads and suggests overridable fixes; it does not migrate, forecast costs or manage permissions.

## Scenarios

- Hand-run releases causing outages and drifting environments: a CI/CD pipeline such as AWS CodePipeline (Operational Excellence).

## Terms

- **AWS Well-Architected Framework**: AWS's six-pillar method for designing and judging architectures.
- **Well-Architected pillars**: The six review areas, from Operational Excellence to Sustainability.
- **Rightsizing**: Matching a resource's size to its real workload.
- **Deprovisioning**: Removing an unneeded resource to end its cost.
- **AWS Well-Architected Tool (AWS WA Tool)**: Free self-service workload review against the pillars.
- **Custom lens**: WA Tool option that tailors a review and its improvement plan.
- **AWS Compute Optimizer**: Helps keep resources neither wasted nor underprovisioned.
- **AWS Cost & Usage Report**: The florist's Sustainability enhancement, tied to cutting waste.
