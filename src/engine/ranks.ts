import { daysBetween } from './day.ts';
import { bossPassMark } from './memory.ts';
import { firstAttempts, type MockAttempt } from './mock.ts';
import { examsOf, type Progress } from './replay.ts';

/**
 * Ranks (spec 3.4): the Support plans of `content/game/ranks.yaml`, earned by bosses, hexes and unseen mocks,
 * never by XP. The app records each promotion as a `rank` event, so the shown rank never drops.
 */
export interface RankDef {
  id: string;
  name: string;
  short: string;
  requires: {
    bosses?: number;
    hexesAt60?: number;
    unseenMocksAt80?: number;
    latestMockWithinDays?: number;
    ready?: boolean;
  };
  facts: readonly string[];
}

/** What the rank rules read at one moment. */
export interface RankFacts {
  bossesPassed: number;
  hexesAt60: number;
  attempts: readonly MockAttempt[];
  ready: boolean;
  today: string;
}

/** An unseen mock counts toward a rank from this share right. */
export const UNSEEN_MOCK_MARK = 0.8;
/** A hex counts toward a rank from this module mastery. */
export const HEX_MARK = 60;

/** The first attempts at 80% or more, one per form, oldest first. */
function atEighty(attempts: readonly MockAttempt[]): MockAttempt[] {
  const byForm = new Map<string, MockAttempt>();
  for (const a of attempts) if (a.percent >= UNSEEN_MOCK_MARK && !byForm.has(a.form)) byForm.set(a.form, a);
  return [...byForm.values()].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
}

/** The facts of the log at one moment: modules with a passed boss, module masteries at 60 or more, first attempts. */
export function rankFacts(args: {
  progress: Progress;
  mastery: ReadonlyMap<number, number>;
  ready: boolean;
  today: string;
}): RankFacts {
  const passed = new Set(
    examsOf(args.progress, 'boss')
      .filter((r) => r.total > 0 && r.correct >= bossPassMark(r.total))
      .map((r) => r.scope),
  );
  return {
    bossesPassed: passed.size,
    hexesAt60: [...args.mastery.values()].filter((m) => m >= HEX_MARK).length,
    attempts: firstAttempts(args.progress),
    ready: args.ready,
    today: args.today,
  };
}

/** True when every requirement of the rank holds at the same moment. */
export function meets(rank: RankDef, facts: RankFacts): boolean {
  const r = rank.requires;
  if (r.bosses !== undefined && facts.bossesPassed < r.bosses) return false;
  if (r.hexesAt60 !== undefined && facts.hexesAt60 < r.hexesAt60) return false;
  const good = atEighty(facts.attempts);
  if (r.unseenMocksAt80 !== undefined && good.length < r.unseenMocksAt80) return false;
  if (r.latestMockWithinDays !== undefined) {
    const latest = good.at(-1);
    if (latest === undefined || daysBetween(latest.day, facts.today) > r.latestMockWithinDays) return false;
  }
  if (r.ready === true && !facts.ready) return false;
  return true;
}

/** The highest rank whose every requirement holds now; the first rank (Basic) always does. */
export function computedRank(ranks: readonly RankDef[], facts: RankFacts): RankDef {
  for (let i = ranks.length - 1; i > 0; i--) {
    const rank = ranks[i];
    if (rank !== undefined && meets(rank, facts)) return rank;
  }
  const [basic] = ranks;
  if (basic === undefined) throw new Error('ranks.yaml lists no rank');
  return basic;
}

const indexOf = (ranks: readonly RankDef[], id: string): number => ranks.findIndex((r) => r.id === id);

/** The highest of the computed rank and every recorded one, so decay or a replay never lowers it. */
export function shownRank(
  ranks: readonly RankDef[],
  facts: RankFacts,
  recorded: ReadonlySet<string>,
): RankDef {
  const computed = computedRank(ranks, facts);
  let best = indexOf(ranks, computed.id);
  for (const id of recorded) best = Math.max(best, indexOf(ranks, id));
  return ranks[best] ?? computed;
}

/** The computed rank when it is above every recorded one, for the app to record; never Basic. */
export function rankToRecord(
  ranks: readonly RankDef[],
  facts: RankFacts,
  recorded: ReadonlySet<string>,
): RankDef | null {
  const computed = computedRank(ranks, facts);
  const at = indexOf(ranks, computed.id);
  if (at <= 0) return null;
  for (const id of recorded) if (indexOf(ranks, id) >= at) return null;
  return computed;
}

/**
 * Home's next-rank line: `Enterprise: 9/13 bosses, 8/13 hexes at 60`, or for a mock rank
 * `Unified Operations: 1/2 unseen mocks at 80, readiness Close`; `label` is the readiness label, or `-`
 * while readiness has no number. Null at the top rank.
 */
export function nextRankLine(
  ranks: readonly RankDef[],
  shown: RankDef,
  facts: RankFacts,
  label: string,
): string | null {
  const at = indexOf(ranks, shown.id);
  const next = at < 0 ? undefined : ranks[at + 1];
  if (next === undefined) return null;
  const r = next.requires;
  const parts: string[] = [];
  const of = (have: number, need: number, what: string) => `${Math.min(have, need)}/${need} ${what}`;
  if (r.bosses !== undefined) parts.push(of(facts.bossesPassed, r.bosses, 'bosses'));
  if (r.hexesAt60 !== undefined) parts.push(of(facts.hexesAt60, r.hexesAt60, 'hexes at 60'));
  if (r.unseenMocksAt80 !== undefined) {
    parts.push(of(atEighty(facts.attempts).length, r.unseenMocksAt80, 'unseen mocks at 80'));
  }
  if (r.ready === true) parts.push(`readiness ${label}`);
  return `${next.name}: ${parts.join(', ')}`;
}
