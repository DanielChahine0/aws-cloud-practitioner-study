/** The text of pnpm content:report: counts, style lines, coverage, needs-Dani, homed concepts and exam targets (spec 2.9). */
import { type DomainIdValue, LAB_ENGINES } from '../../../schemas/ids.ts';
import type { Question } from '../../../schemas/question.ts';
import { domainOf, MAX_PER_CONCEPT } from '../../../src/engine/quotas.ts';
import { NEEDS_DANI_ATTEMPTS } from './checks.ts';
import {
  type Context,
  incidentShips,
  type LessonNote,
  POOL_DIR,
  QUOTAS_FILE,
  questionFileOf,
} from './context.ts';
import { conceptsMdDrift, coverage, examConceptCounts, examCounts, practiceCounts } from './coverage.ts';
import { parseGlossary } from './glossary.ts';
import { notesAnchors } from './markdown.ts';
import { isOpen, moduleStyle, PER_CONCEPT_TARGET } from './style.ts';

const DRIFT_LINES = 10;
const pct = (n: number, of: number): string => `${of === 0 ? 0 : Math.round((n / of) * 100)}%`;
const pad2 = (n: number): string => String(n).padStart(2, '0');

/** One module's style line for one pool, with counts only, so it is safe for exam-pool items too; null when empty. */
function styleLine(module: number, pool: Question['pool'], qs: readonly Question[]): string | null {
  const s = moduleStyle(qs);
  if (s.total === 0) return null;
  const types =
    pool === 'practice'
      ? `${s.total} practice (single ${s.byType.single}, multi ${s.byType.multi}, match ${s.byType.match})`
      : `${s.total} (single ${s.byType.single}, multi ${s.byType.multi})`;
  return (
    `m${pad2(module)}${pool === 'exam' ? ' exam' : ''}: ${types}; ` +
    `correct option longest in ${s.correctLongest} of ${s.singles} singles (${pct(s.correctLongest, s.singles)}); ` +
    `negative stems ${s.negatives} (${pct(s.negatives, s.total)})`
  );
}

/** `Incidents: <s> shipped of <n>; steps <l> live, <d> draft`, where shipped incidents are the ones the build ships. */
function incidentLine(ctx: Context): string {
  const shipped = ctx.incidents.filter(incidentShips).length;
  const steps = ctx.incidents.flatMap((i) => i.steps);
  const of = (status: string): number => steps.filter((s) => s.q.status === status).length;
  return `Incidents: ${shipped} shipped of ${ctx.incidents.length}; steps ${of('live')} live, ${of('draft')} draft`;
}

/**
 * The default report: practice, lab and incident counts, one style line per module for each pool, the live labs of
 * each module, and the concepts.md drift.
 */
export function report(ctx: Context): string[] {
  const lessons = ctx.notes.filter((n) => n.kind === 'lesson');
  const modules = new Set(ctx.notes.map((n) => n.module)).size;
  const glossary = ctx.shared.find((f) => f.path === 'resources/glossary.md');
  const terms = glossary === undefined ? 0 : parseGlossary(glossary.text, glossary.path).length;
  const tested = ctx.concepts.filter((c) => c.tested !== false).length;
  const qs = ctx.questions.filter((e) => e.incident === null && e.q.pool === 'practice').map((e) => e.q);
  const by = (status: string): number => qs.filter((q) => q.status === status).length;
  const live = qs.filter((q) => q.status === 'live');
  const liveBy = (type: string): number => live.filter((q) => q.type === type).length;
  const out = [
    `modules ${modules}, lessons ${lessons.length}, glossary terms ${terms}, concepts ${ctx.concepts.length} (${tested} tested)`,
    `questions: ${by('draft')} draft, ${by('live')} live, ${by('retired')} retired; live single ${liveBy('single')}, multi ${liveBy('multi')}, match ${liveBy('match')}`,
  ];
  const labs = ctx.labs.filter((e) => e.lab.status === 'live').map((e) => e.lab);
  const labsBy = (pick: (lab: (typeof labs)[number]) => string, value: string): number =>
    labs.filter((lab) => pick(lab) === value).length;
  out.push(
    `Labs: ${labs.length} live (${labsBy((l) => l.tier, 'core')} core, ${labsBy((l) => l.tier, 'stretch')} stretch); ${LAB_ENGINES.map((e) => `${e} ${labsBy((l) => l.engine, e)}`).join(', ')}`,
  );
  out.push(incidentLine(ctx));
  const modulesWithQuestions = [...new Set(ctx.questions.map((e) => e.module))].sort((a, b) => a - b);
  for (const m of modulesWithQuestions) {
    const of = (pool: Question['pool']): Question[] =>
      ctx.questions.filter((e) => e.incident === null && e.module === m && e.q.pool === pool).map((e) => e.q);
    for (const line of [styleLine(m, 'practice', of('practice')), styleLine(m, 'exam', of('exam'))]) {
      if (line !== null) out.push(line);
    }
  }
  for (const m of [...new Set(labs.map((lab) => lab.module))].sort((a, b) => a - b)) {
    out.push(`m${pad2(m)} labs: ${labs.filter((lab) => lab.module === m).length}`);
  }
  const drift = conceptsMdDrift(ctx);
  out.push(`concepts.md drift: ${drift.length}`, ...drift.slice(0, DRIFT_LINES).map((line) => `  ${line}`));
  return out;
}

/** `--coverage`: one line per task, then the missing-term count. */
export function coverageReport(ctx: Context): string[] {
  const rows = coverage(ctx);
  const lines = rows.map(
    (r) =>
      `${r.task} ${r.text.replace(/\.$/, '')}: concepts ${r.concepts}, live ${r.live}, exam ${r.exam}, missing: ${r.missing.join(', ') || 'none'}`,
  );
  return [...lines, `missing terms: ${rows.reduce((n, r) => n + r.missing.length, 0)}`];
}

/** `--needs-dani`: the practice drafts with 2 failed revisions, or `none`. */
export function needsDani(ctx: Context): string[] {
  const lines = ctx.questions
    .filter(
      (e) =>
        e.q.status === 'draft' &&
        e.q.pool === 'practice' &&
        (e.q.review?.attempts ?? 0) >= NEEDS_DANI_ATTEMPTS,
    )
    .map((e) => `${e.q.id} ${e.q.note} attempts ${e.q.review?.attempts}: ${e.q.review?.lastFailure}`);
  return lines.length > 0 ? lines : ['none'];
}

export interface HomedConcepts {
  note: string;
  title: string;
  concepts: {
    id: string;
    name: string;
    anchor: string;
    tasks: { id: string; text: string }[];
    confusableWith: string[];
    /** Live practice questions on the concept, aliases included. */
    live: number;
    /** Live questions plus drafts that can still go live (fewer than 3 failed check rounds). */
    open: number;
    /** New drafts to write: PER_CONCEPT_TARGET minus open, never below 0. */
    need: number;
  }[];
  existing: number;
}

/** `--homed <noteId>`: the tested concepts homed in a lesson, in anchor order, which the question writers read. */
export function homed(ctx: Context, noteId: string): HomedConcepts {
  const note = ctx.notes.find((n): n is LessonNote => n.kind === 'lesson' && n.id === noteId);
  if (note === undefined) throw new Error(`${noteId} is not a lesson note`);
  const anchors = notesAnchors(note.headings);
  const taskText = new Map((ctx.blueprint?.tasks ?? []).map((t) => [t.id, t.text] as const));
  const live = practiceCounts(ctx, (q) => q.status === 'live');
  const opened = practiceCounts(ctx, isOpen);
  const concepts = ctx.concepts
    .filter((c) => c.home === noteId && c.tested !== false)
    .map((c, i) => ({ c, at: anchors.indexOf(c.anchor), i }))
    .sort((a, b) => a.at - b.at || a.i - b.i)
    .map(({ c }) => {
      const open = opened.get(c.id) ?? 0;
      return {
        id: c.id,
        name: c.name,
        anchor: c.anchor,
        tasks: c.tasks.map((id) => ({ id, text: taskText.get(id) ?? '' })),
        confusableWith: c.confusableWith ?? [],
        live: live.get(c.id) ?? 0,
        open,
        need: Math.max(0, PER_CONCEPT_TARGET - open),
      };
    });
  const existing = ctx.questions.filter(
    (e) => e.incident === null && e.q.pool === 'practice' && e.noteId === noteId && e.q.status !== 'retired',
  ).length;
  return { note: noteId, title: note.fm?.title ?? note.slugFromPath, concepts, existing };
}

/** One module of `--lab-targets`: its folder, its labs, and each tested concept homed in it with its live practice ids. */
export interface LabTarget {
  module: number;
  dir: string;
  labs: string[];
  concepts: {
    id: string;
    name: string;
    note: string;
    tasks: string[];
    practice: { id: string; type: 'single' | 'multi' | 'match' }[];
  }[];
}

/**
 * `--lab-targets`: for each module, in order, its folder name, the lab ids already written, and each tested concept
 * homed in it with the ids and types of its live practice questions (debrief candidates; never exam items).
 */
export function labTargets(ctx: Context): LabTarget[] {
  const aliasOf = new Map<string, string>();
  for (const c of ctx.concepts) for (const alias of c.aliases ?? []) aliasOf.set(alias, c.id);
  const live = ctx.questions.filter(
    (e) => e.incident === null && e.q.pool === 'practice' && e.q.status === 'live',
  );
  const out: LabTarget[] = [];
  for (const readme of ctx.notes.filter((n) => n.kind === 'module')) {
    const m = readme.module;
    const prefix = `m${pad2(m)}/`;
    out.push({
      module: m,
      dir: readme.path.split('/')[1] ?? '',
      labs: ctx.labs.filter((e) => e.module === m).map((e) => e.lab.id),
      concepts: ctx.concepts
        .filter((c) => c.tested !== false && c.home.startsWith(prefix))
        .map((c) => ({
          id: c.id,
          name: c.name,
          note: c.home,
          tasks: [...c.tasks],
          practice: live
            .filter((e) => (aliasOf.get(e.q.concept) ?? e.q.concept) === c.id)
            .map((e) => ({ id: e.q.id, type: e.q.type })),
        })),
    });
  }
  return out;
}

export interface Target {
  note: string;
  file: string;
  need: number;
}

/** `--targets`: the lesson notes whose homed concepts need new drafts, in course order, with the file to write and how many. */
export function targets(ctx: Context): Target[] {
  const out: Target[] = [];
  for (const note of ctx.notes) {
    if (note.kind !== 'lesson') continue;
    const need = homed(ctx, note.id).concepts.reduce((sum, c) => sum + c.need, 0);
    if (need === 0) continue;
    const file =
      ctx.questions.find((e) => e.incident === null && e.q.pool === 'practice' && e.noteId === note.id)
        ?.path ?? questionFileOf(note.path);
    out.push({ note: note.id, file, need });
  }
  return out;
}

/** One cell or multi-response share of `--exam-targets`; `liveNeed` 0 is the only sign that it is met. */
interface ExamNeed {
  target: number;
  /** Extra items asked of the writers, so one retired or stuck item never blocks the forms. */
  spare: number;
  /** Live items. */
  live: number;
  /** Live items plus drafts below 3 failed check rounds. */
  open: number;
  /** Items to write now: target + spare - open, never below 0. */
  need: number;
  /** Live items still missing: target - live, never below 0; the test R10 and the fan-out loop share. */
  liveNeed: number;
}
export interface ExamTarget {
  module: number;
  file: string;
  cells: (ExamNeed & { task: string })[];
  multi: (ExamNeed & { domain: DomainIdValue })[];
  /** The module's tested concepts that can still take an exam item, with their open exam items. */
  concepts: { id: string; note: string; tasks: string[]; open: number }[];
}

const examNeed = (target: number, spare: number, live: number, open: number): ExamNeed => ({
  target,
  spare,
  live,
  open,
  need: Math.max(0, target + spare - open),
  liveNeed: Math.max(0, target - live),
});

/** A cell's spare: one item per started ten of its target, never below one. */
export const cellSpare = (target: number): number => Math.max(1, Math.ceil(0.1 * target));

/** `--exam-targets`: per module with quota cells, its pool file, cell and multi-response needs, and open concepts. */
export function examTargets(ctx: Context): ExamTarget[] {
  const quotas = ctx.quotas;
  if (quotas === null) throw new Error(`${QUOTAS_FILE} is missing; run pnpm content:quotas`);
  const isLive = (q: Question): boolean => q.status === 'live';
  const live = examCounts(ctx, isLive);
  const open = examCounts(ctx, isOpen);
  const conceptOpen = examConceptCounts(ctx, isOpen);
  const multiOf = (module: number, d: DomainIdValue, keep: (q: Question) => boolean): number =>
    ctx.questions.filter(
      (e) =>
        e.module === module &&
        e.q.pool === 'exam' &&
        e.q.type === 'multi' &&
        domainOf(e.q.task) === d &&
        keep(e.q),
    ).length;
  const modules = [...new Set(quotas.cells.map((c) => c.module))].sort((a, b) => a - b);
  return modules.map((module) => {
    const readme = ctx.notes.find((n) => n.kind === 'module' && n.module === module);
    const dir = readme?.path.split('/')[1] ?? pad2(module);
    const file =
      ctx.questions.find((e) => e.q.pool === 'exam' && e.module === module)?.path ??
      `${POOL_DIR}/${dir}.yaml`;
    const cells = quotas.cells
      .filter((c) => c.module === module)
      .map((c) => {
        const key = `${module}|${c.task}`;
        const spare = cellSpare(c.target);
        return { task: c.task, ...examNeed(c.target, spare, live.get(key) ?? 0, open.get(key) ?? 0) };
      });
    const multi = quotas.multiByModule
      .filter((m) => m.module === module)
      .map((m) => ({
        domain: m.domain,
        ...examNeed(m.target, 1, multiOf(module, m.domain, isLive), multiOf(module, m.domain, isOpen)),
      }));
    const concepts = ctx.concepts
      .filter((c) => c.tested !== false && Number(c.home.slice(1, 3)) === module)
      .map((c) => ({ id: c.id, note: c.home, tasks: [...c.tasks], open: conceptOpen.get(c.id) ?? 0 }))
      .filter((c) => c.open < MAX_PER_CONCEPT);
    return { module, file, cells, multi, concepts };
  });
}

/** One module's entry of `--incident-targets`: the incident ids it owns, the earlier modules and its tested concepts. */
export interface IncidentTarget {
  module: number;
  ids: string[];
  earlier: number[];
  concepts: { id: string; name: string; note: string; tasks: string[] }[];
}

/** The first and last module with incidents, and how many incident ids each module owns (spec 4.5). */
export const INCIDENT_MODULES = { first: 2, last: 13, each: 4 } as const;

/**
 * `--incident-targets`: Modules 2 to 13, each owning four pre-assigned ids (Module m owns `inc-<4(m-2)+1>` to
 * `inc-<4(m-1)>`), the modules before it, and the tested concepts homed in it, so twelve writers never share a file.
 */
export function incidentTargets(ctx: Context): IncidentTarget[] {
  const { first, last, each } = INCIDENT_MODULES;
  const out: IncidentTarget[] = [];
  for (let module = first; module <= last; module++) {
    const ids = Array.from(
      { length: each },
      (_, i) => `inc-${String(each * (module - first) + i + 1).padStart(3, '0')}`,
    );
    const earlier = Array.from({ length: module - 1 }, (_, i) => i + 1);
    const concepts = ctx.concepts
      .filter((c) => c.tested !== false && Number(c.home.slice(1, 3)) === module)
      .map((c) => ({ id: c.id, name: c.name, note: c.home, tasks: [...c.tasks] }));
    out.push({ module, ids, earlier, concepts });
  }
  return out;
}
