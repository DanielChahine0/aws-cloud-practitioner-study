import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import type { ContentIndex } from '../../schemas/chunks.ts';
import { Badges, Ranks } from '../../schemas/game.ts';
import { buildContent } from '../../scripts/content/build.ts';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { parseUpdateLine } from '../../scripts/content/lib/update-line.ts';
import { CORE_LABS_PER_MODULE, HANDS_ON_MODULES } from '../../src/engine/badges.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const ranksText = readFileSync(join(ROOT, 'content/game/ranks.yaml'), 'utf8');
const ranks = Ranks.parse(parse(ranksText));
const badges = Badges.parse(parse(readFileSync(join(ROOT, 'content/game/badges.yaml'), 'utf8')));

/** The sentence of every Exam guide update line in the Module 11 notes. */
function module11Sentences(): Set<string> {
  const [dir] = readdirSync(join(ROOT, 'resources')).filter((d) => d.startsWith('11-'));
  if (dir === undefined) throw new Error('no Module 11 folder under resources/');
  const sentences = new Set<string>();
  for (const file of readdirSync(join(ROOT, 'resources', dir)).filter((f) => f.endsWith('.md'))) {
    for (const line of readFileSync(join(ROOT, 'resources', dir, file), 'utf8').split('\n')) {
      const update = parseUpdateLine(line);
      if (update !== null) sentences.add(update.sentence);
    }
  }
  return sentences;
}

describe('content/game/ranks.yaml (spec 3.4)', () => {
  it('holds the four Support-plan ranks in order', () => {
    expect(ranks.map((r) => [r.id, r.name, r.short])).toEqual([
      ['basic', 'Basic', 'Basic'],
      ['business-support-plus', 'Business Support+', 'Business+'],
      ['enterprise', 'Enterprise', 'Enterprise'],
      ['unified-operations', 'Unified Operations', 'Unified Ops'],
    ]);
    expect(ranks.map((r) => r.requires)).toEqual([
      {},
      { bosses: 5, hexesAt60: 5 },
      { bosses: 13, hexesAt60: 13 },
      { unseenMocksAt80: 2, latestMockWithinDays: 14, ready: true },
    ]);
  });

  it('each rank fact equals, word for word, the sentence of a Module 11 Exam guide update line', () => {
    const sentences = module11Sentences();
    const facts = ranks.flatMap((r) => r.facts ?? []);
    expect(facts).toHaveLength(6);
    for (const fact of facts) expect(sentences.has(fact), fact).toBe(true);
  });

  it('rank text never contains the five-plan list or the January 1, 2027 notice', () => {
    for (const banned of ['Developer', 'Enterprise On-Ramp', 'January 1, 2027', '2027']) {
      expect(ranksText.includes(banned), banned).toBe(false);
    }
  });
});

describe('content/game/badges.yaml (spec 3.10)', () => {
  it('lists the 12 badges by their spec names, in spec order', () => {
    expect(badges.map((b) => b.name)).toEqual([
      'First Brew',
      'Clean Queue',
      'Changed My Mind',
      'Long Memory',
      'Well Calibrated',
      'Hands On',
      'Lab Complete',
      'Leave No Trace',
      'Full Dress Rehearsal',
      'Pass Mark',
      'Even Keel',
      'Architect',
    ]);
  });

  it('marks the badges that wait for labs, missions and the capstone', () => {
    expect(badges.filter((b) => b.arrives !== undefined).map((b) => [b.id, b.arrives])).toEqual([
      ['lab-complete', 'labs'],
      ['leave-no-trace', 'missions'],
      ['architect', 'capstone'],
    ]);
  });

  it('shows Hands On as earnable exactly when 5 modules ship both core labs', () => {
    const built = buildContent(loadContext(ROOT));
    const index = JSON.parse(built.files.get(built.indexFile) ?? 'null') as ContentIndex;
    const perModule = new Map<number, number>();
    for (const lab of index.labs) {
      if (lab.tier === 'core') perModule.set(lab.module, (perModule.get(lab.module) ?? 0) + 1);
    }
    const complete = [...perModule.values()].filter((n) => n >= CORE_LABS_PER_MODULE).length;
    const handsOn = badges.find((b) => b.id === 'hands-on');
    expect(handsOn?.arrives === undefined).toBe(complete >= HANDS_ON_MODULES);
  });

  it('ends every rule with a period', () => {
    for (const badge of badges) expect(badge.rule.endsWith('.'), badge.id).toBe(true);
  });
});
