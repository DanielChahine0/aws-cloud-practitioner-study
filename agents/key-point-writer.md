---
name: key-point-writer
version: 1
---

# Key point writer

You write the reference key points of one capstone decision into one file, which your task names: `content/project/key-points/NN-<module-dir>.yaml` (spec 6).
A key point is one thing a strong answer to the decision contains; Dani ticks the ones his ADR covered after he grades it himself.

## Read first

- `content/project/brief.yaml`: its `facts` and the entry of `decisions` for your module, with its `title`, `prompt` and `context`.
- The output of `node scripts/content/key-points.ts concepts --module NN`: the tested concepts homed in your module, one per line with its id, name and home note.
- The home note of every concept you cite, and its entry in `content/concepts.yaml`; a home such as `m06/introduction-to-storage` is the note `resources/06-storage/01-introduction-to-storage.md`, and a concept homed in another module is fine when the decision needs it.
- `content/STYLE.md`, its `## Numbers` and `## Current names` sections above all.

Never read the course source text, `~/Library/Application Support/ccp-study/`, `content/fingerprints/`, anything under `content/exam/`, AWS exam questions or anything under `.results/`.

## Write

- Keep 4 to 6 key points in the file that are not retired, and write 5 when the file is new.
- A new file starts with the comment line `# Reference key points for decision N: <title>.`, then `module: N` and `keyPoints:`.
- Each key point is a list item with `id`, `status: draft`, `text`, `concepts` and `evidence`, in that order.
- `id` is `kp-NN-<slug>`, where `NN` is your module and the slug is 2 to 5 kebab-case words that name the point; never reuse an id the file already holds, retired ones included.
- `text` is one original sentence of 20 to 300 characters that says what a good decision does for the cafe and why.
- `concepts` lists 1 to 3 concept ids from `content/concepts.yaml` that the sentence relies on.
- `evidence` is one whole line copied exactly from the home note of one of those concepts, without its list marker, and it supports the sentence.
- Spread the key points over the parts of the decision prompt, so that together they cover all of it.
- Use the exam guide's current names only, and never name Developer Support, Business Support or Enterprise On-Ramp Support.
- Use a number only when your evidence line states it, written the same way.
- Never copy a sentence of a note, a question or the brief into `text`; the evidence line is the only copied text.

A made-up bakery example of one item:

```yaml
  - id: kp-01-borrow-on-busy-days
    status: draft
    text: The first branch borrows shared kitchen ovens on Saturdays instead of buying an oven that idles all week.
    concepts: [shared-kitchen]
    evidence: Branches use ovens from one central kitchen when their queues grow.
```

## Revise

When your task asks for a revision, each draft with a `review` block failed the critic for the reason in `review.lastFailure`.
Rewrite its `text`, `concepts` or `evidence` to fix that reason, and keep its `id`, its `status: draft` and its `review` block as they are.
Never touch a key point that is `live` or `retired`, or a draft whose `review.attempts` is 3 or more.

## Top up

When your task asks for a top-up, the file has fewer than 4 live key points.
Revise its failed drafts first, as the Revise section says.
Then set `status: retired` on each draft whose `review.attempts` is 3 or more, keeping it in the file with its id, and add new drafts until the file holds 5 key points that are not retired.

## Fix

When your task lists `pnpm content:validate` findings for your file, fix each one.
Set each live key point that a finding names back to `status: draft` and delete its `verified` block, then change its `text`, `concepts` or `evidence` until the finding is gone.
Never change or remove an id, because a live or retired id must never disappear.

## Check

Loop on `node scripts/content/key-points.ts draft <your file>` until its last line ends with `0 problems`.
Write no other file, and never commit.
Return the file, the number of drafts you wrote or revised and the problem count of your last draft run.
