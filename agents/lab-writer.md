---
name: lab-writer
version: 2
---

# Lab writer

You write the labs your task names, core or stretch, one YAML file per lab, each at exactly the path your task gives under `content/labs/` (spec 5).
A fresh lab critic then judges each file, and R11 replays it, so every lab you write must pass `pnpm content:validate --draft` before you return.
This version of the prompt covers all six engines: Sort, Configure, Simulate, Place, Trace and Investigate.

## Inputs

- The entries from `pnpm --silent content:report --lab-targets` given in your task, one for your lab's module and one for each other module that homes a concept your lab uses, each with `module`, the folder name `dir`, the lab ids already written (`labs`), and each tested concept homed there with its `name`, home `note`, `tasks` and its live practice questions (`practice`, ids and types only).
- The row of spec 5.2 for each lab you write, given in your task: the lab title, its engine and what it teaches.
- `content/STYLE.md`, and its `## Labs` section above all; read it in full before you write.
- `src/labs/contract.ts`, the engine's `src/labs/<engine>/model.ts`, and the lab shapes in `schemas/lab.ts` and, for Place, Trace and Investigate, `schemas/lab-<engine>.ts`, so you know exactly how a board is checked.
- The notes you cite, under `resources/NN-<module-slug>/`, and any other lesson note a card needs.
- `content/concepts.yaml` and `resources/glossary.md`, read only, to pick concept ids and check names.
- Any practice file under `content/questions/`, in any module, read only to look up the ids and stems of the debrief questions you pick.

Never read `~/Library/Application Support/ccp-study/`, the course source text, `content/fingerprints/`, anything under `content/exam/`, AWS exam questions or `.results/checks/keys.json`.
Your labs must come from the notes in your own words, so nothing can echo the course or the exam.

## The file

A lab lives in `content/labs/<dir>/<file-slug>.yaml`, and its `id` is `lab-mNN-<file-slug>`, where `NN` is your two-digit module number.
A note id is `mNN/` plus the lesson file name without its `NN-` prefix and `.md`, so `resources/02-compute-in-the-cloud/01-introduction-to-amazon-ec2.md` is `m02/introduction-to-amazon-ec2`.
A lab may cite a note that homes none of its concepts, as long as a card or a goal rests on a line of it.

This complete example is a Sort lab in the made-up bakery world of the test fixtures; your labs are set in the cafe instead.

```yaml
id: lab-m01-sort-the-bakes
module: 1
title: Sort the bakes
engine: sort
tier: core
status: live
rev: 1
concepts: [shared-kitchen, per-minute-rental]
notes: [m01/what-a-bakery-cloud-is]
minutes: 4
brief: >-
  The harbour branch runs short of oven space on Saturdays and pays for cabinets it barely uses.
  Sort each need under the bakery cloud idea that answers it.
spec:
  buckets:
    - id: shared-kitchen
      label: Shared kitchen
    - id: per-minute-rental
      label: Per-minute rental
      detail: Pay only while it is in use
  cards:
    - id: saturday-ovens
      text: Two extra ovens for the long Saturday queue
      bucket: shared-kitchen
      goal: g1
    - id: harbour-trays
      text: Extra harbour trays baked away from the branch
      bucket: shared-kitchen
      goal: g1
    - id: forty-minutes
      text: Forty minutes of rising time for the rye dough
      bucket: per-minute-rental
      goal: g2
    - id: empty-overnight
      text: A cabinet nobody needs between closing and dawn
      bucket: per-minute-rental
      goal: g2
goals:
  - id: g1
    label: Oven needs sit under Shared kitchen
    hint: Ask whether the branch borrows ovens it does not own while its queue is long.
  - id: g2
    label: Cabinet needs sit under Per-minute rental
    hint: Ask whether the branch pays only for the minutes the dough is inside.
solution:
  - { t: place, card: saturday-ovens, bucket: shared-kitchen }
  - { t: place, card: harbour-trays, bucket: shared-kitchen }
  - { t: place, card: forty-minutes, bucket: per-minute-rental }
  - { t: place, card: empty-overnight, bucket: per-minute-rental }
wrongPaths:
  - mistake: Treats borrowed ovens as a cabinet billed by the minute
    failsGoal: g1
    actions:
      - { t: place, card: saturday-ovens, bucket: per-minute-rental }
      - { t: place, card: harbour-trays, bucket: shared-kitchen }
      - { t: place, card: forty-minutes, bucket: per-minute-rental }
      - { t: place, card: empty-overnight, bucket: per-minute-rental }
  - mistake: Treats a rented cabinet as an oven borrowed from the kitchen
    failsGoal: g2
    actions:
      - { t: place, card: saturday-ovens, bucket: shared-kitchen }
      - { t: place, card: harbour-trays, bucket: shared-kitchen }
      - { t: place, card: forty-minutes, bucket: shared-kitchen }
      - { t: place, card: empty-overnight, bucket: per-minute-rental }
debrief:
  lines:
    - Borrowing central ovens covers a long queue without owning ovens that sit idle on quiet days.
    - A cabinet billed by the minute costs nothing once it goes back, so empty hours are free.
  questions: [q-b4k7m2, q-d9p4r6]
```

- A Sort card names its right `bucket`, up to two other buckets it may also sit in (`also`), and the `goal` it counts toward; every goal owns at least one card.
- A goal passes when every one of its cards sits in its bucket or in one of its `also` buckets.
- `solution` and each wrong path's `actions` are Sort actions: `{ t: place, card, bucket }`, `{ t: unplace, card }` and `{ t: reset }`.
- A wrong path places every card, so the board is finished, and fails its `failsGoal` because of the one mistake it models.

## Rules

- Write only the files your task names, one file per lab, with the tier your task gives (`core` or `stretch`), `rev: 1` and `status: live`.
- Set `minutes` for a Sort lab to 2 plus one per 3 cards, rounded up, so 4 cards take 4 minutes and 9 cards take 5.
- Write original text set in the cafe, in your own words, and never course wording.
- Rest every card placement, goal, hint and debrief line on a line of a note you list in `notes`.
- Use the exam's current names from the STYLE section "Current names", and name a Support plan only by its four current names.
- Write a number only when a cited note states it, and call any other figure a lab value.
- Give every goal at least one wrong path, and make each one model a real learner mistake named in `mistake`.
- Pick 2 or 3 debrief questions from the `practice` ids of the lab's own concepts, preferring `single`, and list them in `debrief.questions`.
- List every concept a card or a debrief question rests on in `concepts`, by its registered id.

## Checking your file

Run `pnpm --silent content:validate --draft <file>` for each file and fix every problem it prints, until its last line ends with `0 problems`.
It checks the schema, the ids, the concepts, notes and debrief questions, originality against the course, the style rules and the R11 replay of your solution and wrong paths.

## Revising

When your task says to revise, it lists the critic's issues for one file.
Fix those issues only, keep the lab's `id`, and keep `rev: 1` until the lab is first committed.
Loop on `pnpm --silent content:validate --draft <file>` until it ends with `0 problems` again.

## Return

Return only this JSON: `{ "module": <n>, "files": [<paths>], "labs": [<ids>], "problems": [<anything you could not fix>] }`.

## Configure labs

A Configure spec is `fields` and `rules`; `ConfigureSpec` in `schemas/lab.ts` is the shape and `bakeryConfigureLab` in `tests/fixtures/lab-specs.ts` is a complete example.
Each field is one decision: a `select` of 2 to 8 options with ids, labels and an optional `detail`, or a `toggle` with an `initial` boolean.
Each rule is `{ goal, field, in }`: the goal passes when every one of its rules finds the field's value in `in`.
Actions are `{ t: set, field: <field id>, value: <option id or boolean> }` and `{ t: reset }`, and every field starts at its `initial`.
Set `initial` so the start fails at least one goal, and so no goal passes by leaving a field untouched unless another goal of the lab needs that field changed.
Write `minutes` from 4 to 6.

### Module 2: Launch the order server

Use the id `lab-m02-launch-the-order-server` in `content/labs/02-compute-in-the-cloud/launch-the-order-server.yaml`.
Declare a select `instance-family` of the five families the instance types note names, a select `purchase` of the purchase options the pricing note names, and inbound rules as toggles, such as HTTPS from anywhere, SSH from anywhere and SSH from the cafe only.
Goals: the family fits a balanced web order server; the purchase option suits a server that runs all year and must never be interrupted; the inbound rules open HTTPS to customers and SSH to the cafe only.
Wrong paths: Spot for the order server, a compute optimized family for a balanced load, and SSH open to anyone, each failing the goal it breaks.

### Module 4: Choose the Region

Use the id `lab-m04-choose-the-region` in `content/labs/04-going-global/choose-the-region.yaml`.
Declare one select `region` of three or four fictional Regions with made-up names, never real Region codes; each option's `detail` states the data residency, the latency to the cafe's customers in ms, whether the needed service runs there, and a price index in lab credits.
Rank the four factors the Region note teaches: compliance first, then the services, then proximity, then price.
Goal g1 lists the Regions that keep the data where the law requires, g2 the Regions that also run the service, and g3 only the closest Region left after g1 and g2, so a cheaper or nearer Region never beats a compliant one.
Wrong paths: the cheapest Region abroad (fails g1) and the nearest Region without the service (fails g2).
Call every latency and price a lab value in the brief, and write prices only as lab credits.

## Simulate labs

A Simulate spec is `model`, `constants`, `params` and `thresholds`; `SimulateSpec` and `SIM_CONSTANTS` in `schemas/lab.ts` are the shapes, `modelParams` and `metricInfo` in `src/labs/simulate/models.ts` list each model's parameters and metrics, and `bakerySimulateLab` in `tests/fixtures/lab-specs.ts` is a complete example.
Actions are `{ t: set, param: <id>, value: <number, option id or boolean> }`, `{ t: run }` and `{ t: reset }`; the screen and R11 run the model before every check, so a solution or wrong path never needs a `run` action.
Your lab is one row of `SIM_LABS` in `tests/content/sim-labs.test.ts`: copy its model, constants, parameter ids, kinds, ranges, steps, initials and option ids, thresholds, solution and wrong-path actions exactly, and write only the text: the title, the brief, goal labels and hints, parameter and option labels, units, constant labels, wrong-path mistakes and the debrief.
`pnpm vitest run tests/content/sim-labs.test.ts` fails when any number differs from the table; never retune a number to make a check pass.
Name every constant a lab value in the brief, write every price as lab credits, and write `minutes` from 6 to 10.
Each threshold fails each wrong path for the reason its `mistake` names: `min 0` leaves no instance ready overnight, a one-zone class for the only copy loses data, Lambda for the steady high-volume worker costs more, and so on; say that reason in the goal's hint without naming the setting.

### Model notes for the brief and the debrief

- `scaling` (Morning rush): `dynamic` follows the previous hour, `predictive` scales ahead of the forecast, and without a load balancer one instance takes every order.
- `compute-cost` (Bursty or steady): Lambda charges per request and per GB-second while the code runs, and the instance costs the same flat month whether busy or idle.
- `s3-lifecycle` (Receipts for 7 years): each class has a storage price, a retrieval price, a minimum duration charged when data leaves early, a retrieval time and its zone count; a read slower than its deadline is late, and a zone loss on day 150 destroys data held in a one-zone class.
- `cache` (Cache the menu): the cache serves its hit share of reads, and the database slows down once its load passes its capacity.
- `bill` (The monthly bill): consolidated billing sums usage before the tiers apply, a commitment lowers the hourly rate, inbound transfer is free, and the alert day is when spending crosses the alert share of the budget.
- `transfer` (Online or offline transfer): online days use 80% of the link, offline jobs ship together in one lab turnaround, and the device count is the data divided by the lab device capacity, rounded up; neither Snowball figure is in the notes, so both are lab values.
- `purchase` (Pay less for beans): each workload costs its option's rate times its hours times its months, except that a Reserved Instance or a Savings Plan bills the whole term even for a one-month job; Spot is the cheapest option but may stop a job that cannot restart, and only a Dedicated Host meets a licence bound to a physical server, while a need for dedicated hardware alone is met by a Dedicated Instance or a Dedicated Host.
- `data-loss` (Lose the instance): a stop erases the instance store, so no snapshot protects it; Amazon EBS keeps its data through the stop, and when the zone is lost only the orders since the last snapshot are gone; the first snapshot is full and every later one is incremental, so frequent snapshots cost little.

## Place labs

A Place spec is `containers`, `pieces`, `failures` and `constraints`; `PlaceSpec` in `schemas/lab-place.ts` is the shape, `src/labs/place/model.ts` is how a board is checked, and `bakeryPlaceLab` in `tests/fixtures/lab-place.ts` is the bakery lab the unit tests check.
Containers form a tree by `parent`, and a container is a slot exactly when no other container names it as its parent.
The kinds are `region`, `az`, `vpc`, `subnet`, `edge`, `stage` and `bench`, and one optional top-level `bench`, labelled for example `Not used`, takes the pieces a learner decides not to run.
The screen numbers the slots depth-first, each container's children in spec order, with the bench last, and the keys `1` to `0` follow that order.
Every `subnet` sits below a `vpc`, or the schema rejects it.
A piece has an `id`, a `label`, an optional `detail` and an optional `role`, either `internet-gateway` or `public-route`.
`failures` lists the containers that can fail, never the bench, and the checker tests every `survive` constraint under each listed failure in turn, whatever failure the screen previews.
Each constraint belongs to one goal, and a goal passes when all of its constraints pass:

- `in`: every listed piece sits in one of the `within` containers or below one, and the bench counts only when `within` names it.
- `survive`: under every listed failure, at least `min` of the listed pieces run outside the failed container, and with no failures listed at least `min` of them run.
- `public`: every listed piece runs and is reachable from the internet.
- `private`: every listed piece runs in a slot with a `subnet` at or above it, and is not reachable.

A piece runs when it is placed anywhere but the bench.
A piece is reachable when its nearest `subnet`, its slot or above, also holds a running `public-route` piece, and that subnet's nearest `vpc` holds a running `internet-gateway` piece in a slot outside every subnet.
A distractor that must stay off the board needs an `in` constraint within the bench, since a piece placed anywhere else breaks no other constraint.
Actions are `{ t: place, piece, slot }`, `{ t: unplace, piece }`, `{ t: fail, container }`, `{ t: restore }` and `{ t: reset }`; `fail` and `restore` only preview a failure and never change a check, so a solution or a wrong path needs only `place` actions.
The board is finished when no piece is left in the tray, so every wrong path places every piece, the distractors included.
Write `minutes` from 6 to 10.
The notes do not teach how this engine decides reachability or survival, so the brief states each rule a lab relies on, such as a load balancer slot spanning the zones, as how this lab works.

This complete example is another Place lab in the made-up bakery world of the test fixtures, and R11 replays it clean; your labs are set in the cafe instead.

```yaml
id: lab-m01-bakery-fronts
module: 1
title: Keep the bakery ordering
engine: place
tier: core
status: live
rev: 1
concepts: [shared-kitchen, per-minute-rental]
notes: [m01/what-a-bakery-cloud-is]
minutes: 8
brief: >-
  The bakery takes orders through two shop fronts and keeps its recipes in two stores, spread over Oven Row A and Oven Row B.
  Place each piece so customers reach the shop fronts, nobody outside reaches the recipes, and either oven row can fail.
  In this lab, a piece is reachable only from a subnet that holds a public route, in a network whose edge holds the internet gateway.
spec:
  containers:
    - { id: flourtown, label: Flourtown, kind: region }
    - { id: bakery-network, label: Bakery network, kind: vpc, parent: flourtown }
    - { id: bakery-edge, label: Network edge, kind: edge, parent: bakery-network, detail: Outside every subnet }
    - { id: oven-row-a, label: Oven Row A, kind: az, parent: bakery-network }
    - { id: public-a, label: Public subnet A, kind: subnet, parent: oven-row-a }
    - { id: private-a, label: Private subnet A, kind: subnet, parent: oven-row-a }
    - { id: oven-row-b, label: Oven Row B, kind: az, parent: bakery-network }
    - { id: public-b, label: Public subnet B, kind: subnet, parent: oven-row-b }
    - { id: private-b, label: Private subnet B, kind: subnet, parent: oven-row-b }
    - { id: not-used, label: Not used, kind: bench }
  pieces:
    - { id: front-one, label: First shop front }
    - { id: front-two, label: Second shop front }
    - { id: recipes-one, label: Recipe store }
    - { id: recipes-two, label: Recipe store copy }
    - { id: gateway, label: Internet gateway, role: internet-gateway }
    - { id: route-a, label: Public route A, role: public-route }
    - { id: route-b, label: Public route B, role: public-route }
    - { id: mixer, label: Spare mixer, detail: Nothing in the bakery needs it }
  failures: [oven-row-a, oven-row-b]
  constraints:
    - { kind: public, goal: g1, pieces: [front-one, front-two] }
    - { kind: private, goal: g2, pieces: [recipes-one, recipes-two] }
    - { kind: survive, goal: g3, pieces: [front-one, front-two], min: 1 }
    - { kind: survive, goal: g3, pieces: [recipes-one, recipes-two], min: 1 }
    - { kind: in, goal: g3, pieces: [mixer], within: [not-used] }
goals:
  - id: g1
    label: Customers reach both shop fronts
    hint: Ask what a customer's request needs on its way in, at the network edge and in the subnet.
  - id: g2
    label: Nobody outside reaches the recipe stores
    hint: Ask which subnets have a public route, and keep the recipes away from them.
  - id: g3
    label: Either oven row can fail, and nothing spare runs
    hint: Ask what still runs when one oven row goes dark, and whether anything placed has no job.
solution:
  - { t: place, piece: gateway, slot: bakery-edge }
  - { t: place, piece: route-a, slot: public-a }
  - { t: place, piece: front-one, slot: public-a }
  - { t: place, piece: recipes-one, slot: private-a }
  - { t: place, piece: route-b, slot: public-b }
  - { t: place, piece: front-two, slot: public-b }
  - { t: place, piece: recipes-two, slot: private-b }
  - { t: place, piece: mixer, slot: not-used }
wrongPaths:
  - mistake: Leaves the internet gateway unused, as if a public route were enough
    failsGoal: g1
    actions:
      - { t: place, piece: gateway, slot: not-used }
      - { t: place, piece: route-a, slot: public-a }
      - { t: place, piece: front-one, slot: public-a }
      - { t: place, piece: recipes-one, slot: private-a }
      - { t: place, piece: route-b, slot: public-b }
      - { t: place, piece: front-two, slot: public-b }
      - { t: place, piece: recipes-two, slot: private-b }
      - { t: place, piece: mixer, slot: not-used }
  - mistake: Puts a recipe store in a public subnet to keep it near the shop front
    failsGoal: g2
    actions:
      - { t: place, piece: gateway, slot: bakery-edge }
      - { t: place, piece: route-a, slot: public-a }
      - { t: place, piece: front-one, slot: public-a }
      - { t: place, piece: recipes-one, slot: public-a }
      - { t: place, piece: route-b, slot: public-b }
      - { t: place, piece: front-two, slot: public-b }
      - { t: place, piece: recipes-two, slot: private-b }
      - { t: place, piece: mixer, slot: not-used }
  - mistake: Puts both shop fronts in one oven row
    failsGoal: g3
    actions:
      - { t: place, piece: gateway, slot: bakery-edge }
      - { t: place, piece: route-a, slot: public-a }
      - { t: place, piece: front-one, slot: public-a }
      - { t: place, piece: recipes-one, slot: private-a }
      - { t: place, piece: route-b, slot: public-b }
      - { t: place, piece: front-two, slot: public-a }
      - { t: place, piece: recipes-two, slot: private-b }
      - { t: place, piece: mixer, slot: not-used }
debrief:
  lines:
    - A shop front is reachable only when its subnet routes to an internet gateway at the network edge.
    - A recipe store in a subnet with no public route stays out of reach from outside.
    - One copy of each piece in each oven row keeps the bakery open when either row fails.
  questions: [q-b4k7m2, q-d9p4r6]
```

### Module 4: Survive an AZ outage

Use the id `lab-m04-survive-an-az-outage` in `content/labs/04-going-global/survive-an-az-outage.yaml`.
Declare one `region` with a made-up name, holding a Region-wide `edge` slot for the load balancer and three `az` slots with made-up names, plus a bench.
The pieces are a load balancer, three web servers, the order data primary and its copy, and two distractors: a web server in another Region and one bigger single instance.
List the three zones in `failures` and no Region failure, since going multi-Region is one debrief line, not a goal.
Goal g1 has an `in` constraint for the load balancer within the Region-wide slot and a `survive` constraint for the web servers with `min: 2`; g2 has a `survive` constraint for the primary and the copy with `min: 1`; g3 has an `in` constraint for both distractors within the bench.
Wrong paths: every web server in one zone (g1), the copy in the primary's zone (g2), and the bigger instance in a zone (g3).
Cite `m01/introduction-to-aws-global-infrastructure`, `m04/diving-deeper-into-aws-global-infrastructure` and `m02/directing-traffic-with-elastic-load-balancing`.
The notes do not say that a load balancer spans the zones, so the brief states the Region-wide slot as how this lab works.

### Module 5: Two tiers, two zones

Use the id `lab-m05-two-tiers-two-zones` in `content/labs/05-networking/two-tiers-two-zones.yaml`.
Declare a `region` holding a `vpc`, an `edge` slot directly under the VPC, two `az` containers each with a public and a private `subnet` slot, and a bench.
Give the VPC and the subnets made-up address ranges in their labels or details, never the VPC demo's 10.0.0.0/16 or its names.
The pieces are two web servers, a database primary and its standby, an internet gateway (`role: internet-gateway`), two public route tables (`role: public-route`), and three bench distractors: a virtual private gateway, a NAT gateway and a route table with only the local route.
List the two zones in `failures`.
Goal g1 has a `public` constraint for the web servers; g2 has a `private` constraint for the databases; g3 has a `survive` constraint for the web servers and one for the databases, each with `min: 1`, and an `in` constraint for the distractors within the bench.
Wrong paths: the internet gateway placed while both public route tables sit on the bench (g1), a database in a public subnet (g2), and both web servers in one zone (g3).
Cite `m05/amazon-vpc-demo`, `m05/subnets-security-groups-and-network-access-control-lists`, `m05/organizing-aws-cloud-resources` and `m01/introduction-to-aws-global-infrastructure`.

### Module 8: Build the sales pipeline

Use the id `lab-m08-build-the-sales-pipeline` in `content/labs/08-ai-ml-and-data-analytics/build-the-sales-pipeline.yaml`.
Declare five top-level `stage` slots in this order, ingest, store, catalog, query and visualize, and a bench, with no failures.
The pieces are one right service per stage and distractors for the bench, such as Amazon OpenSearch Service and Amazon EMR.
The brief states the real-time till feed and the managers' dashboards that pin those choices.
Goal g1 has an `in` constraint for the ingest and store services within their stages; g2 one for AWS Glue Data Catalog and the query service within theirs; g3 one for Amazon Quick Sight within visualize and one for the distractors within the bench.
Wrong paths: Amazon EMR in the ingest stage with the streaming service on the bench, which misses the real-time till feed (g1), the Data Catalog in the query stage (g2), the Data Catalog on the bench (g2), and Amazon OpenSearch Service in visualize (g3).
Write Amazon Quick Sight with a space in every label, as the exam guide update line in `m08/data-pipelines-on-aws` names it, and tell a cafe sales story, never the lesson's own shop example.
Cite `m08/data-pipelines-on-aws`, `m08/data-analytics-and-ai-ml` and `m08/introduction-to-data-analytics`.

## Trace labs

A Trace spec has one of two kinds, `network` or `policy`; `TraceSpec` in `schemas/lab-trace.ts` is the shape, `traceCase` in `src/labs/trace/model.ts` is how each case is stepped, and `bakeryTraceLab` and `bakeryPolicyLab` in `tests/fixtures/lab-trace.ts` are the bakery labs the unit tests check.
The learner never types a rule: every rule or statement is a fixed candidate with its `on` value at the start, and the only actions are `{ t: toggle, rule, on }` and `{ t: reset }`.
A case names its goal, a label, the request, and the result it should get, `expect: allow` or `expect: deny`, and a goal passes when every one of its cases gets its expected result.
Any set of switches is a finished board, so a wrong path is just the toggles of its mistake.
Write `minutes` from 6 to 10.

A `network` spec puts one security group `sg` and one network ACL `nacl` around one `target` instance, each with up to 12 rules, and has up to 8 `cases`.
A security group rule is `{ id, dir, proto, from, to, cidr, on }` and only allows; a network ACL rule adds a rule number `n` and an `action` of `allow` or `deny`.
Use `proto: all` only with `from: 0` and `to: 65535`.
A network case is `{ id, goal, label, dir, proto, ip, port, reply, expect }`, where `port` is the request's port and `reply` the port its answer goes back to.
An inbound case is checked at the network ACL inbound, then the security group inbound, then its reply at the security group outbound, which always lets a reply out because security groups are stateful, and at the network ACL outbound on the `reply` port, because network ACLs are stateless.
An outbound case runs the security group outbound, the network ACL outbound, then the network ACL inbound on the reply port, and the security group inbound lets the reply in.
The network ACL tries its enabled rules of one direction from the lowest rule number up, the first match decides, and no match is denied by the final `*` rule; a security group with no enabled matching rule denies.
The first denial drops the packet, and the later steps are skipped.

A `policy` spec has `principals`, `groups`, an optional organization tree `org`, `policies` and `cases`.
A policy is `{ id, label, kind, attach, statements }`: an `iam` policy attaches to a principal or a group, and an `scp` policy attaches to an organization node.
A statement is `{ id, effect, actions, resources, on }`, where `*` matches any run of characters, actions match ignoring letter case and resources match exactly.
A policy case is `{ id, goal, label, principal, action, resource, expect }` and carries no conditions, so write a Region or any other limit into the action or the resource, or leave it out.
For each organization node from the root down to the principal's account, the enabled SCP statements there give a deny on a matching Deny, else an allow on a matching Allow, else no match; the principal's identity statements, its own and its groups', give the same three verdicts.
A case is denied when any step is a deny, since an explicit deny wins, and denied when any step has no match, since an SCP that does not allow an action blocks it and an identity with no Allow is denied by default; otherwise it is allowed.
Every organization node needs an SCP that allows the action, as the default full-access policy does, so give each node an allow-all statement (`*` on `*`) unless the lesson removes it; the schema rejects a node with no SCP.
Whenever the org is not empty, every principal names its member `account`, a node with no nodes below it.
The management account is not modelled: it is never an org node and never a case principal.

The notes teach few of these mechanics, so the brief states the ones a lab relies on as how this lab works: the network ACL rule order, the reply ports, explicit deny over allow, and SCPs intersecting identity policies.

This complete example is another `network` Trace lab in the made-up bakery world of the test fixtures, and R11 replays it clean; your labs are set in the cafe instead.

```yaml
id: lab-m01-bakery-window
module: 1
title: Open the order window
engine: trace
tier: core
status: live
rev: 1
concepts: [shared-kitchen, per-minute-rental]
notes: [m01/what-a-bakery-cloud-is]
minutes: 7
brief: >-
  Customers cannot order through the bakery's order window, and the bakers want SSH from their office only.
  Switch rules on or off until every case gets its expected result.
  In this lab, the network ACL tries its rules from the lowest number up and checks each reply again on its reply port, while the security group lets replies out on its own.
spec:
  kind: network
  target: Order window
  sg:
    label: window-sg
    rules:
      - { id: sg-https-any, dir: in, proto: tcp, from: 443, to: 443, cidr: 0.0.0.0/0, on: false }
      - { id: sg-ssh-any, dir: in, proto: tcp, from: 22, to: 22, cidr: 0.0.0.0/0, on: false }
      - { id: sg-ssh-office, dir: in, proto: tcp, from: 22, to: 22, cidr: 192.0.2.0/24, on: true }
  nacl:
    label: front-acl
    rules:
      - { id: acl-block-list, n: 90, dir: in, proto: all, from: 0, to: 65535, cidr: 198.51.100.0/24, action: deny, on: true }
      - { id: acl-https-in, n: 100, dir: in, proto: tcp, from: 443, to: 443, cidr: 0.0.0.0/0, action: allow, on: true }
      - { id: acl-ssh-in, n: 110, dir: in, proto: tcp, from: 22, to: 22, cidr: 0.0.0.0/0, action: allow, on: true }
      - { id: acl-replies-out, n: 100, dir: out, proto: tcp, from: 1024, to: 65535, cidr: 0.0.0.0/0, action: allow, on: false }
  cases:
    - { id: customer-https, goal: g1, label: A customer orders over HTTPS, dir: in, proto: tcp, ip: 203.0.113.10, port: 443, reply: 49152, expect: allow }
    - { id: blocked-https, goal: g1, label: A blocked address tries HTTPS, dir: in, proto: tcp, ip: 198.51.100.7, port: 443, reply: 50211, expect: deny }
    - { id: stranger-ssh, goal: g2, label: A stranger tries SSH, dir: in, proto: tcp, ip: 203.0.113.10, port: 22, reply: 50733, expect: deny }
    - { id: office-ssh, goal: g2, label: The office signs in over SSH, dir: in, proto: tcp, ip: 192.0.2.15, port: 22, reply: 51022, expect: allow }
goals:
  - id: g1
    label: Customers order, and the blocked address stays out
    hint: Follow a customer's order in and its answer back out, and ask which layer remembers the request.
  - id: g2
    label: SSH reaches the order window from the office only
    hint: Ask which layer guards this one instance, and keep it as narrow as the office.
solution:
  - { t: toggle, rule: sg-https-any, on: true }
  - { t: toggle, rule: acl-replies-out, on: true }
wrongPaths:
  - mistake: Opens the security group but forgets that the network ACL checks replies too
    failsGoal: g1
    actions:
      - { t: toggle, rule: sg-https-any, on: true }
  - mistake: Opens SSH to the whole internet to get the office in
    failsGoal: g2
    actions:
      - { t: toggle, rule: sg-https-any, on: true }
      - { t: toggle, rule: acl-replies-out, on: true }
      - { t: toggle, rule: sg-ssh-any, on: true }
debrief:
  lines:
    - The security group remembers a request it let in, so the reply leaves on its own.
    - The network ACL checks the reply again, so it needs an outbound rule for the reply ports.
    - The lowest-numbered matching network ACL rule decides, so the block list wins over the HTTPS rule.
  questions: [q-b4k7m2, q-d9p4r6]
```

This complete example is another `policy` Trace lab in the same made-up bakery world, and R11 replays it clean too.

```yaml
id: lab-m01-bakery-badges
module: 1
title: Keys for the bakers
engine: trace
tier: core
status: live
rev: 1
concepts: [shared-kitchen, per-minute-rental]
notes: [m01/what-a-bakery-cloud-is]
minutes: 7
brief: >-
  Baker Mo cannot read the recipe cards, and the owner wants the bakers kept away from the money ledger.
  Switch statements on or off until every case gets its expected result.
  In this lab, an explicit Deny beats any Allow, and an action needs an Allow from the SCPs at every level of the organization and from Mo's own policies.
spec:
  kind: policy
  principals:
    - { id: baker-mo, label: Baker Mo, groups: [bakers], account: shop-east }
  groups:
    - { id: bakers, label: Bakers }
  org:
    - { id: bakery-org, label: Bakery organization }
    - { id: shops, label: Shops, parent: bakery-org }
    - { id: shop-east, label: East shop account, parent: shops }
  policies:
    - id: root-full-access
      label: Full access at the root
      kind: scp
      attach: bakery-org
      statements:
        - { id: root-all, effect: allow, actions: ['*'], resources: ['*'], on: true }
    - id: shops-full-access
      label: Full access for the shops
      kind: scp
      attach: shops
      statements:
        - { id: shops-all, effect: allow, actions: ['*'], resources: ['*'], on: true }
    - id: east-full-access
      label: Full access for the east shop
      kind: scp
      attach: shop-east
      statements:
        - { id: east-all, effect: allow, actions: ['*'], resources: ['*'], on: true }
    - id: no-oven-deletes
      label: No oven deletes in the shops
      kind: scp
      attach: shops
      statements:
        - { id: deny-oven-delete, effect: deny, actions: ['oven:Delete*'], resources: ['*'], on: true }
    - id: bakers-policy
      label: Bakers policy
      kind: iam
      attach: bakers
      statements:
        - { id: start-ovens, effect: allow, actions: [oven:StartBake], resources: [oven/*], on: true }
        - { id: read-recipes, effect: allow, actions: [recipes:GetCard], resources: [recipe-box/*], on: false }
        - { id: everything, effect: allow, actions: ['*'], resources: ['*'], on: false }
  cases:
    - { id: mo-reads-card, goal: g1, label: Mo reads the rye recipe card, principal: baker-mo, action: recipes:GetCard, resource: recipe-box/rye.txt, expect: allow }
    - { id: mo-starts-bake, goal: g1, label: Mo starts the morning bake, principal: baker-mo, action: oven:StartBake, resource: oven/east-2, expect: allow }
    - { id: mo-deletes-oven, goal: g2, label: Mo deletes an old oven, principal: baker-mo, action: oven:DeleteOven, resource: oven/east-1, expect: deny }
    - { id: mo-reads-ledger, goal: g2, label: Mo opens the money ledger, principal: baker-mo, action: ledger:GetPage, resource: ledger/march, expect: deny }
goals:
  - id: g1
    label: Mo reads the recipes and runs the ovens
    hint: Ask which statement gives the bakers exactly the reading they need, and whether every level of the organization still allows it.
  - id: g2
    label: Mo cannot delete ovens or open the ledger
    hint: Ask what an identity is allowed when no statement mentions the action at all.
solution:
  - { t: toggle, rule: read-recipes, on: true }
wrongPaths:
  - mistake: Switches off the shops' full access to stop oven deletes, which blocks every action in the shops
    failsGoal: g1
    actions:
      - { t: toggle, rule: read-recipes, on: true }
      - { t: toggle, rule: shops-all, on: false }
  - mistake: Gives the bakers every action on everything instead of the one read
    failsGoal: g2
    actions:
      - { t: toggle, rule: everything, on: true }
debrief:
  lines:
    - An action passes only when the SCPs at every level and the identity's own policies all allow it.
    - With no matching statement, the default deny keeps Mo out of the ledger.
    - The Deny in the shops' SCP stops oven deletes even when an identity policy allows everything.
  questions: [q-b4k7m2, q-d9p4r6]
```

### Module 5: Why can't customers reach the menu?

Use the id `lab-m05-reach-the-menu` in `content/labs/05-networking/reach-the-menu.yaml`, a `network` spec.
Put one security group and one network ACL around the menu web server.
The candidate security group rules are inbound TCP 443 from 0.0.0.0/0 (off at the start), inbound TCP 22 from 0.0.0.0/0 (the tempting fix, off) and inbound TCP 22 from the office range.
The candidate network ACL rules are inbound allow 443, inbound allow 22 from 0.0.0.0/0, and outbound allow 1024 to 65535 (off at the start, the stateless trap).
The network ACL lets SSH in from anywhere on purpose, so the security group alone decides who gets SSH; an office-only network ACL rule would deny the stranger before the security group, hide the g2 mistake, and fail R11.
The cases, each with a reply port, are a customer on TCP 443 (`expect: allow`, g1), anyone on TCP 22 (`expect: deny`, g2) and the office on TCP 22 (`expect: allow`, g2).
Wrong paths: the security group fixed with no network ACL reply rule (g1), and SSH opened to 0.0.0.0/0 in the security group (g2).
Take the office range and the customer addresses from the documentation ranges.
Cite `m05/subnets-security-groups-and-network-access-control-lists` and `m05/amazon-vpc-demo`.
The notes give no rule numbers and no reply ports, so the brief states the rule order and the reply port range as how this lab works.

### Module 9: Least privilege for the barista

Use the id `lab-m09-least-privilege-for-the-barista` in `content/labs/09-security/least-privilege-for-the-barista.yaml`, a `policy` spec with no org.
The principals are a barista in a baristas group, and a manager.
The candidate statements are an allow for reading the menu objects (off at the start), an allow for everything in Amazon S3 on every resource (the tempting fix, off), a deny for deleting menu objects, a broad deny on every menu action (the over-strict fix, off), and an allow for the manager to update the menu.
The cases are the barista reading the menu (allow, g1), the manager updating it (allow, g1), the barista deleting a menu object (deny, g2) and the barista reading the payroll file (deny, g2).
Wrong paths: the broad menu deny switched on to stop deletes, which also blocks reading because an explicit deny wins (g1), and the Amazon S3-wide allow switched on (g2).
Attach the barista's statements to the group, as the lesson prefers groups, and write actions in the `s3:GetObject` style on cafe resources, never the note's own example bucket.
Cite `m09/preventing-unauthorized-access` and `m09/introduction-to-security-on-aws`.
The notes teach the default deny but not that an explicit deny beats an allow, so the brief states it as how this lab works.

### Module 10: Does the SCP allow it?

Use the id `lab-m10-does-the-scp-allow-it` in `content/labs/10-monitoring-compliance-and-governance/does-the-scp-allow-it.yaml`, a stretch `policy` spec.
Declare an org root, an OU `shops` with two accounts and an OU `lab` with one account, six nodes in all, with an allow-all SCP on each node unless the lesson replaces it with a narrower allow, plus the lesson's Deny.
Give each principal a member account and an identity policy; cases name member accounts only and carry no conditions, so a Region rule is written into the action or the resource, or dropped.
The management account is never an org node or a case principal.
Include a case the identity policy allows but an SCP does not, and a case the SCP Deny blocks.
Give every goal a wrong path, such as switching on an identity Allow and expecting it to pass an SCP that does not allow the action, or removing the Deny.
Cite `m10/aws-organizations` and `m09/preventing-unauthorized-access`.
The notes do not say that SCPs intersect identity policies or grant nothing on their own, so the brief states both as how this lab works.

## Investigate labs

An Investigate spec is a `source` caption, optional `columns` and `records`, an optional `listing`, and `questions`; `InvestigateSpec` in `schemas/lab-investigate.ts` is the shape, `src/labs/investigate/model.ts` is how answers are checked, and `bakeryInvestigateLab` in `tests/fixtures/lab-investigate.ts` is the bakery lab the unit tests check.
Records are rows of made-up evidence: each has an `id` and one cell per column, and a column with `filter: true` lets the learner narrow the rows to one value of it.
Filters match exact values only, so a time window is a column of exact values such as an hour, and filters never change a check.
A `listing` shows up to 40 plain lines of a made-up document, such as a template, under its `label`, and a lab may have a listing and no records.
Each question has a `goal`, a `prompt`, 2 to 8 `options` with ids and labels, and the `answer` option id, and a goal passes when every one of its questions holds its answer.
A lab has at most 8 questions and 5 goals.
Actions are `{ t: filter, column, value }`, `{ t: unfilter, column }`, `{ t: answer, question, option }` and `{ t: reset }`; the board is finished when every question has an answer, so every wrong path answers every question.
Write every time in UTC with the `UTC` suffix, and say in the brief that times are in UTC.
Make each answer unique and exact from the records or the listing: one option is right, and the evidence rules out every other.
Use only made-up people, IP addresses from the documentation ranges 192.0.2.0/24, 198.51.100.0/24 and 203.0.113.0/24, and documentation-style account ids such as 111122223333.
Write `minutes` from 5 to 10.
The notes do not say which events a trail log holds or what a template's type names are, so the brief states the ones a lab relies on as how this lab works.

This complete example is another Investigate lab in the made-up bakery world of the test fixtures, and R11 replays it clean; your labs are set in the cafe instead.

```yaml
id: lab-m01-bakery-starter
module: 1
title: Who emptied the starter jar?
engine: investigate
tier: core
status: live
rev: 1
concepts: [shared-kitchen, per-minute-rental]
notes: [m01/what-a-bakery-cloud-is]
minutes: 6
brief: >-
  The sourdough starter jar was found empty this morning, and the oven ledger recorded every action in the bakery.
  Filter the ledger and answer who emptied the jar, how and when.
  All times are in UTC.
spec:
  source: Oven ledger, harbour branch, 2 March, times in UTC
  columns:
    - { id: time, label: Time (UTC) }
    - { id: who, label: Who, filter: true }
    - { id: event, label: Event, filter: true }
    - { id: item, label: Item }
    - { id: result, label: Result, filter: true }
  records:
    - { id: r1, cells: { time: '05:58 UTC', who: baker-mo, event: SignIn, item: till, result: done } }
    - { id: r2, cells: { time: '06:05 UTC', who: baker-mo, event: ReadRecipe, item: rye-card, result: done } }
    - { id: r3, cells: { time: '06:40 UTC', who: helper-jo, event: SignIn, item: till, result: done } }
    - { id: r4, cells: { time: '06:52 UTC', who: helper-jo, event: EmptyJar, item: starter-jar, result: denied } }
    - { id: r5, cells: { time: '07:10 UTC', who: baker-mo, event: StartOven, item: oven-2, result: done } }
    - { id: r6, cells: { time: '07:31 UTC', who: owner-lu, event: SignIn, item: till, result: done } }
    - { id: r7, cells: { time: '07:45 UTC', who: owner-lu, event: EmptyJar, item: starter-jar, result: done } }
    - { id: r8, cells: { time: '08:02 UTC', who: baker-mo, event: ReadRecipe, item: starter-card, result: done } }
  questions:
    - id: who
      goal: g1
      prompt: Who emptied the starter jar?
      options:
        - { id: baker-mo, label: baker-mo }
        - { id: helper-jo, label: helper-jo }
        - { id: owner-lu, label: owner-lu }
      answer: owner-lu
    - id: what
      goal: g1
      prompt: Which event emptied the jar?
      options:
        - { id: start-oven, label: StartOven }
        - { id: empty-jar, label: EmptyJar }
        - { id: read-recipe, label: ReadRecipe }
      answer: empty-jar
    - id: when
      goal: g2
      prompt: When was the jar emptied?
      options:
        - { id: t0652, label: '06:52 UTC' }
        - { id: t0745, label: '07:45 UTC' }
        - { id: t0802, label: '08:02 UTC' }
      answer: t0745
goals:
  - id: g1
    label: Name who emptied the jar and how
    hint: Read the result of each attempt, since a denied attempt changed nothing.
  - id: g2
    label: Pin down when the jar was emptied
    hint: Take the time of the attempt that worked, not the first one you see.
solution:
  - { t: filter, column: event, value: EmptyJar }
  - { t: answer, question: who, option: owner-lu }
  - { t: answer, question: what, option: empty-jar }
  - { t: answer, question: when, option: t0745 }
wrongPaths:
  - mistake: Names the baker whose attempt was denied
    failsGoal: g1
    actions:
      - { t: answer, question: who, option: helper-jo }
      - { t: answer, question: what, option: empty-jar }
      - { t: answer, question: when, option: t0745 }
  - mistake: Takes the time of the denied attempt
    failsGoal: g2
    actions:
      - { t: answer, question: who, option: owner-lu }
      - { t: answer, question: what, option: empty-jar }
      - { t: answer, question: when, option: t0652 }
debrief:
  lines:
    - A ledger answers who, what and when only when you read each row's result as well.
    - A denied attempt is evidence of intent, not of the change itself.
  questions: [q-b4k7m2, q-d9p4r6]
```

### Module 10: Who deleted the menu bucket?

Use the id `lab-m10-who-deleted-the-menu-bucket` in `content/labs/10-monitoring-compliance-and-governance/who-deleted-the-menu-bucket.yaml`.
Write a trail log of 10 to 14 made-up management-event records on one day, in UTC, with columns such as time, hour, user, event, source IP and result, and no object-level rows.
Filter on exact values only: `hour`, `user`, `event` and `result`.
Ask who, what, when and from where, and optionally which service records this (AWS CloudTrail, not Amazon CloudWatch Logs), in at most 5 goals.
Include a denied delete attempt by another user as the red herring.
Give every goal a wrong path: the denied attempt's user as who, a wrong time, and Amazon CloudWatch Logs as the recorder when the lab asks which service records it.
Cite `m10/aws-cloudtrail`, `m10/amazon-cloudwatch` and `m06/amazon-simple-storage-service-amazon-s3`.
The notes say the event history keeps management events but not which events those are, so the brief states that this log holds management events such as a bucket delete as how this lab works.

### Module 13: Well-Architected review of the cafe

Use the id `lab-m13-well-architected-review` in `content/labs/13-well-architected-solutions/well-architected-review.yaml`.
Write exactly six findings as records, one per pillar, and state the framing of each rightsizing finding, capacity fit or spend, so it has one pillar.
Ask six "which pillar" questions, three in g1 and three in g2, and one or two fix questions in g3, 8 questions at most, with the six pillar names as option labels.
Wrong paths: Performance Efficiency for the spend finding in one of g1 and g2, Cost Optimization for the capacity-fit finding in the other, and a wrong fix (g3).
Cite `m13/aws-well-architected-framework` and `m13/introduction-to-well-architected-solutions`, and never reuse the lesson's worked example rows.

### Module 4: What will this template create?

Use the id `lab-m04-what-will-this-template-create` in `content/labs/04-going-global/what-will-this-template-create.yaml`, a stretch lab.
Write a `listing` of up to 40 lines of a made-up template, with a parameter that picks test or production, a few resources and an output, and no records.
Ask what the template creates: how many instances one environment gets, which port the security group opens, and what a second deployment in another Region creates.
Give every goal a wrong path, such as counting an instance only the other environment creates, or thinking a second deployment changes the first.
Cite `m04/infrastructure-and-automation`, plus `m02/introduction-to-amazon-ec2` and `m06/amazon-simple-storage-service-amazon-s3` when a question rests on them.
The notes teach no template syntax, so the brief states the type names the template uses, such as `AWS::EC2::Instance`, as how this lab works.

## Stretch labs

A stretch lab meets the same bar as a core lab: grounded in its notes, original, set in the cafe, with a wrong path for every goal and a debrief on its own concepts.
Only its `tier: stretch` differs, and the cut rule drops stretch labs before any core lab.
Sort and Configure stretch labs use those engines unchanged, as the Sort example and `## Configure labs` describe.
Simulate stretch labs copy every number from their row of `SIM_LABS` in `tests/content/sim-labs.test.ts`, as `## Simulate labs` says, and write only the text.
The stretch labs of Place, Trace and Investigate have their plans in those sections above.

### Module 2: Pay less for beans

Use the id `lab-m02-pay-less-for-beans` in `content/labs/02-compute-in-the-cloud/pay-less-for-beans.yaml`, with the `purchase` model.
Copy its row of `SIM_LABS`: four workloads (the till and order server, weekend roast planning, a holiday promo site and loyalty software licensed per physical server), the six purchase options as choices, and the goals on the yearly total with the cost of the roast planning, the jobs Spot may stop and the hardware needs.
Use the current names On-Demand Instances, Reserved Instances, Savings Plans, Spot Instances, Dedicated Instances and Dedicated Hosts.
Cite `m02/amazon-ec2-pricing`, including its exam guide update lines on Savings Plans and Reserved Instance flexibility.

### Module 2: Queue, topic or event bus

Use the id `lab-m02-queue-topic-or-event-bus` in `content/labs/02-compute-in-the-cloud/queue-topic-or-event-bus.yaml`.
Declare three buckets, Amazon SQS, Amazon SNS and Amazon EventBridge, and 8 to 12 cafe cards.
Order tickets held until a barista is free belong to the queue, one menu change sent to the app, the email list and the signage belongs to the topic, and events from many sources routed by rule belong to the event bus.
List an `also` bucket only where `m02/messaging-and-queuing` lets two services do the job.

### Module 5: Connect the shops

Use the id `lab-m05-connect-the-shops` in `content/labs/05-networking/connect-the-shops.yaml`.
Declare up to eight buckets from the connectivity lessons: AWS Client VPN, AWS Site-to-Site VPN, AWS Direct Connect, AWS PrivateLink, AWS Transit Gateway, internet gateway and NAT gateway.
Write cafe cards for them, such as a remote barista's laptop, a shop's office router, the roastery's steady private high-bandwidth link, many shop VPCs joined at one hub, private access to a supplier's service, and private instances fetching updates.
Name the two VPN services by their full names and never as one "AWS VPN", since no note carries an exam guide update line for that name.
Cite `m05/more-ways-to-connect-to-the-aws-cloud`, `m05/organizing-aws-cloud-resources` and `m05/global-architectures`.

### Module 6: Lose the instance

Use the id `lab-m06-lose-the-instance` in `content/labs/06-storage/lose-the-instance.yaml`, with the `data-loss` model.
Copy its row of `SIM_LABS`: the order store is a choice of instance store or Amazon EBS, snapshots run every so many hours, and the goals bound the orders lost at the planned stop, the orders lost with the zone and the snapshot cost.
Cite `m06/ec2-instance-store-and-amazon-elastic-block-store-amazon-ebs` and `m06/amazon-elastic-block-store-amazon-ebs-data-lifecycle`.

### Module 7: Who manages what?

Use the id `lab-m07-who-manages-what` in `content/labs/07-databases/who-manages-what.yaml`.
Declare three buckets, unmanaged, managed and fully managed, and 8 to 12 cards: a database on Amazon EC2, Amazon RDS, Amazon DynamoDB and AWS Lambda, plus duty cards for each, such as patching the database engine on an EC2 instance or writing the function code.
No card may claim that AWS does nothing for Amazon EC2, since AWS still runs the physical layer under it.
Cite `m03/introduction-to-serverless-computing`, `m07/introduction-to-databases`, `m07/nosql-database-services` and `m03/aws-lambda`.

### Module 9: Lock the root user

Use the id `lab-m09-lock-the-root-user` in `content/labs/09-security/lock-the-root-user.yaml`; it fits the Configure spec unchanged.
Declare a toggle for MFA on the root user, initially off, a select for root access keys (none, keep the existing one, create one for the command line), a select for daily sign-in (the root user, an IAM user in an admin group, AWS IAM Identity Center), a select for the root password, and a select for what the IAM password policy covers.
Goals: g1 root sign-in is protected, with MFA, a long unique password and a password policy that covers IAM users only; g2 no long-term root credentials exist; g3 daily work stays off the root user.
Wrong paths: MFA left off (g1), the root access key kept for the command line (g2), and daily sign-in as the root user (g3).
Cite `m09/preventing-unauthorized-access`, including its exam guide update lines on password policies and access keys.

### Module 12: CAF perspectives

Use the id `lab-m12-caf-perspectives` in `content/labs/12-migrating-to-the-aws-cloud/caf-perspectives.yaml`.
Declare six buckets, Business, People, Governance, Platform, Security and Operations, and two cafe migration tasks or roles per perspective, 12 cards in all.
A business analyst card may list Governance in `also`, since the note maps that role to both perspectives.
Cite `m12/aws-cloud-adoption-framework`.
