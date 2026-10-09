import { parse as parseYaml } from 'yaml';
import { CONCEPTS_FILE, type Finding } from '../lib/context.ts';
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

/** R2 Ids: ids are unique across concepts, aliases and missions, and no concept id in HEAD disappears. */
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
    return out;
  },
};
