/** The text of pnpm content:report: counts, style lines, coverage, needs-Dani and homed concepts (spec 2.9). */
import { NEEDS_DANI_ATTEMPTS } from './checks.ts';
import type { Context, LessonNote } from './context.ts';
import { conceptsMdDrift, coverage } from './coverage.ts';
import { parseGlossary } from './glossary.ts';
import { notesAnchors } from './markdown.ts';
import { moduleStyle } from './style.ts';

const DRIFT_LINES = 10;
const pct = (n: number, of: number): string => `${of === 0 ? 0 : Math.round((n / of) * 100)}%`;
const pad2 = (n: number): string => String(n).padStart(2, '0');

/** The default report: counts, one style line per module with questions, and the concepts.md drift. */
export function report(ctx: Context): string[] {
  const lessons = ctx.notes.filter((n) => n.kind === 'lesson');
  const modules = new Set(ctx.notes.map((n) => n.module)).size;
  const glossary = ctx.shared.find((f) => f.path === 'resources/glossary.md');
  const terms = glossary === undefined ? 0 : parseGlossary(glossary.text, glossary.path).length;
  const tested = ctx.concepts.filter((c) => c.tested !== false).length;
  const qs = ctx.questions.map((e) => e.q);
  const by = (status: string): number => qs.filter((q) => q.status === status).length;
  const live = qs.filter((q) => q.status === 'live');
  const liveBy = (type: string): number => live.filter((q) => q.type === type).length;
  const out = [
    `modules ${modules}, lessons ${lessons.length}, glossary terms ${terms}, concepts ${ctx.concepts.length} (${tested} tested)`,
    `questions: ${by('draft')} draft, ${by('live')} live, ${by('retired')} retired; live single ${liveBy('single')}, multi ${liveBy('multi')}, match ${liveBy('match')}`,
  ];
  const byModule = new Map<number, typeof qs>();
  for (const e of ctx.questions) {
    const m = Number(e.noteId.slice(1, 3));
    byModule.set(m, [...(byModule.get(m) ?? []), e.q]);
  }
  for (const m of [...byModule.keys()].sort((a, b) => a - b)) {
    const s = moduleStyle(byModule.get(m) ?? []);
    if (s.total === 0) continue;
    out.push(
      `m${pad2(m)}: ${s.total} practice (single ${s.byType.single}, multi ${s.byType.multi}, match ${s.byType.match}); ` +
        `correct option longest in ${s.correctLongest} of ${s.singles} singles (${pct(s.correctLongest, s.singles)}); ` +
        `negative stems ${s.negatives} (${pct(s.negatives, s.total)})`,
    );
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
  }[];
  existing: number;
}

/** `--homed <noteId>`: the tested concepts homed in a lesson, in anchor order, which the question writers read. */
export function homed(ctx: Context, noteId: string): HomedConcepts {
  const note = ctx.notes.find((n): n is LessonNote => n.kind === 'lesson' && n.id === noteId);
  if (note === undefined) throw new Error(`${noteId} is not a lesson note`);
  const anchors = notesAnchors(note.headings);
  const taskText = new Map((ctx.blueprint?.tasks ?? []).map((t) => [t.id, t.text] as const));
  const concepts = ctx.concepts
    .filter((c) => c.home === noteId && c.tested !== false)
    .map((c, i) => ({ c, at: anchors.indexOf(c.anchor), i }))
    .sort((a, b) => a.at - b.at || a.i - b.i)
    .map(({ c }) => ({
      id: c.id,
      name: c.name,
      anchor: c.anchor,
      tasks: c.tasks.map((id) => ({ id, text: taskText.get(id) ?? '' })),
      confusableWith: c.confusableWith ?? [],
    }));
  const existing = ctx.questions.filter((e) => e.noteId === noteId && e.q.status !== 'retired').length;
  return { note: noteId, title: note.fm?.title ?? note.slugFromPath, concepts, existing };
}
