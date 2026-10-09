# AWS Cloud Practitioner Essentials - study notes

These are study notes for the AWS Skill Builder course "AWS Cloud Practitioner Essentials", written in our own words.
They were built from the course's video transcripts, key takeaways, interactive content and descriptions of its visuals.
They are not a copy of the course, which belongs to AWS, so use them alongside the course rather than instead of it.

## Modules

Start each module at its README, then read its lessons in order.

| # | Module | Lessons | Assessment questions |
| --- | --- | --- | --- |
| 1 | [Introduction to the Cloud](01-introduction-to-the-cloud/README.md) | 6 | 8 |
| 2 | [Compute in the Cloud](02-compute-in-the-cloud/README.md) | 8 | 14 |
| 3 | [Exploring Compute Services](03-exploring-compute-services/README.md) | 4 | 8 |
| 4 | [Going Global](04-going-global/README.md) | 4 | 6 |
| 5 | [Networking](05-networking/README.md) | 7 | 14 |
| 6 | [Storage](06-storage/README.md) | 11 | 15 |
| 7 | [Databases](07-databases/README.md) | 6 | 12 |
| 8 | [AI/ML and Data Analytics](08-ai-ml-and-data-analytics/README.md) | 8 | 10 |
| 9 | [Security](09-security/README.md) | 6 | 10 |
| 10 | [Monitoring, Compliance, and Governance in the AWS Cloud](10-monitoring-compliance-and-governance/README.md) | 10 | 11 |
| 11 | [Pricing and Support](11-pricing-and-support/README.md) | 6 | 10 |
| 12 | [Migrating to the AWS Cloud](12-migrating-to-the-aws-cloud/README.md) | 7 | 9 |
| 13 | [Well-Architected Solutions](13-well-architected-solutions/README.md) | 4 | 6 |
| | **Total** | **87** | **133** |

## Glossary

[The glossary](glossary.md) lists every term from the lessons' Terms sections, A to Z, with links to each lesson that defines it.

## Concept index

[The concept index](concepts.md) lists every concept tag from the lessons' frontmatter, A to Z, with links to each lesson that uses it.

## File conventions

### Layout

- Each module has a folder named `NN-module-slug`, numbered in course order.
- Inside it, `README.md` is the module overview and `NN-lesson-slug.md` is one note per content lesson, numbered in course order.
- Lessons that teach no AWS content get no note: Module 1's guide to the course player and Module 13's feedback page.
- Each module's assessment and summary feed its README instead of getting notes of their own.
- Every note starts with YAML frontmatter, and its `slug` matches the file or folder name without the number.

### Module READMEs

- Frontmatter keys: `module`, `slug`, `title`, `source`, `lessons` and `assessment_questions`.
- Sections, in order:
  - **What this module covers**: a short overview of the module.
  - **Lessons**: links to the lesson notes, grouped by the course's section dividers, each with a one-line summary.
  - **Key takeaways**: the module's main points.
  - **What the assessment focuses on**: the number of assessment questions and the topics they test.
  - **Summary**: how the module's ideas fit together.
  - **Further reading**: links to AWS pages for going deeper, which the assessment does not test.

### Lesson notes

- Frontmatter keys: `module`, `lesson`, `slug`, `title`, `source` and `concepts`.
- `title` is the lesson's title in the course, and `source` names the course, module and lesson.
- Sections, in order, where Visuals and Scenarios appear only when the lesson has material for them:
  - **Objectives**: what the lesson sets out to teach.
  - **Notes**: the lesson content, under topic headings.
  - **Visuals**: what the lesson's diagrams, graphics and interactive elements show.
  - **Key takeaways**: the points most worth remembering.
  - **Scenarios**: short situations paired with the concept or service that answers them.
  - **Terms**: one-line definitions of the lesson's terms, which the glossary gathers in one place.

### Concept tags

- The `concepts` list in a note's frontmatter holds kebab-case tags such as `shared-responsibility-model` or `amazon-ec2-auto-scaling`.
- A tag names the same idea wherever it appears, so a quiz question tagged with a concept leads back to every note that covers it.
- Reuse an existing tag for an idea that is already tagged, and add a new tag only for a new idea.

### Writing style

- Notes are in our own words, never copied from the course.
- Each sentence sits on its own line.
- Dashes are plain hyphens, never em dashes.
- Links between notes are relative, so they work in any Markdown viewer.
