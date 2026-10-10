import { describe, expect, it } from 'vitest';
import { LAB_SCHEMAS, LabFile, SortSpec } from '../../schemas/lab.ts';
import { bakeryLab } from '../fixtures/labs.ts';

/** Each issue as `path: message`, for exact assertions on the custom messages. */
const issues = (result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) => (result.error?.issues ?? []).map((i) => `${i.path.map(String).join('.')}: ${i.message}`);
const paths = (result: { error?: { issues: { path: PropertyKey[] }[] } }) =>
  (result.error?.issues ?? []).map((i) => i.path.map(String).join('.'));

const spec = () => bakeryLab().spec as SortSpec;

describe('lab file schema (spec 5.1)', () => {
  it('accepts the bakery lab and defaults status to live', () => {
    const { status: _, ...noStatus } = bakeryLab();
    const parsed = LabFile.safeParse(noStatus);
    expect(issues(parsed)).toEqual([]);
    expect(parsed.data?.status).toBe('live');
  });

  it('rejects an id whose module number differs from module', () => {
    expect(issues(LabFile.safeParse(bakeryLab({ module: 2 })))).toEqual([
      'id: must start with lab-m02- to match module 2',
    ]);
  });

  it('rejects a wrong path whose failsGoal names no goal, and a goal with no wrong path', () => {
    const [first, second] = bakeryLab().wrongPaths;
    if (first === undefined || second === undefined) throw new Error('the bakery lab has two wrong paths');
    expect(
      issues(LabFile.safeParse(bakeryLab({ wrongPaths: [first, { ...second, failsGoal: 'g7' }] }))),
    ).toEqual(['wrongPaths.1.failsGoal: names no goal: g7', 'goals.1: goal g2 has no wrong path']);
  });

  it('rejects one or four debrief questions, and a question listed twice', () => {
    const debrief = (questions: string[]) => bakeryLab({ debrief: { ...bakeryLab().debrief, questions } });
    expect(paths(LabFile.safeParse(debrief(['q-b4k7m2'])))).toEqual(['debrief.questions']);
    expect(paths(LabFile.safeParse(debrief(['q-b4k7m2', 'q-d9p4r6', 'q-c8n3p5', 'q-7k2m9p'])))).toEqual([
      'debrief.questions',
    ]);
    expect(issues(LabFile.safeParse(debrief(['q-b4k7m2', 'q-b4k7m2'])))).toEqual([
      'debrief.questions.1: q-b4k7m2 is listed twice',
    ]);
  });

  it('rejects an engine that does not exist', () => {
    expect(paths(LabFile.safeParse({ ...bakeryLab(), engine: 'place' }))).toEqual(['engine']);
  });
});

describe('Sort spec schema (spec 5.1)', () => {
  it('accepts the bakery spec and its solution actions', () => {
    const sort = LAB_SCHEMAS.sort;
    if (sort === undefined) throw new Error('Sort ships in Phase 4');
    expect(sort.spec.safeParse(spec()).success).toBe(true);
    expect(bakeryLab().solution.every((a) => sort.action.safeParse(a).success)).toBe(true);
    expect(sort.action.safeParse({ t: 'drag', card: 'saturday-ovens' }).success).toBe(false);
  });

  it('defaults also to an empty list', () => {
    const s = spec();
    const cards = s.cards.map(({ also: _, ...card }) => card);
    expect(SortSpec.parse({ ...s, cards }).cards.every((c) => c.also.length === 0)).toBe(true);
  });

  it('rejects a card whose bucket is unknown, an also that repeats the bucket, and duplicate card ids', () => {
    const s = spec();
    const [a, b, c, d] = s.cards;
    if (a === undefined || b === undefined || c === undefined || d === undefined)
      throw new Error('four cards');
    expect(issues(SortSpec.safeParse({ ...s, cards: [{ ...a, bucket: 'bread-van' }, b, c, d] }))).toEqual([
      'cards.0.bucket: names no bucket: bread-van',
    ]);
    expect(
      issues(SortSpec.safeParse({ ...s, cards: [{ ...a, also: ['shared-kitchen'] }, b, c, d] })),
    ).toEqual(["cards.0.also.0: repeats the card's bucket shared-kitchen"]);
    expect(issues(SortSpec.safeParse({ ...s, cards: [a, { ...b, id: a.id }, c, d] }))).toEqual([
      'cards.1.id: card saturday-ovens is used twice',
    ]);
  });
});
