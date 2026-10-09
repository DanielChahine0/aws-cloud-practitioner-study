import { Document, parse as parseYaml, visit } from 'yaml';
import { z } from 'zod';
import { ConceptId, ModuleNumber, NoteId, Slug, TaskId } from '../../../schemas/common.ts';
import { CONCEPTS_FILE, type LessonNote, type Note } from './context.ts';
import { type GlossaryEntry, termForms } from './glossary.ts';
import { notesAnchors, slugify } from './markdown.ts';

/** A registry entry as content/concepts.yaml holds it before the schema's checks: a seeded entry has an empty anchor and no tasks. */
export interface RawConcept {
  id: string;
  name: string;
  home: string;
  anchor: string;
  tasks?: string[];
  tested?: boolean;
  confusableWith?: string[];
  aliases?: string[];
  splitFrom?: string;
}

/** A seeded entry waiting for the registry-writer, with every lesson note that lists its tag. */
export interface PendingEntry {
  id: string;
  name: string;
  home: string;
  listedIn: string[];
}

/** What a registry-writer agent returns in .results/registry/mNN.json; the alias-only review file has no module. */
export const RegistryResult = z.strictObject({
  module: ModuleNumber.optional(),
  concepts: z.array(
    z.strictObject({
      id: ConceptId,
      name: z.string().min(1),
      home: NoteId,
      anchor: Slug,
      tasks: z.array(TaskId).max(3),
      tested: z.literal(false).optional(),
      confusableWith: z.array(ConceptId).max(3).optional(),
    }),
  ),
  aliases: z
    .array(z.strictObject({ alias: ConceptId, of: ConceptId, reason: z.string().min(1) }))
    .default([]),
});
export type RegistryResult = z.infer<typeof RegistryResult>;

export const REGISTRY_HEADER =
  '# The one concept registry (spec 2.4). Edit it by hand or with pnpm content:concepts.';
const KEY_ORDER = [
  'id',
  'name',
  'home',
  'anchor',
  'tasks',
  'tested',
  'confusableWith',
  'aliases',
  'splitFrom',
] as const;

const isLesson = (note: Note): note is LessonNote => note.kind === 'lesson';
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const sentenceCase = (tag: string): string => {
  const words = tag.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** Reads the raw registry, keeping entries that the schema would still reject; no file or a blank file is an empty registry. */
export function readConcepts(text: string | null): RawConcept[] {
  if (text === null || text.trim() === '') return [];
  const data: unknown = parseYaml(text);
  if (data === null) return [];
  if (!Array.isArray(data)) throw new Error(`${CONCEPTS_FILE} must be a YAML list`);
  for (const [i, entry] of data.entries()) {
    if (!isRecord(entry) || typeof entry.id !== 'string') {
      throw new Error(`${CONCEPTS_FILE}: entry ${i + 1} has no id`);
    }
  }
  return data as RawConcept[];
}

/** Writes the registry with a fixed key order, one block per concept and every list in flow style. */
export function stringifyConcepts(entries: readonly RawConcept[]): string {
  const ordered = entries.map((entry) => {
    const out: Record<string, unknown> = {};
    for (const key of KEY_ORDER) {
      if (entry[key] !== undefined) out[key] = entry[key];
    }
    return out;
  });
  const doc = new Document(ordered);
  visit(doc, {
    Seq(_, node, path) {
      if (path.length > 1) node.flow = true;
    },
  });
  return `${REGISTRY_HEADER}\n${doc.toString({ lineWidth: 0 })}`;
}

/** Display names keyed by tag: every form of every glossary term, slugified; the first term to claim a slug wins. */
export function namesFromGlossary(entries: readonly GlossaryEntry[]): Map<string, string> {
  const names = new Map<string, string>();
  for (const entry of entries) {
    for (const form of termForms(entry.term)) {
      const id = slugify(form);
      if (!names.has(id)) names.set(id, form);
    }
  }
  return names;
}

/** Appends one entry per unregistered tag, homed at the first lesson that lists it, with an empty anchor and no tasks (spec 2.4). */
export function seedEntries(
  existing: readonly RawConcept[],
  notes: readonly Note[],
  names: ReadonlyMap<string, string>,
): RawConcept[] {
  const known = new Set(existing.flatMap((entry) => [entry.id, ...(entry.aliases ?? [])]));
  const out = [...existing];
  const lessons = notes.filter(isLesson).sort((a, b) => a.module - b.module || a.number - b.number);
  for (const note of lessons) {
    for (const tag of note.fm?.concepts ?? []) {
      if (known.has(tag)) continue;
      known.add(tag);
      out.push({ id: tag, name: names.get(tag) ?? sentenceCase(tag), home: note.id, anchor: '' });
    }
  }
  return out;
}

const listedIn = (id: string, lessons: readonly LessonNote[]): string[] =>
  lessons.filter((note) => note.fm?.concepts.includes(id)).map((note) => note.id);

/** The seeded entries homed in module NN that still have no anchor. */
export function pendingFor(
  module: number,
  entries: readonly RawConcept[],
  notes: readonly Note[],
): PendingEntry[] {
  const prefix = `m${String(module).padStart(2, '0')}/`;
  const lessons = notes.filter(isLesson);
  return entries
    .filter((entry) => entry.home.startsWith(prefix) && entry.anchor === '')
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      home: entry.home,
      listedIn: listedIn(entry.id, lessons),
    }));
}

/** Problems that would stop a result from applying cleanly; an empty list means the result is ready. */
export function checkResult(
  result: RegistryResult,
  entries: readonly RawConcept[],
  notes: readonly Note[],
): string[] {
  const problems: string[] = [];
  const registered = new Set(entries.map((entry) => entry.id));
  const lessons = notes.filter(isLesson);

  if (result.module !== undefined) {
    const pending = new Set(pendingFor(result.module, entries, notes).map((entry) => entry.id));
    const counts = new Map<string, number>();
    for (const c of result.concepts) counts.set(c.id, (counts.get(c.id) ?? 0) + 1);
    for (const id of pending) {
      if (!counts.has(id)) {
        problems.push(`${id} is pending for module ${result.module} but missing from the result`);
      }
    }
    for (const [id, count] of counts) {
      if (!pending.has(id)) problems.push(`${id} is not pending for module ${result.module}`);
      if (count > 1) problems.push(`${id} appears ${count} times`);
    }
  }

  for (const c of result.concepts) {
    const homes = listedIn(c.id, lessons);
    const home = lessons.find((note) => note.id === c.home);
    if (home === undefined || !homes.includes(c.home)) {
      problems.push(
        `[${c.id}] home ${c.home} is not one of the notes that list it: ${homes.join(', ') || 'none'}`,
      );
    } else if (!notesAnchors(home.headings).includes(c.anchor)) {
      problems.push(`[${c.id}] anchor '${c.anchor}' is not an H3 under ## Notes in ${c.home}`);
    }
    if (c.tested !== false && c.tasks.length === 0) {
      problems.push(`[${c.id}] a tested concept needs 1 to 3 tasks`);
    }
    for (const other of c.confusableWith ?? []) {
      if (other === c.id || !registered.has(other)) {
        problems.push(`[${c.id}] confusableWith '${other}' is not another registered concept`);
      }
    }
  }

  for (const a of result.aliases) {
    for (const id of [a.alias, a.of]) {
      if (!registered.has(id)) {
        problems.push(`alias ${a.alias} of ${a.of}: '${id}' is not a registered concept`);
      }
    }
    if (a.alias === a.of) problems.push(`alias ${a.alias} points at itself`);
  }
  return problems;
}

/**
 * Fills entries from the results, then merges aliases (resolving chains such as a into b into c),
 * then rewrites every confusableWith through the merges. Entries keep their positions.
 */
export function applyResults(
  entries: readonly RawConcept[],
  results: readonly RegistryResult[],
): { entries: RawConcept[]; log: string[] } {
  const byId = new Map(entries.map((entry) => [entry.id, entry] as const));
  for (const result of results) {
    for (const c of result.concepts) {
      const old = byId.get(c.id);
      if (old === undefined) throw new Error(`${c.id} is not in ${CONCEPTS_FILE}`);
      byId.set(c.id, {
        id: c.id,
        name: c.name,
        home: c.home,
        anchor: c.anchor,
        tasks: [...c.tasks],
        ...(c.tested === false ? { tested: false } : {}),
        ...(c.confusableWith !== undefined && c.confusableWith.length > 0
          ? { confusableWith: [...c.confusableWith] }
          : {}),
        ...(old.aliases === undefined ? {} : { aliases: old.aliases }),
        ...(old.splitFrom === undefined ? {} : { splitFrom: old.splitFrom }),
      });
    }
  }

  const mergedInto = new Map<string, string>();
  const resolve = (id: string): string => {
    let current = id;
    for (let next = mergedInto.get(current); next !== undefined; next = mergedInto.get(current)) {
      current = next;
    }
    return current;
  };
  const log: string[] = [];
  for (const result of results) {
    for (const { alias, of, reason } of result.aliases) {
      const gone = resolve(alias);
      const survivor = resolve(of);
      if (gone === survivor) continue;
      const goneEntry = byId.get(gone);
      const survivorEntry = byId.get(survivor);
      if (goneEntry === undefined || survivorEntry === undefined) {
        throw new Error(`cannot make ${alias} an alias of ${of}: unknown concept`);
      }
      byId.delete(gone);
      const aliases = [...new Set([...(survivorEntry.aliases ?? []), gone, ...(goneEntry.aliases ?? [])])];
      byId.set(survivor, { ...survivorEntry, aliases });
      mergedInto.set(gone, survivor);
      log.push(`${gone} is now an alias of ${survivor}: ${reason}`);
    }
  }

  const out: RawConcept[] = [];
  for (const entry of byId.values()) {
    const { confusableWith, ...rest } = entry;
    const targets = [...new Set((confusableWith ?? []).map(resolve))].filter((id) => id !== entry.id);
    out.push(targets.length > 0 ? { ...rest, confusableWith: targets } : rest);
  }
  return { entries: out, log };
}
