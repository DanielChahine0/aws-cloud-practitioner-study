---
name: registry-writer
version: 1
---

# Registry writer

You complete the seeded entries of one module in `content/concepts.yaml`, the one concept registry (spec 2.4).
You write a result file, and `pnpm content:concepts --apply` merges it, so you never edit `content/concepts.yaml` or a note yourself.

## Inputs

- Your module number `NN`, given in your task.
- The output of `pnpm --silent content:concepts --pending NN`, run from the repository root: JSON whose `entries` give each pending concept's `id`, seeded `name`, seeded `home` and `listedIn`, the lesson notes whose `concepts` frontmatter lists the tag.
- `content/exam/blueprint.yaml`, which holds the 19 exam task statements with their `text` and the `terms` the exam guide names.
- The notes themselves: note id `mNN/<slug>` is the file `resources/NN-<module-slug>/LL-<slug>.md`, and you read every note in `listedIn`.
- `content/concepts.yaml`, read-only, for the ids of other modules' concepts.

## What to decide for each entry

- **name:** the display name.
  Use the exam's current name for an AWS service, as the blueprint spells it (for example `Amazon Quick Sight` or `AWS IAM Identity Center`), and sentence case for an idea (`Pay-as-you-go pricing`).
- **home:** one of the entry's `listedIn` notes, the one that teaches the concept most fully.
- **anchor:** the slug of one H3 under `## Notes` in the home note, the section that teaches the concept.
  To build the slug, drop `*` and backticks, lowercase the heading, delete every character that is not a letter, digit, space or hyphen, trim, turn each run of spaces into one hyphen, and turn each run of hyphens into one.
  For example, `### Launch types for ECS and EKS: EC2 or Fargate` becomes `launch-types-for-ecs-and-eks-ec2-or-fargate`.
- **tasks:** 1 to 3 blueprint task ids that an exam question on the concept would test, most specific first, written as strings such as `"3.3"`.
- **tested:** leave it out for every concept an exam could ask about.
  Write `"tested": false` with `"tasks": []` only for course scaffolding that no exam could ask about, such as the course's coffee shop analogy.
- **confusableWith:** optional, up to 3 registered ids that an exam distractor would pair with the concept, such as two compute services for the same job.
  Write a pair only on the concept whose id sorts first alphabetically, so `aws-fargate` lists `aws-lambda` and `aws-lambda` does not list `aws-fargate`.
  You write only your own module's entries, so leave out a pair whose first id belongs to another module.

## Aliases

- Propose an alias only when two tags name exactly the same idea, such as one service tagged once by its full name and once by its short name.
- The survivor is the tag whose home note teaches the idea better, and the other tag becomes its alias.
- Never merge two different services, or a service with one of its features.
- Still fill the entry that becomes an alias in `concepts`, because the result must cover every pending entry.
- Each alias is `{ "alias": "<id that disappears>", "of": "<id that survives>", "reason": "<one line>" }`.

## Output

Write `.results/registry/mNN.json`, for example `.results/registry/m03.json`, in this shape, with `module` as a number:

```json
{
  "module": 3,
  "concepts": [
    {
      "id": "aws-lambda",
      "name": "AWS Lambda",
      "home": "m03/aws-lambda",
      "anchor": "what-lambda-is",
      "tasks": ["3.3", "2.1"]
    },
    {
      "id": "aws-fargate",
      "name": "AWS Fargate",
      "home": "m03/containers-and-orchestration-on-aws",
      "anchor": "launch-types-for-ecs-and-eks-ec2-or-fargate",
      "tasks": ["3.3"],
      "confusableWith": ["aws-lambda"]
    }
  ],
  "aliases": []
}
```

## Rules

- Read the notes yourself, and never guess an anchor from a concept's name.
- Use only anchors that exist in the home note and task ids that exist in the blueprint.
- Cover every pending entry of your module exactly once, and no other entry.
- Never edit `content/concepts.yaml`, a note, or any file outside `.results/registry/`.
- Run `pnpm --silent content:concepts --check .results/registry/mNN.json` and fix the file until it prints a line starting with `OK`.
