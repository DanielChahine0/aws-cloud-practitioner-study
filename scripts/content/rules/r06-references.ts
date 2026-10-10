import { posix } from 'node:path';
import { CONCEPTS_FILE, type Finding, type LessonNote, questionFileOf } from '../lib/context.ts';
import { notesAnchors } from '../lib/markdown.ts';
import { fencedLines } from '../lib/text.ts';
import { finding, type Rule } from './rule.ts';

const LINK = /\]\(([^)#\s]+)(?:#[^)]*)?\)/g;
const EXTERNAL = /^(?:https?:|mailto:)/;

/** R6 References: note identity, relative links, concept tags, homes, anchors, confusables, mission ids and question references all resolve. */
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
    for (const note of ctx.notes) {
      if (note.kind !== 'lesson') continue;
      const first = lessons.get(note.id);
      if (first === undefined) lessons.set(note.id, note);
      else out.push(finding('R6', note.path, `note id '${note.id}' is already used by ${first.path}`));
    }

    for (const note of ctx.notes) {
      if (note.kind !== 'lesson') continue;
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

    for (const entry of ctx.questions) {
      const { q } = entry;
      if (q.status === 'retired') continue;
      const report = (message: string): void => {
        out.push(finding('R6', entry.path, `${q.id}: ${message}`, entry.line));
      };
      const concept = ctx.concepts.find((c) => c.id === q.concept || (c.aliases ?? []).includes(q.concept));
      if (concept === undefined) {
        report(`concept '${q.concept}' is not registered`);
        continue;
      }
      if (concept.tested === false) report(`concept '${q.concept}' is marked tested: false`);
      const lesson = lessons.get(q.note);
      const home = lesson === undefined ? undefined : questionFileOf(lesson.path);
      if (lesson === undefined) {
        report(`note ${q.note} does not exist`);
      } else if (q.pool === 'practice' && entry.path !== home) {
        report(`note ${q.note} keeps its questions in ${home}, not in this file`);
      } else {
        const names = [concept.id, ...(concept.aliases ?? [])];
        if (!(lesson.fm?.concepts ?? []).some((tag) => names.includes(tag))) {
          report(`note ${q.note} does not list concept ${q.concept}`);
        }
      }
      if (!concept.tasks.includes(q.task)) {
        report(`task ${q.task} is not one of ${concept.id}'s tasks (${concept.tasks.join(', ')})`);
      }
    }

    // Labs: concepts and notes resolve, and the debrief asks live practice questions on the lab's own concepts,
    // named by id only so no exam item text can reach a finding (spec 5.1).
    const resolve = (id: string): string =>
      ctx.concepts.find((c) => c.id === id || (c.aliases ?? []).includes(id))?.id ?? id;
    for (const { path, lab } of ctx.labs) {
      if (lab.status === 'retired') continue;
      const report = (message: string): void => {
        out.push(finding('R6', path, `${lab.id}: ${message}`));
      };
      for (const id of lab.concepts) {
        const concept = ctx.concepts.find((c) => c.id === id || (c.aliases ?? []).includes(id));
        if (concept === undefined) report(`concept '${id}' is not registered`);
        else if (concept.tested === false) report(`concept '${id}' is marked tested: false`);
      }
      for (const id of lab.notes) if (!lessons.has(id)) report(`note ${id} is not a note`);
      const concepts = new Set(lab.concepts.map(resolve));
      for (const qid of lab.debrief.questions) {
        const entry = ctx.questions.find(
          (e) => e.q.id === qid && e.q.pool === 'practice' && e.q.status === 'live',
        );
        if (entry === undefined) report(`debrief question ${qid} is not a live practice question`);
        else if (!concepts.has(resolve(entry.q.concept))) {
          report(`debrief question ${qid} is on ${entry.q.concept}, which the lab does not list`);
        }
      }
    }
    return out;
  },
};
