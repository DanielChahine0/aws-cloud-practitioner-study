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

## Labs

These rules hold for every lab in `content/labs/` (spec 5), written by the lab writer and judged by the lab critic.
`pnpm content:validate --draft <file>` checks the schema, the references, originality, retired plan names and the R11 replay.
Lab text is plain text: no Markdown and no HTML.

### Brief

The brief sets one cafe situation in 1 to 3 sentences and says what to do.

- Good: `The cafe's back office runs on servers in a cupboard, and the owner wants to know who looks after what. Sort each job to the side that owns it.`
- Bad: `Sort these AWS services.` sets no situation.

### Cards and buckets

Card text names the need, never the answer.

- Good: `Nightly copies of the order history that must survive a lost building`.
- Bad: `Back up with Amazon S3` gives the bucket away.
- Give each card one right bucket, and list in `also` any other bucket a careful reader could defend.

### Goals and hints

A goal label says what a finished goal looks like, and its hint teaches the idea without naming a placement.

- Good hint: `Ask who touches the item: the cafe's staff, or the people who run the data center.`
- Bad hint: `The patching card goes under AWS.`

### Wrong paths

Each wrong path models one mistake a learner really makes, named in its `mistake`, and finishes the board.

- Good mistake: `Thinks AWS patches the guest operating system of an EC2 instance`.
- Bad mistake: `Random placement`.

### Debrief

The 2 to 4 debrief lines state what the lab showed, one idea per line, and the debrief asks 2 or 3 live practice questions on the lab's concepts.

### Lab credits and lab values

Prices appear only as lab credits, a made-up unit, and never as dollars or real AWS prices.
Any figure the cited notes do not state is called a lab value.

- Good: `Each server costs 4 lab credits an hour (a lab value).`
- Bad: `Each server costs $0.0416 an hour.`

### Grounding

Every card placement, goal, hint and debrief line rests on a line of a note the lab lists in `notes`.
Support plans appear only by their four current names: Basic Support, AWS Business Support+, AWS Enterprise Support and AWS Unified Operations.

### Configure fields

Give each field one decision, labelled by the setting it changes.
Option labels name the choice and never the verdict, so no option reads "Recommended" or "Cheapest".
Option details state facts from the cited note or named lab values, never hints.

### Simulate parameters

Label each parameter by the lever it moves, and always show its unit.
Name every constant a lab value in the brief, and every price in lab credits.
Thresholds read as the cafe's needs, such as a daily budget or a deadline, never as the answer.

### Place containers and pieces

Label a container by the place it stands for and a piece by the thing it runs, never by the verdict.

- Good: `Harbour Zone B`, `Order database copy`.
- Bad: `Safe zone` names the verdict, and `Database (private)` gives the slot away.
- Name the bench `Not used`, and give every Region and zone a made-up name, never a real code.

### Trace rules and cases

A case label says who asks for what, and the expected result lives only in `expect`.

- Good: `A customer orders over HTTPS`.
- Bad: `Customer HTTPS should pass` gives the result away.
- Offer rules a learner could really choose, the tempting wrong fix included.

### Investigate records and questions

Records read like a real log or report, with made-up names and every time in UTC with the `UTC` suffix.

- Good: `09:42 UTC`, `barista-sam`, `203.0.113.24`.
- Bad: `9:42 in the morning`, a colleague's real name, or an address outside the documentation ranges.
- Write each question so the evidence leaves exactly one option right.

### Engine rules beyond the notes

When a lab relies on an engine rule the cited notes do not state, the brief states it as how this lab works, and no note is edited.

- Good: `In this lab, the network ACL tries its rules from the lowest number up.`
- Bad: a hint that says the lesson teaches rule numbers when no cited note does.
- This covers network ACL rule order, reply ports, explicit deny over allow, SCPs intersecting identity policies, CloudFormation type names and CloudTrail management events.

## Incidents

A daily incident is a short cafe story told over 2 to 4 steps in `content/incidents/inc-NNN.yaml` (spec 4.5).
The question rules above `## Labs` apply to each step, which is a full practice question with its own whys, evidence and takeaway.

- Tell one story: the brief sets the scene, and each step moves it on, from noticing the problem to fixing it.
- Make each step stand on its own, so a reader who missed the step before can still answer it.
- Never let the brief or an earlier step give away a later step's answer.
- Keep the brief to plain text, 40 to 400 characters, with no Markdown and no answer in it.
- Use `single` or `multi` steps only, since a `match` step breaks the story into a table.
- Draw on earlier modules only when the story needs them, and list each one in `modules` after the home module.

- Good: `The bill for the loyalty app doubled overnight, and the manager wants to know why before the morning rush.`
- Bad: `The cafe should have used Auto Scaling, so the bill doubled.` gives the answer in the brief.
