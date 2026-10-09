import { posix } from 'node:path';
import { CONCEPTS_FILE, type Finding, type LessonNote } from '../lib/context.ts';
import { notesAnchors } from '../lib/markdown.ts';
import { fencedLines } from '../lib/text.ts';
import { finding, type Rule } from './rule.ts';

const LINK = /\]\(([^)#\s]+)(?:#[^)]*)?\)/g;
const EXTERNAL = /^(?:https?:|mailto:)/;

/** R6 References: note identity, relative links, concept tags, homes, anchors, confusables and mission ids all resolve. */
export const r06: Rule = {
  id: 'R6',
  title: 'References',
  run(ctx) {
    const out: Finding[] = [];

    for (const note of ctx.notes) {
      if (note.fm === null) continue;
      if (note.fm.module !== note.module) {
        out.push(
          finding('R6', note.path, `frontmatter module ${note.fm.module} does not match the folder`, 1),
        );
      }
      if (note.fm.slug !== note.slugFromPath) {
        out.push(
          finding('R6', note.path, `frontmatter slug '${note.fm.slug}' does not match the file name`, 1),
        );
      }
      if (note.kind === 'lesson' && note.fm !== null && note.fm.lesson !== note.number) {
        out.push(
          finding('R6', note.path, `frontmatter lesson ${note.fm.lesson} does not match the file number`, 1),
        );
      }
    }

    const files = new Set(ctx.files);
    for (const doc of [...ctx.notes, ...ctx.shared]) {
      const lines = doc.text.split('\n');
      const code = fencedLines(lines);
      for (const [i, line] of lines.entries()) {
        if (code[i]) continue;
        for (const match of line.matchAll(LINK)) {
          const target = match[1] ?? '';
          if (EXTERNAL.test(target)) continue;
          const resolved = posix.normalize(posix.join(posix.dirname(doc.path), target));
          if (!files.has(resolved)) out.push(finding('R6', doc.path, `broken link ${target}`, i + 1));
        }
      }
    }

    const ids = new Set(ctx.concepts.map((c) => c.id));
    const aliases = new Set(ctx.concepts.flatMap((c) => c.aliases ?? []));
    const lessons = new Map<string, LessonNote>();
    for (const note of ctx.notes) if (note.kind === 'lesson') lessons.set(note.id, note);

    for (const note of lessons.values()) {
      for (const tag of note.fm?.concepts ?? []) {
        if (!ids.has(tag) && !aliases.has(tag)) {
          out.push(finding('R6', note.path, `concept tag '${tag}' is not registered in ${CONCEPTS_FILE}`, 1));
        }
      }
    }

    for (const c of ctx.concepts) {
      const home = lessons.get(c.home);
      if (home === undefined) {
        out.push(finding('R6', CONCEPTS_FILE, `[${c.id}] home note ${c.home} does not exist`));
        continue;
      }
      if (!home.fm?.concepts.includes(c.id)) {
        out.push(finding('R6', CONCEPTS_FILE, `[${c.id}] home note ${c.home} does not list it in concepts`));
      }
      if (!notesAnchors(home.headings).includes(c.anchor)) {
        out.push(
          finding(
            'R6',
            CONCEPTS_FILE,
            `[${c.id}] anchor '${c.anchor}' is not an H3 under ## Notes in ${c.home}`,
          ),
        );
      }
      for (const other of c.confusableWith ?? []) {
        if (other === c.id || !ids.has(other)) {
          out.push(
            finding(
              'R6',
              CONCEPTS_FILE,
              `[${c.id}] confusableWith '${other}' is not another registered concept`,
            ),
          );
        }
      }
    }

    for (const mission of ctx.missions) {
      if (mission.fm !== null && mission.fm.id !== mission.id) {
        out.push(finding('R6', mission.path, `id '${mission.fm.id}' does not match the file name`, 1));
      }
    }
    return out;
  },
};
