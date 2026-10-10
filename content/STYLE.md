# Question style guide

These rules hold for every practice question in `content/questions/` (spec 2.7).
`pnpm content:validate --draft <file>` checks the mechanical rules, and the critic agent judges the rest.
Every example below is made up and set in the cafe.

## Shapes

- `single`: exactly 4 options and exactly 1 correct.
- `multi`: 5 or 6 options, `select` of 2 or 3, and exactly `select` correct options.
- The app adds `(Select TWO.)` or `(Select THREE.)` to a multi stem, so never write it in the stem yourself.
- `match`: 3 to 5 pairs whose lefts are all different and whose rights are all different, in the practice pool only.
- Option ids run `a`, `b`, `c` and onward in order, and the correct options may sit at any letter.

## Levels

- Level 1 is recall: the reader names the service or idea that fits a plain description.
- Level 2 is apply: the reader picks what fits a short scenario.
- Level 3 is discriminate: the reader tells apart two or more confusable services for a scenario that only one fits.

## One concept per question

Each question tests the one concept in its `concept` field, and the key and the takeaway are about that concept.

- Good: `The cafe wants its loyalty app to run code only when an order arrives. Which service fits?` tests AWS Lambda alone.
- Bad: `Which service runs the loyalty app's code, and which stores its receipts?` tests two concepts at once.

## Scenario stems

About 60% of stems are short scenarios set in the cafe, and the rest ask about the concept directly.

- Good: `The cafe's menu site gets a rush every Saturday morning and is quiet the rest of the week.`
- Bad: `A company has a workload.` gives the reader nothing to reason about.

## Distractors

Distractors come from the same category as the key, and name only services in `resources/glossary.md` or in an "Exam guide update" line.

- Good: for a compute key, the other options are other compute services, such as Amazon EC2, AWS Fargate and Amazon Lightsail.
- Bad: `Amazon Cafe Ledger` is not a real service, and `Amazon S3` next to three compute services is easy to rule out.

## Parallel options

Options match in grammar and length, and in each module the correct option is the longest in at most 35% of `single` questions.

- Good: `AWS Lambda`, `Amazon EC2`, `AWS Fargate`, `Amazon Lightsail`.
- Bad: `AWS Lambda, which runs code only when an event arrives`, next to three bare service names.

## Banned phrasings

Never write "all of the above", "none of the above", "both A and B" or a reference to an option letter, such as "option b".

- Good: a `multi` question with `select: 2` when two options are correct.
- Bad: `Both a and c` as an option.

## Negative stems

A negative stem writes the negation as a bold **NOT** (or **EXCEPT**), and negative stems make up at most 5% of each module's questions.

- Good: `Which task does the cafe **NOT** hand to AWS under the shared responsibility model?`
- Bad: `Which task does the cafe not hand to AWS?` hides the negation.

## Numbers

A number may appear only when the cited note states it, written the same way.

- Good: a stem says `99.99%` because the cited note states `99.99%`.
- Bad: a stem says `five Availability Zones` when the note gives no count.

## Current names

Questions use the exam guide's current names (spec 2.3), such as Amazon Quick Sight and AWS Business Support+.
Never name Developer Support, Business Support or Enterprise On-Ramp Support, which the course teaches but the exam no longer uses.

- Good: `Which Support plan gives the cafe a designated technical account manager?` with current plan names as options.
- Bad: an option named `Developer Support`.

## Why lines

Every option and every pair has a `why` of at least 20 characters that says why that option is right or wrong for this stem.

- Good: `An On-Demand Instance bills while it runs, including the quiet hours with no orders.`
- Bad: `This is wrong.` or a why that only defines the service without tying it to the stem.

## Evidence

Each question cites 1 to 3 evidence lines, each copied as one whole line of the cited note, without its list marker.

- Good: a line copied character for character from the note, such as `You pay for compute time only.` when the note holds exactly that line.
- Bad: a shortened, merged or reworded line, which fails rule R5.

## Takeaway

The takeaway is one sentence under 160 characters that states the idea the question teaches.

- Good: `Spiky, event-driven work with idle gaps points to Lambda's pay-per-use billing.`
- Bad: `Lambda is good.` says nothing a reader can reuse.

## Exam pool

For an item with pool: exam, the cafe rules above do not apply, and this section replaces them.
Exam-pool items live in `content/exam/pool/NN-<module-slug>.yaml` and fill the mock forms, so they read like the real exam rather than like the course.

- Use `single` or `multi` only; `match` stays in the practice pool.
- Set scenario stems in neutral made-up businesses, such as a bike rental shop, a regional clinic or an online bookstore, and never in the cafe.
- Vary the business from item to item, so no two items of a file share one.
- Make about 60% of stems scenarios, and ask about the concept directly in the rest.
- Every other rule in this guide applies unchanged: shapes, levels, one concept per item, distractors, parallel options, banned phrasings, negative stems, numbers, current names, whys, evidence and the takeaway.

- Good: `A regional clinic stores scanned patient forms that staff open often in the first month and rarely after that.`
- Bad: `The cafe's loyalty app stores receipts.` sets an exam item in the cafe.
