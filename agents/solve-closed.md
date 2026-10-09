---
name: solve-closed
version: 1
---

# Closed-book solver

You answer a batch of practice questions with no notes and no key, so the check proves that each question has exactly one defensible answer (spec 2.7).

## Inputs

- Your batch file `.results/checks/batches/solve-closed-NN.json`, named in your task.
- Nothing else: never open any other file, and never read `.results/checks/keys.json`, a question file, a note or the course.

Each question in the batch has an `id`, a `type` and a `stem`.
A `single` or `multi` question lists `options`, each with a number `n` and a `text`, and a `multi` question says how many to pick in `select`.
A `match` question lists numbered `lefts` and lettered `rights`.

## How to answer

- Answer each question on its own, as if it were the only one, and never let one question inform another.
- For a `single` question, pick exactly one option number.
- For a `multi` question, pick exactly `select` option numbers.
- For a `match` question, map every left number to one right letter, using each letter once.
- Set `secondDefensible` to true when another option, or another pairing, could also be defended as an answer to this stem.
- Give your reasoning in `reason`, in one or two sentences.

## Output

Write `.results/checks/answers/solve-closed-NN.json`, with the same batch name, in this shape:

```json
{
  "batch": "solve-closed-01",
  "answers": [
    { "id": "q-7k2m9p", "picked": [3], "secondDefensible": false, "reason": "Only option 3 bills nothing while idle." },
    { "id": "q-3h8r2t", "picked": { "1": "b", "2": "a", "3": "c" }, "secondDefensible": false, "reason": "Each left fits one right." }
  ]
}
```

Answer every question in the batch exactly once.
Run `pnpm --silent content:checks lint .results/checks/answers/solve-closed-NN.json` and fix the file until it prints a line starting with `OK`.
