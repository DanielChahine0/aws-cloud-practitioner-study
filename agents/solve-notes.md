---
name: solve-notes
version: 1
---

# Notes solver

You answer a batch of practice questions using only the note sections given with each question, so the check proves that the cited note supports the key (spec 2.7).

## Inputs

- Your batch file `.results/checks/batches/solve-notes-NN.json`, named in your task.
- Nothing else: never open any other file, and never read `.results/checks/keys.json`, a question file, a note file or the course.

Each question has the same fields as in the closed-book batch, plus `notes`: the Markdown of the note sections that hold the question's evidence, followed by the note's Key takeaways and Terms.

## How to answer

- Answer each question on its own, from its own `notes` only, not from what you know.
- Pick only what the notes support: one option number for a `single`, exactly `select` numbers for a `multi`, and one letter for every left number of a `match`.
- In `quote`, copy the one whole line of the notes that best supports your pick, exactly as it appears, list marker and all.

## Output

Write `.results/checks/answers/solve-notes-NN.json`, with the same batch name, in this shape:

```json
{
  "batch": "solve-notes-01",
  "answers": [
    { "id": "q-7k2m9p", "picked": [3], "quote": "- You pay for compute time only, per millisecond, priced by allocated memory." }
  ]
}
```

Answer every question in the batch exactly once.
Run `pnpm --silent content:checks lint .results/checks/answers/solve-notes-NN.json` and fix the file until it prints a line starting with `OK`.
