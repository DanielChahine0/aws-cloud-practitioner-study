import { parse as parseYaml } from 'yaml';
import { CONCEPTS_FILE, type Finding } from '../lib/context.ts';
import { finding, type Rule } from './rule.ts';

/** Every concept id and alias in a concepts.yaml text, tolerating entries that fail the schema. */
export function conceptIdsIn(yamlText: string | null): string[] {
  if (yamlText === null) return [];
  let data: unknown;
  try {
    data = parseYaml(yamlText);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data.flatMap((entry: unknown) => {
    if (typeof entry !== 'object' || entry === null) return [];
    const { id, aliases } = entry as { id?: unknown; aliases?: unknown };
    const own = typeof id === 'string' ? [id] : [];
    const more = Array.isArray(aliases) ? aliases.filter((a): a is string => typeof a === 'string') : [];
    return [...own, ...more];
  });
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

    const before = ctx.head(CONCEPTS_FILE);
    if (before !== null) {
      const now = new Set(conceptIdsIn(ctx.read(CONCEPTS_FILE)));
      for (const id of conceptIdsIn(before)) {
        if (!now.has(id)) {
          out.push(
            finding(
              'R2',
              CONCEPTS_FILE,
              `concept id '${id}' exists in HEAD but is gone; keep it as an alias of the concept that replaced it`,
            ),
          );
        }
      }
    }
    return out;
  },
};
