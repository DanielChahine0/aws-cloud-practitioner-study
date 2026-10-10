import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { stringify } from 'yaml';
import { TASK_IDS, type TaskId } from '../../schemas/common.ts';
import type { Quotas } from '../../schemas/exam.ts';
import type { MatchQuestion, MultiQuestion, Question, SingleQuestion } from '../../schemas/question.ts';

/** The fixture tree's one question file. */
export const QUESTION_FILE = 'content/questions/01-baking-basics/01-what-a-bakery-cloud-is.yaml';
const NOTE = 'm01/what-a-bakery-cloud-is';

/** Made-up bakery questions for the pipeline tests; each call returns a fresh copy. */
export function singleQuestion(over: Partial<SingleQuestion> = {}): SingleQuestion {
  return {
    id: 'q-7k2m9p',
    version: 1,
    status: 'draft',
    type: 'single',
    pool: 'practice',
    concept: 'shared-kitchen',
    note: NOTE,
    task: '1.1',
    level: 2,
    stem: 'The harbour branch sells out of croissants before noon on market days. Which arrangement gives it extra baking capacity only on those days?',
    options: [
      {
        id: 'a',
        text: 'Use spare ovens in the central kitchen',
        correct: true,
        why: 'The central kitchen lends ovens when a branch queue grows and takes them back after.',
      },
      {
        id: 'b',
        text: 'Install a permanent oven at the branch',
        correct: false,
        why: 'A permanent oven costs money on the quiet days as well as the market days.',
      },
      {
        id: 'c',
        text: 'Ask customers to order a week ahead',
        correct: false,
        why: 'Advance orders shift demand but add no ovens for the busy mornings.',
      },
      {
        id: 'd',
        text: 'Bake the market stock the night before',
        correct: false,
        why: "Baking early changes the timing and still uses only the branch's own ovens.",
      },
    ],
    evidence: ['Branches use ovens from one central kitchen when their queues grow.'],
    takeaway: 'Borrow central ovens for peaks instead of owning capacity for them.',
    history: [],
    ...over,
  };
}

export function multiQuestion(over: Partial<MultiQuestion> = {}): MultiQuestion {
  return {
    id: 'q-5n4w8x',
    version: 1,
    status: 'draft',
    type: 'multi',
    select: 2,
    pool: 'practice',
    concept: 'shared-kitchen',
    note: NOTE,
    task: '1.1',
    level: 2,
    stem: 'The canal branch has long queues on some mornings and none on others. Which choices let it bake more only on the busy mornings?',
    options: [
      {
        id: 'a',
        text: 'Borrow ovens from the central kitchen',
        correct: true,
        why: 'Borrowed ovens arrive when the queue grows and go back once it shrinks.',
      },
      {
        id: 'b',
        text: 'Give borrowed ovens back when quiet',
        correct: true,
        why: 'Returning ovens on quiet mornings stops paying for capacity nobody needs.',
      },
      {
        id: 'c',
        text: 'Buy a second oven for the branch',
        correct: false,
        why: 'A bought oven stays at the branch and costs money on quiet mornings too.',
      },
      {
        id: 'd',
        text: 'Close the branch on busy mornings',
        correct: false,
        why: 'Closing turns customers away instead of adding any baking capacity.',
      },
      {
        id: 'e',
        text: 'Hire a baker for every quiet morning',
        correct: false,
        why: 'Extra staff on quiet mornings adds cost and no ovens for the busy ones.',
      },
    ],
    evidence: ['Branches use ovens from one central kitchen when their queues grow.'],
    takeaway: 'Borrow capacity when busy and give it back when quiet.',
    history: [],
    ...over,
  };
}

export function matchQuestion(over: Partial<MatchQuestion> = {}): MatchQuestion {
  return {
    id: 'q-3h8r2t',
    version: 1,
    status: 'draft',
    type: 'match',
    pool: 'practice',
    concept: 'per-minute-rental',
    note: NOTE,
    task: '4.1',
    level: 1,
    stem: 'Match each bakery situation with how the proofing cabinet bill behaves.',
    pairs: [
      {
        left: 'Dough is proofing',
        right: 'The cabinet is billed',
        why: 'Cabinets cost money only while dough is inside them proofing.',
      },
      {
        left: 'Cabinet stands empty',
        right: 'Nothing is billed',
        why: 'An empty cabinet is not in use and the per-minute bill stops.',
      },
      {
        left: 'Proofing ends early',
        right: 'Billing stops at once',
        why: 'Billing follows the minutes of use and an early finish costs less.',
      },
    ],
    evidence: ['Cabinets are billed only while dough proofs.'],
    takeaway: 'Per-minute rental bills only the minutes that the cabinet is in use.',
    history: [],
    ...over,
  };
}

/** Writes the given questions as the fixture tree's question file. */
export function writeQuestions(root: string, questions: readonly Question[], file = QUESTION_FILE): void {
  writeFileSync(join(root, file), stringify({ questions }, { lineWidth: 0 }));
}

/** The exam-pool file of the fixture tree's one module; the tree ships without it. */
export const POOL_FILE = 'content/exam/pool/01-baking-basics.yaml';

/** Writes the given questions as an exam-pool file, creating content/exam/pool/ when needed. */
export function writePool(root: string, questions: readonly unknown[], file = POOL_FILE): void {
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, file), stringify({ questions }, { lineWidth: 0 }));
}

/**
 * Made-up quotas for the fixture tree's two concepts, for tests that set `ctx.quotas` directly: cells m01 1.1
 * (target 2) and m01 4.1 (target 1), and 1 multi-response item in domain 1. Only R10 and the targets read it, so it
 * skips the schema's sums.
 */
export function fixtureQuotas(): Quotas {
  const tasks = Object.fromEntries(TASK_IDS.map((t) => [t, 0])) as Record<TaskId, number>;
  return {
    form: {
      size: 65,
      domains: { '1': 16, '2': 19, '3': 22, '4': 8 },
      tasks,
      multi: { '1': 2, '2': 2, '3': 3, '4': 1 },
    },
    pool: { size: 260, forms: 4, maxPerConcept: 4, multi: { '1': 1, '2': 0, '3': 0, '4': 0 } },
    cells: [
      { module: 1, task: '1.1', target: 2 },
      { module: 1, task: '4.1', target: 1 },
    ],
    multiByModule: [{ module: 1, domain: '1', target: 1 }],
  };
}
