---
module: 12
lesson: 3
slug: seven-migration-strategies
title: "Seven Migration Strategies"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 12: Migrating to the AWS Cloud, lesson: Seven Migration Strategies"
concepts:
  - seven-migration-strategies
  - migration-strategy-relocate
  - migration-strategy-rehost
  - migration-strategy-replatform
  - migration-strategy-refactor
  - migration-strategy-repurchase
  - migration-strategy-retain
  - migration-strategy-retire
---

# Seven Migration Strategies

## Objectives

- Tell the seven Rs apart and pick the one that fits a given application.

## Notes

### How to choose a strategy

- Each app gets one of seven paths, chosen by complexity, goals, time, resources, starting point and future plans.
- Organizations often combine them into a tailored plan with less risk and disruption.

### The seven Rs

| Strategy | Also called | What happens | Trade-off or example |
|---|---|---|---|
| Relocate | - | VMs or containers already running on premises move to a cloud host | - |
| Rehost | Lift and shift | Apps move as they are, often servers turned into VMs, with no changes at first | Misses some benefits, yet can cut total costs by up to 30 percent; most apps in a legacy migration that must scale fast |
| Replatform | Lift, tinker and shift | A few cloud optimizations for a tangible gain, without new code or architecture changes | MySQL to Amazon RDS unchanged, or to Amazon Aurora, helping the database team and performance |
| Refactor | Re-architect | New code and cloud-built features, driven by a strong need for features, scale or performance | Big payoff, but the highest upfront planning and staff effort |
| Repurchase | Drop and shop | A traditional license swapped for SaaS, often a new vendor and a fresh start | A database license dropped for cloud databases, or a CRM replaced by new sales force software; the new package can be slow to adopt and cost more upfront |
| Retain | Stays where it lays | Business-critical apps stay in the source environment for now: those needing major refactoring, work that can wait, or apps months from deprecation | Migrate only what makes business sense; retire these in place later |
| Retire | - | Unneeded apps are switched off | Often over 10 percent of a portfolio is unused; ending it saves cost and effort |

## Visuals

- Seven strategies diagram: apps pass through discovery and are sorted into the seven Rs, one marker each.

## Key takeaways

- Rehost changes nothing, replatform adds small optimizations, and refactor writes new code at the highest upfront cost.
- Repurchase trades licensed software for SaaS, often from a new vendor.
- Retain and retire involve no migration.

## Scenarios

- Legacy estate that must scale fast: rehost.
- MySQL to Amazon RDS with no code changes: replatform.

## Terms

- **Relocate**: Moving existing VMs or containers to the cloud.
- **Rehost**: Moving apps to AWS unchanged.
- **Replatform**: Moving apps with small cloud optimizations.
- **Refactor**: Rebuilding an app with new code and cloud-built features.
- **Repurchase**: Replacing licensed software with SaaS.
- **Retain**: Keeping business-critical apps where they are for now.
- **Retire**: Shutting down apps no longer needed.
