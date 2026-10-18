/**
 * Pure rows for the module page's Capstone and Missions sections (spec 7.3), in their own file so the lazy
 * `ModuleSections` screen carries them and the initial bundle does not.
 */
import type { MissionMeta } from '../../schemas/chunks.ts';
import type { DecisionStage } from '../engine/capstone.ts';
import type { MissionStatus } from '../engine/missions.ts';
import { toHash } from './router.ts';

/** The module page's word for each capstone decision stage (spec 7.3); the Project screen gives the full line. */
export const DECISION_STAGE_WORDS: Readonly<Record<DecisionStage, string>> = {
  locked: 'Locked',
  waiting: 'After your exam',
  open: 'Open',
  self: 'Self-graded',
  done: 'Graded',
};

export interface CapstoneRow {
  label: string;
  meta: string;
  href: string;
}

/** The module's capstone decision as one row that opens its editor. */
export function capstoneRow(module: number, stage: DecisionStage, title: string): CapstoneRow {
  return {
    label: `Decision ${module}: ${title}`,
    meta: DECISION_STAGE_WORDS[stage],
    href: toHash({ kind: 'decision', module }),
  };
}

export interface MissionRow {
  id: string;
  n: number;
  title: string;
  href: string;
  status: MissionStatus;
}

export const NO_MISSIONS = 'No missions for this module.';

/** The missions whose `modules` list this module, in index order, each with its status (spec 5.3 and 7.3). */
export function missionRows(
  module: number,
  statuses: readonly MissionStatus[],
  idx: { missions: readonly Pick<MissionMeta, 'id' | 'title' | 'modules'>[] },
): MissionRow[] {
  return idx.missions.flatMap((m) => {
    const status = statuses.find((s) => s.id === m.id);
    if (status === undefined || !m.modules.includes(module)) return [];
    return [{ id: m.id, n: status.n, title: m.title, href: toHash({ kind: 'mission', id: m.id }), status }];
  });
}
