import { parse as parseYaml } from 'yaml';
import { Question, QuestionFile } from '../../../schemas/question.ts';
import { CONCEPTS_FILE, type Finding, QUESTIONS_DIR, type QuestionEntry } from '../lib/context.ts';
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

/** The questions of a HEAD question file that still parse; a file or item that does not parse is skipped. */
function headQuestions(yamlText: string | null): Question[] {
  if (yamlText === null) return [];
  let data: unknown;
  try {
    data = parseYaml(yamlText);
  } catch {
    return [];
  }
  const file = QuestionFile.safeParse(data);
  if (!file.success) return [];
  return file.data.questions.flatMap((item) => {
    const parsed = Question.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

/**
 * R2 Ids: ids are unique across concepts, aliases, missions and questions; no concept id in HEAD disappears;
 * a live or retired question in HEAD stays, and a live question whose answer changes takes a key-fix version.
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
    for (const entry of ctx.questions) claim(entry.q.id, 'question', entry.path);

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

    // The first entry of a repeated id stands for it; the repeat is the uniqueness finding above.
    const current = new Map<string, QuestionEntry>();
    for (const entry of ctx.questions) if (!current.has(entry.q.id)) current.set(entry.q.id, entry);
    for (const path of ctx.headPaths(`${QUESTIONS_DIR}/`)) {
      for (const head of headQuestions(ctx.head(path))) {
        if (head.status === 'draft') continue;
        const now = current.get(head.id);
        if (now === undefined) {
          out.push(
            finding(
              'R2',
              path,
              `question '${head.id}' is live or retired in HEAD but is gone; retire it in place with status: retired`,
            ),
          );
          continue;
        }
        if (head.status !== 'live' || correctKey(head) === correctKey(now.q)) continue;
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
    return out;
  },
};
