import { parse as parseYaml } from 'yaml';
import { Forms } from '../../../schemas/exam.ts';
import { Question } from '../../../schemas/question.ts';
import {
  CONCEPTS_FILE,
  type Finding,
  FORMS_FILE,
  INCIDENTS_DIR,
  LABS_DIR,
  POOL_DIR,
  QUESTIONS_DIR,
  type QuestionEntry,
} from '../lib/context.ts';
import { correctKey } from '../lib/hashes.ts';
import { finding, type Rule } from './rule.ts';

/** The entries of a concepts.yaml text, or null when it is missing, does not parse or is not a list (R1 reports those). */
function entriesOf(yamlText: string | null): Record<string, unknown>[] | null {
  if (yamlText === null) return null;
  let data: unknown;
  try {
    data = parseYaml(yamlText);
  } catch {
    return null;
  }
  if (!Array.isArray(data)) return null;
  return data.filter(
    (entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null,
  );
}

const strings = (value: unknown): string[] =>
  typeof value === 'string'
    ? [value]
    : Array.isArray(value)
      ? value.filter((v) => typeof v === 'string')
      : [];

/** Every concept id and alias in a concepts.yaml text, tolerating entries that fail the schema; null when it has no list. */
export function conceptIdsIn(yamlText: string | null): string[] | null {
  return entriesOf(yamlText)?.flatMap((entry) => [...strings(entry.id), ...strings(entry.aliases)]) ?? null;
}

/** Ids that still resolve in a concepts.yaml text: every id and alias, plus every old id a split names in splitFrom (spec 2.4). */
export function survivingIdsIn(yamlText: string | null): Set<string> | null {
  const entries = entriesOf(yamlText);
  if (entries === null) return null;
  return new Set(
    entries.flatMap((entry) => [
      ...strings(entry.id),
      ...strings(entry.aliases),
      ...strings(entry.splitFrom),
    ]),
  );
}

/** The key that holds a question file's items: `steps` in an incident file, `questions` everywhere else. */
const listKeyOf = (path: string): 'steps' | 'questions' =>
  path.startsWith(`${INCIDENTS_DIR}/`) ? 'steps' : 'questions';

/** The items under `listKey` of a question or incident file text, or null when it does not parse or has no such list. */
function itemsIn(yamlText: string | null, listKey: 'steps' | 'questions'): unknown[] | null {
  if (yamlText === null) return null;
  let data: unknown;
  try {
    data = parseYaml(yamlText);
  } catch {
    return null;
  }
  const items =
    typeof data === 'object' && data !== null ? (data as Record<string, unknown>)[listKey] : undefined;
  return Array.isArray(items) ? items : null;
}

/** The questions (or incident steps) of a HEAD file that still parse; a file or item that does not parse is skipped. */
function headQuestions(yamlText: string | null, listKey: 'steps' | 'questions'): Question[] {
  return (itemsIn(yamlText, listKey) ?? []).flatMap((item) => {
    const parsed = Question.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

/**
 * The id of every item in a working-tree question or incident file that has a string id, whether or not it passes the
 * schema; null when the file does not parse as a list of questions or steps (R1 reports both).
 */
function idsIn(yamlText: string | null, listKey: 'steps' | 'questions'): string[] | null {
  return (
    itemsIn(yamlText, listKey)?.flatMap((item: unknown) =>
      typeof item === 'object' && item !== null ? strings((item as { id?: unknown }).id) : [],
    ) ?? null
  );
}

/** A lab file's parsed YAML as a record, or null when it is missing, does not parse or is not a mapping. */
function labRecord(yamlText: string | null): Record<string, unknown> | null {
  if (yamlText === null) return null;
  try {
    const data: unknown = parseYaml(yamlText);
    return typeof data === 'object' && data !== null && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** A lab record without its `rev`, as text, so two versions compare on everything else. */
function withoutRev(lab: Record<string, unknown>): string {
  const { rev: _, ...rest } = lab;
  return JSON.stringify(rest);
}

/**
 * The id of an incident file text and whether it shipped (it has steps and every one is live or retired), tolerating a
 * file that fails the schema; null when it does not parse or names no id.
 */
function incidentIn(yamlText: string | null): { id: string; shipped: boolean } | null {
  if (yamlText === null) return null;
  let data: unknown;
  try {
    data = parseYaml(yamlText);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const { id, steps } = data as { id?: unknown; steps?: unknown };
  if (typeof id !== 'string') return null;
  const statuses = Array.isArray(steps)
    ? steps.map((s: unknown) =>
        typeof s === 'object' && s !== null ? (s as { status?: unknown }).status : null,
      )
    : [];
  const shipped = statuses.length > 0 && statuses.every((s) => s === 'live' || s === 'retired');
  return { id, shipped };
}

/** The forms of a forms.yaml text that pass the schema; [] when it is missing or does not parse. */
function formsIn(yamlText: string | null): Forms['forms'] {
  if (yamlText === null) return [];
  try {
    const parsed = Forms.safeParse(parseYaml(yamlText));
    return parsed.success ? parsed.data.forms : [];
  } catch {
    return [];
  }
}

/**
 * R2 Ids: ids are unique across concepts, aliases, missions, questions of both pools, labs, incidents and incident
 * steps; no concept id in HEAD disappears; a live or retired question, or step of a shipped incident, in HEAD stays,
 * and a live one whose answer changes takes a key-fix version; a lab in HEAD stays, and any edit to it raises its
 * `rev`; an incident that shipped in HEAD stays; a form frozen in HEAD keeps its qids, their order and
 * `frozen: true` (spec 2.9, 4.3, 4.5, 5.1).
 */
export const r02: Rule = {
  id: 'R2',
  title: 'Ids',
  run(ctx) {
    const out: Finding[] = [];
    const owner = new Map<string, string>();
    const claim = (id: string, what: string, file: string): void => {
      const previous = owner.get(id);
      if (previous === undefined) owner.set(id, `${what} in ${file}`);
      else out.push(finding('R2', file, `id '${id}' (${what}) is already used by ${previous}`));
    };
    for (const c of ctx.concepts) claim(c.id, 'concept', CONCEPTS_FILE);
    for (const c of ctx.concepts)
      for (const alias of c.aliases ?? []) claim(alias, `alias of ${c.id}`, CONCEPTS_FILE);
    for (const m of ctx.missions) claim(m.id, 'mission', m.path);
    for (const i of ctx.incidents) claim(i.incident.id, 'incident', i.path);
    for (const entry of ctx.questions) {
      claim(entry.q.id, entry.incident === null ? 'question' : `step of ${entry.incident}`, entry.path);
    }
    for (const entry of ctx.labs) claim(entry.lab.id, 'lab', entry.path);

    // A working tree that does not parse is R1's finding; comparing it with HEAD would only bury that one error.
    const before = conceptIdsIn(ctx.head(CONCEPTS_FILE));
    const now = survivingIdsIn(ctx.read(CONCEPTS_FILE));
    if (before !== null && now !== null) {
      for (const id of before) {
        if (!now.has(id)) {
          out.push(
            finding(
              'R2',
              CONCEPTS_FILE,
              `concept id '${id}' exists in HEAD but is gone; keep it as an alias of the concept that replaced it, or name it in splitFrom on each concept split from it`,
            ),
          );
        }
      }
    }

    // An incident shipped once every step in HEAD was live or retired; then it leaves only with status: retired.
    const incidentsNow = new Set<string>();
    const incidentsUnreadable = new Set<string>();
    for (const path of ctx.files) {
      if (!path.startsWith(`${INCIDENTS_DIR}/`) || !path.endsWith('.yaml')) continue;
      const now = incidentIn(ctx.read(path));
      if (now === null) incidentsUnreadable.add(path);
      else incidentsNow.add(now.id);
    }
    for (const path of ctx.headPaths(`${INCIDENTS_DIR}/`)) {
      const head = incidentIn(ctx.head(path));
      if (head === null || !head.shipped || incidentsUnreadable.has(path) || incidentsNow.has(head.id))
        continue;
      out.push(
        finding(
          'R2',
          path,
          `incident ${head.id} was in HEAD and is gone; retire it with status: retired instead`,
        ),
      );
    }

    // The first entry of a repeated id stands for it; the repeat is the uniqueness finding above.
    const current = new Map<string, QuestionEntry>();
    for (const entry of ctx.questions) if (!current.has(entry.q.id)) current.set(entry.q.id, entry);
    // An item that fails the schema, or a file that does not parse, is R1's finding, not a question that is gone.
    const present = new Set<string>();
    const unreadable = new Set<string>();
    // Incident steps are questions too: once their incident shipped, each step stays and a key change takes a key-fix.
    const questionDirs = [`${QUESTIONS_DIR}/`, `${POOL_DIR}/`, `${INCIDENTS_DIR}/`];
    for (const path of ctx.files) {
      if (!questionDirs.some((dir) => path.startsWith(dir)) || !path.endsWith('.yaml')) continue;
      const ids = idsIn(ctx.read(path), listKeyOf(path));
      if (ids === null) unreadable.add(path);
      for (const id of ids ?? []) present.add(id);
    }
    for (const path of questionDirs.flatMap((dir) => ctx.headPaths(dir))) {
      if (unreadable.has(path)) continue;
      const listKey = listKeyOf(path);
      if (listKey === 'steps') {
        // Steps of an incident that never shipped may still change; a shipped incident that is gone is reported above.
        const incident = incidentIn(ctx.head(path));
        if (incident === null || !incident.shipped || !incidentsNow.has(incident.id)) continue;
      }
      for (const head of headQuestions(ctx.head(path), listKey)) {
        if (head.status === 'draft') continue;
        const now = current.get(head.id);
        if (!present.has(head.id)) {
          out.push(
            finding(
              'R2',
              path,
              `question '${head.id}' is live or retired in HEAD but is gone; retire it in place with status: retired`,
            ),
          );
          continue;
        }
        if (now === undefined || head.status !== 'live' || correctKey(head) === correctKey(now.q)) continue;
        const version = head.version + 1;
        const fixed =
          now.q.version === version &&
          now.q.history.some((h) => h.version === now.q.version && h.change === 'key-fix');
        if (!fixed) {
          out.push(
            finding(
              'R2',
              now.path,
              `the correct answer of '${head.id}' changed, so it needs version ${version} and a key-fix history entry`,
              now.line,
            ),
          );
        }
      }
    }

    // Labs have no drafts: every lab in HEAD has shipped, so it stays (retired in place) and each edit raises its rev.
    // A lab file that does not parse is R1's finding, not a lab that is gone.
    const labIds = new Set<string>();
    const unreadableLabs = new Set<string>();
    for (const path of ctx.files) {
      if (!path.startsWith(`${LABS_DIR}/`) || !path.endsWith('.yaml')) continue;
      const lab = labRecord(ctx.read(path));
      if (lab === null) unreadableLabs.add(path);
      else for (const id of strings(lab.id)) labIds.add(id);
    }
    for (const path of ctx.headPaths(`${LABS_DIR}/`)) {
      const before = labRecord(ctx.head(path));
      const id = before === null ? undefined : strings(before.id)[0];
      if (before === null || id === undefined || unreadableLabs.has(path)) continue;
      if (!labIds.has(id)) {
        out.push(finding('R2', path, `lab ${id} was in HEAD and is gone; retire it instead`));
        continue;
      }
      const after = labRecord(ctx.read(path));
      const was = typeof before.rev === 'number' ? before.rev : 0;
      const now = typeof after?.rev === 'number' ? after.rev : 0;
      if (after !== null && withoutRev(after) !== withoutRev(before) && now <= was) {
        out.push(finding('R2', path, `lab ${id} changed since HEAD, so it needs rev ${was + 1}`));
      }
    }

    // A forms.yaml that does not parse is R1's finding; a missing one breaks every form frozen in HEAD.
    if (ctx.forms !== null || ctx.read(FORMS_FILE) === null) {
      const now = new Map((ctx.forms?.forms ?? []).map((f) => [f.id, f] as const));
      for (const before of formsIn(ctx.head(FORMS_FILE))) {
        if (!before.frozen) continue;
        const after = now.get(before.id);
        const same =
          after?.frozen === true &&
          after.qids.length === before.qids.length &&
          after.qids.every((qid, i) => qid === before.qids[i]);
        if (!same)
          out.push(finding('R2', FORMS_FILE, `form ${before.id} is frozen in HEAD and may not change`));
      }
    }
    return out;
  },
};
