---
module: 12
slug: migrating-to-the-aws-cloud
title: "Module 12: Migrating to the AWS Cloud"
source: "AWS Cloud Practitioner Essentials (AWS Skill Builder), Module 12: Migrating to the AWS Cloud"
lessons: 7
assessment_questions: 9
---

# Module 12: Migrating to the AWS Cloud

## What this module covers

This module explains what cloud migration is and the three phases a large migration goes through: assess, mobilize, and migrate and modernize.
It introduces the AWS Cloud Adoption Framework with its six perspectives, and the seven migration strategies.
It then matches AWS services to each job: four services for applications, AWS DMS and AWS SCT for databases, and DataSync, Transfer Family, Direct Connect and Snowball Edge for data.

## Lessons

### Module 12 Introduction

1. **[Introduction to Migration](01-introduction-to-migration.md)**: what cloud migration is and the three phases with their supporting services.

### Migration Frameworks and Strategies

2. **[AWS Cloud Adoption Framework](02-aws-cloud-adoption-framework.md)**: AWS CAF, its benefits, its six perspectives and the AWS CAF Action Plan.
3. **[Seven Migration Strategies](03-seven-migration-strategies.md)**: the seven Rs, from relocate to retire, and when each one fits.

### Migration Services and Tools

4. **[Migration Services and Tools](04-migration-services-and-tools.md)**: Migration Evaluator, Application Discovery Service, Migration Hub, Application Migration Service and competency partners, compared side by side.

### Migrating Databases to the AWS Cloud

5. **[Database Migrations](05-database-migrations.md)**: homogeneous and heterogeneous moves, and when to use AWS DMS or AWS SCT.

### Migrating Data to the AWS Cloud

6. **[Transferring Data Online](06-transferring-data-online.md)**: DataSync, Transfer Family and Direct Connect for online transfers.
7. **[Transferring Data Offline](07-transferring-data-offline.md)**: Snowball Edge Storage Optimized devices for offline, multi-petabyte moves.

## Key takeaways

- Cloud migration is rarely one and done; large moves follow three sequential phases: assess, mobilize, then migrate and modernize.
- AWS CAF organizes its guidance into six perspectives and also provides tools to speed the move: Business, People and Governance on the business side, Platform, Security and Operations on the technical side.
- The People perspective drives organization-wide change management, and the Platform perspective covers architecture and moving workloads.
- Organizations often combine the seven Rs: relocate, rehost, replatform, refactor, repurchase, retain, retire.
- Migration Evaluator prices the move for the business case, Application Discovery Service inventories servers and dependencies, Migration Hub tracks everything in one free place, and Application Migration Service moves and modernizes applications.
- AWS DMS moves databases with low downtime while the source stays live, and AWS SCT converts schemas and code objects when the target engine differs.
- DataSync manages most online data migrations with scheduling and task reporting, Transfer Family runs managed file transfers over protocols like SFTP and FTPS, and Direct Connect only supplies a dedicated link.
- Snowball Edge Storage Optimized devices move data offline when bandwidth, connectivity or sheer volume rules out an online transfer.

## What the assessment focuses on

The module assessment has 9 questions.

- AWS Cloud Adoption Framework: 3 questions, on which perspective owns organization-wide change management, on the framework's purpose, and with its perspectives as a distractor among the strategies.
- Seven migration strategies: 2 questions, once as the answer and once as a distractor about AWS CAF.
- Three migration phases: 1 question, as a distractor next to the seven Rs.
- AWS Migration Hub: 5 questions, the answer once (central view of tasks and progress) and a distractor in the other four.
- Migration Evaluator: 4 questions, the answer once (business case) and a distractor in the other three.
- AWS Application Migration Service: 3 questions, the answer once (moving apps while modernizing and cutting cost) and a distractor in the other two.
- AWS Application Discovery Service: 3 questions, always a distractor, since an inventory of servers and dependencies is neither a business case, a central tracking hub nor an app-moving tool.
- AWS DMS: 2 questions, the answer once as the end-to-end database migration tool and described in one distractor.
- AWS SCT: 1 question, a distractor because it converts schemas and code but does not run the whole migration.
- AWS DataSync: 2 questions, the answer once (managed, scheduled online transfer with reporting) and a distractor once.
- AWS Transfer Family: 2 questions, the answer once (managed file transfer over several protocols) and a distractor once.
- Snowball Edge Storage Optimized devices: 2 questions, both distractors because they move data offline.
- AWS Direct Connect and virtual private gateways: 1 question each, as distractors for online data transfer.

## Summary

Planning a move to AWS starts with readiness and people, which the six AWS CAF perspectives organize, and follows three phases: assess, mobilize, and migrate and modernize.
Each application then gets one of the seven Rs, anywhere from relocating it to retiring it.
Finally, AWS services do the moving: Application Migration Service for applications, AWS DMS and AWS SCT for databases, and DataSync, Transfer Family, Direct Connect or Snowball Edge for data.

## Further reading

- [Three Phases of Migration](https://docs.aws.amazon.com/prescriptive-guidance/latest/strategy-migration/overview.html): the phased approach behind large-scale migrations.
- [AWS Cloud Adoption Framework](https://aws.amazon.com/cloud-adoption-framework/): the framework that turns AWS experience into migration guidance and tools.
- [Seven Migration Strategies (7 Rs)](https://docs.aws.amazon.com/prescriptive-guidance/latest/large-migration-guide/migration-strategies.html): how the seven Rs differ and when each applies.
- [Migration Evaluator](https://aws.amazon.com/migration-evaluator/): building a cost-backed business case for the move.
- [AWS Application Discovery Service](https://aws.amazon.com/application-discovery/): inventorying on-premises servers, databases and their connections.
- [AWS Application Migration Service](https://aws.amazon.com/application-migration-service/): moving and modernizing applications faster and for less.
- [AWS Migration Hub](https://aws.amazon.com/migration-hub/): the central place to discover, assess, plan and track a migration.
- [AWS Database Migration Service (AWS DMS)](https://aws.amazon.com/dms/?nc=sn&loc=1): migrating and replicating databases, with planning through conversion in one service.
- [AWS Schema Conversion Tool (AWS SCT)](https://docs.aws.amazon.com/SchemaConversionTool/latest/userguide/CHAP_Welcome.html): translating schemas and code objects for a new database engine.
- [AWS DataSync](https://aws.amazon.com/datasync/): automated, scheduled data transfers with task reporting.
- [AWS Transfer Family](https://aws.amazon.com/aws-transfer-family/): managed SFTP, FTPS and FTP transfers into and out of Amazon S3 and Amazon EFS.
- [AWS Direct Connect](https://aws.amazon.com/directconnect/): a dedicated private network line between your site and AWS.
- [AWS Snow Family](https://docs.aws.amazon.com/snowball/latest/developer-guide/device-differences.html): Snowball Edge Storage Optimized devices for offline, multi-petabyte moves.
