/**
 * Checking and applying update-writer results (spec 2.3): each missing blueprint term becomes an "Exam guide update"
 * line registered as a concept, or a coveredBy mapping in the blueprint.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMap, isScalar, isSeq, parseDocument } from 'yaml';
import { z } from 'zod';
import { ConceptId, HttpsUrl, IsoDate, NoteId, Slug, TaskId } from '../../../schemas/common.ts';
import { sourceProblem } from '../rules/r13-sources.ts';
import { BLUEPRINT_FILE, CONCEPTS_FILE, type Context, type LessonNote, loadContext } from './context.ts';
import { missingTerms, phraseIn } from './coverage.ts';
import { headingsOf, notesAnchors, splitFrontmatter } from './markdown.ts';
import { type RawConcept, readConcepts, stringifyConcepts } from './registry.ts';
import { emDashLines, multiSentenceLines } from './text.ts';
import { parseUpdateLine } from './update-line.ts';

export const UpdateResult = z.strictObject({
  task: TaskId,
  updates: z
    .array(
      z.strictObject({
        terms: z.array(z.string().min(2)).min(1),
        note: NoteId,
        anchor: Slug,
        sentence: z.string().min(20).max(300),
        title: z.string().min(1),
        url: HttpsUrl,
        verified_on: IsoDate,
        concept: z.strictObject({
          id: ConceptId,
          name: z.string().min(1),
          tasks: z.array(TaskId).min(1).max(3),
          confusableWith: z.array(ConceptId).max(3).optional(),
        }),
      }),
    )
    .default([]),
  coveredBy: z
    .array(z.strictObject({ term: z.string().min(2), concept: ConceptId, reason: z.string().min(1) }))
    .default([]),
});
export type UpdateResult = z.infer<typeof UpdateResult>;
export type Update = UpdateResult['updates'][number];

/** The note line for one update, in the format R13 and parseUpdateLine read. */
export function updateLineText(u: Update): string {
  return `- **Exam guide update** (verified_on ${u.verified_on}, [${u.title}](${u.url})): ${u.sentence}`;
}

/** Every problem that stops a result from applying cleanly against the context; an empty list means it is ready. */
export function checkUpdates(result: UpdateResult, ctx: Context): string[] {
  const problems: string[] = [];
  const { task } = result;
  const missing = missingTerms(ctx)
    .filter((t) => t.task === task)
    .map((t) => t.term);
  const listed = [...result.updates.flatMap((u) => u.terms), ...result.coveredBy.map((c) => c.term)];
  const count = (term: string): number => listed.filter((t) => t === term).length;
  for (const term of missing) {
    if (count(term) === 0) problems.push(`term "${term}" of task ${task} is in no update and no coveredBy`);
  }
  for (const term of new Set(listed)) {
    if (count(term) > 1) problems.push(`term "${term}" is listed ${count(term)} times`);
    if (!missing.includes(term)) problems.push(`term "${term}" is not a missing term of task ${task}`);
  }

  const byId = new Map(ctx.concepts.map((c) => [c.id, c] as const));
  const aliases = new Set(ctx.concepts.flatMap((c) => c.aliases ?? []));
  const testedId = (id: string): boolean => byId.get(id)?.tested !== false && byId.has(id);
  const lessons = new Map(
    ctx.notes.filter((n): n is LessonNote => n.kind === 'lesson').map((n) => [n.id, n] as const),
  );
  const claimed = new Set<string>();

  for (const u of result.updates) {
    const report = (message: string): void => {
      problems.push(`${u.terms.join(', ')}: ${message}`);
    };
    for (const term of u.terms) {
      if (!phraseIn(u.sentence, term)) report(`the sentence does not contain the term "${term}"`);
    }
    const note = lessons.get(u.note);
    if (note === undefined) report(`note ${u.note} is not a lesson note`);
    else if (!notesAnchors(note.headings).includes(u.anchor)) {
      report(`anchor '${u.anchor}' is not an H3 under ## Notes in ${u.note}`);
    }
    const source = sourceProblem(u.url, u.verified_on, ctx.today);
    if (source !== null) report(source);
    if (emDashLines(u.sentence).length > 0) report('the sentence uses an em dash');
    if (multiSentenceLines(u.sentence).length > 0) report('the sentence must be exactly one sentence');
    if (parseUpdateLine(updateLineText(u)) === null) report('the line does not parse as an update line');

    const c = u.concept;
    const existing = byId.get(c.id);
    if (existing !== undefined || aliases.has(c.id)) {
      const fits =
        existing !== undefined &&
        existing.tested !== false &&
        existing.home === u.note &&
        existing.tasks.includes(task);
      if (!fits) {
        report(
          `concept ${c.id} is registered, so it must be a tested concept homed in ${u.note} whose tasks include ${task}`,
        );
      }
    } else if (c.tasks[0] !== task) {
      report(`new concept ${c.id} must list task ${task} first`);
    }
    for (const other of c.confusableWith ?? []) {
      if (other === c.id || !testedId(other))
        report(`confusableWith '${other}' is not another registered, tested concept`);
    }
    if (claimed.has(c.id)) report(`concept ${c.id} is used by two updates`);
    claimed.add(c.id);
  }
  for (const cov of result.coveredBy) {
    if (!testedId(cov.concept)) {
      problems.push(`${cov.term}: coveredBy '${cov.concept}' is not a registered, tested concept`);
    }
  }
  return problems;
}

/** Inserts a line after the last non-blank line of the H3 section with that anchor, before the next heading. */
export function insertUpdateLine(noteText: string, anchor: string, line: string): string {
  const { body, bodyLine } = splitFrontmatter(noteText);
  const headings = headingsOf(body, bodyLine);
  const at = headings.findIndex((h) => h.depth === 3 && h.slug === anchor);
  const heading = headings[at];
  if (heading === undefined) throw new Error(`no H3 '${anchor}' in the note`);
  const lines = noteText.split('\n');
  let end = (headings[at + 1]?.line ?? lines.length + 1) - 1;
  while (end > heading.line && (lines[end - 1] ?? '').trim() === '') end -= 1;
  // After a table, a paragraph or the heading itself, a blank line keeps the bullet its own list in plain CommonMark.
  const afterList = /^\s*(?:[-*+]|\d+[.)])\s/.test(lines[end - 1] ?? '');
  lines.splice(end, 0, ...(afterList ? [line] : ['', line]));
  return lines.join('\n');
}

/** Appends a tag to the frontmatter `concepts:` list, after its last item, unless the list already holds it. */
export function addConceptTag(noteText: string, id: string): string {
  const lines = noteText.split('\n');
  const close = lines.indexOf('---', 1);
  const start = lines.findIndex((l, i) => i < close && /^concepts:\s*$/.test(l));
  if (start < 0) throw new Error('the note frontmatter has no concepts: list');
  let last = start;
  while (last + 1 < close && /^\s+- /.test(lines[last + 1] ?? '')) last += 1;
  const items = lines.slice(start + 1, last + 1).map((l) => l.replace(/^\s+- /, '').trim());
  if (items.includes(id)) return noteText;
  const indent = /^(\s+)- /.exec(lines[last] ?? '')?.[1] ?? '  ';
  lines.splice(last + 1, 0, `${indent}- ${id}`);
  return lines.join('\n');
}

/** Replaces one blueprint term string with `{ term, coveredBy }` through the YAML Document API, keeping comments. */
export function setCoveredBy(blueprintText: string, task: string, term: string, concept: string): string {
  const doc = parseDocument(blueprintText);
  const tasks = doc.get('tasks');
  const item = isSeq(tasks) ? tasks.items.find((t) => isMap(t) && t.get('id') === task) : undefined;
  const terms = isMap(item) ? item.get('terms', true) : undefined;
  const index = isSeq(terms) ? terms.items.findIndex((t) => isScalar(t) && t.value === term) : -1;
  if (!isSeq(terms) || index < 0) throw new Error(`task ${task} has no term "${term}"`);
  const node = doc.createNode({ term, coveredBy: concept });
  node.flow = true;
  terms.items[index] = node;
  return doc.toString({ lineWidth: 0 });
}

/**
 * Checks every result against the same starting context, then edits the notes, appends the new registry entries and
 * maps the coveredBy terms in the blueprint. Throws, changing nothing, on any problem. Returns one log line per change.
 */
export function applyUpdates(root: string, results: readonly UpdateResult[]): string[] {
  const ctx = loadContext(root);
  const problems = results.flatMap((r) => checkUpdates(r, ctx).map((p) => `task ${r.task}: ${p}`));
  const owner = new Map<string, string>();
  for (const r of results) {
    for (const u of r.updates) {
      const first = owner.get(u.concept.id);
      if (first !== undefined)
        problems.push(`concept ${u.concept.id} is claimed by tasks ${first} and ${r.task}`);
      else owner.set(u.concept.id, r.task);
    }
  }
  if (problems.length > 0) throw new Error(problems.join('\n'));

  const texts = new Map<string, string>();
  const read = (path: string): string => texts.get(path) ?? readFileSync(join(root, path), 'utf8');
  const notePath = new Map(ctx.notes.map((n) => [n.id, n.path] as const));
  const registered = new Set(ctx.concepts.map((c) => c.id));
  const entries: RawConcept[] = readConcepts(read(CONCEPTS_FILE));
  const log: string[] = [];
  let added = 0;
  for (const r of results) {
    for (const u of r.updates) {
      const path = notePath.get(u.note) ?? '';
      let text = insertUpdateLine(read(path), u.anchor, updateLineText(u));
      text = addConceptTag(text, u.concept.id);
      texts.set(path, text);
      log.push(`${u.note}#${u.anchor}: update line for ${u.terms.join(', ')}`);
      if (registered.has(u.concept.id)) continue;
      const { confusableWith } = u.concept;
      entries.push({
        id: u.concept.id,
        name: u.concept.name,
        home: u.note,
        anchor: u.anchor,
        tasks: [...u.concept.tasks],
        ...(confusableWith !== undefined && confusableWith.length > 0
          ? { confusableWith: [...confusableWith] }
          : {}),
      });
      added += 1;
      log.push(`${CONCEPTS_FILE}: added ${u.concept.id} homed at ${u.note}#${u.anchor}`);
    }
  }
  if (added > 0) texts.set(CONCEPTS_FILE, stringifyConcepts(entries));
  for (const r of results) {
    for (const c of r.coveredBy) {
      texts.set(BLUEPRINT_FILE, setCoveredBy(read(BLUEPRINT_FILE), r.task, c.term, c.concept));
      log.push(`${BLUEPRINT_FILE}: task ${r.task} "${c.term}" covered by ${c.concept}`);
    }
  }
  for (const [path, text] of texts) writeFileSync(join(root, path), text);
  return log;
}
