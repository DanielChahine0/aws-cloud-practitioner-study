---
module: 12
lesson: 4
slug: migration-services-and-tools
title: "Migration Services and Tools"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 12: Migrating to the AWS Cloud, lesson: Migration Services and Tools"
concepts:
  - migration-evaluator
  - aws-application-discovery-service
  - aws-migration-hub
  - aws-application-migration-service
  - aws-migration-and-modernization-competency-partners
---

# Migration Services and Tools

## Objectives

- Tell apart the four core migration services and the phase each serves.
- Know when to use Migration Evaluator, Application Discovery Service, Migration Hub or Application Migration Service.
- Know where to find partner help.

## Notes

### The four services side by side

| Service | Phase | Nickname | What you get | Pick it when |
|---|---|---|---|---|
| Migration Evaluator | Assess | Moving consultant | A data-driven business case: current versus target state, a readiness plan, projected cloud costs | The spend must be justified and budgeted |
| AWS Application Discovery Service | Mobilize | Detective | An automatic inventory of on-premises servers, databases and links, feeding a detailed migration plan | Inventory and dependencies are unknown |
| AWS Migration Hub | Mobilize, then migrate and modernize | Command center | One free place to discover, assess, plan, execute and track, with guidance and automated recommendations | The team needs every task and its progress in one view |
| AWS Application Migration Service | Migrate and modernize | Expert movers | Apps replicated to AWS faster, for less and with minimal downtime, optionally modernized | You are ready to move the apps themselves |

- Together: fewer errors and less downtime, planning savings, a simpler process, faster cloud value.

### Partner help

- The AWS Competency Partner Program lists migration partners by phase or kind of help: see [AWS Migration and Modernization Competency Partners](https://aws.amazon.com/migration/partner-solutions/).

## Visuals

- Phase banners: one image each for assess, mobilize, and migrate and modernize.
- Mover cartoon: a mover expects to haul only the app, but a compute resource and a database insist on coming, so dependencies travel together.
- Hub cartoon: a technician among status screens reports the migration is on track, picturing Migration Hub.

## Key takeaways

- Memory aid: Discovery Service inventories, Evaluator prices, Hub tracks, Application Migration Service moves.
- Migration Hub is free and spans mobilize through migrate and modernize.
- Application Migration Service moves and modernizes apps faster and cheaper.
- Competency partners fill expertise gaps.

## Scenarios

- Finance wants projected AWS costs before approving: Migration Evaluator.
- Nobody knows which servers an app relies on: AWS Application Discovery Service.
- Leaders want live status for every workstream: AWS Migration Hub.

## Terms

- **Migration Evaluator**: An assessment service that builds a cost-backed business case.
- **AWS Application Discovery Service**: A service that inventories on-premises servers and their connections.
- **AWS Migration Hub**: A free central hub for planning and tracking a migration.
- **AWS Application Migration Service**: A service that moves apps to AWS and can modernize them.
- **AWS Migration and Modernization Competency Partners**: AWS partners specializing in migration phases or needs.
