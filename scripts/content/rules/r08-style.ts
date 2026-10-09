import type { Finding, Note } from '../lib/context.ts';
import { emDashLines, multiSentenceLines } from '../lib/text.ts';
import { finding, type Rule } from './rule.ts';

const LESSON_KEYS = ['module', 'lesson', 'slug', 'title', 'source', 'concepts'];
const MODULE_KEYS = ['module', 'slug', 'title', 'source', 'lessons', 'assessment_questions'];
const LESSON_REQUIRED = ['Objectives', 'Notes', 'Key takeaways', 'Terms'];
const LESSON_ORDER = ['Objectives', 'Notes', 'Visuals', 'Key takeaways', 'Scenarios', 'Terms'];
const MODULE_ORDER = [
  'What this module covers',
  'Lessons',
  'Key takeaways',
  'What the assessment focuses on',
  'Summary',
  'Further reading',
];
const BINARY = /\.(?:png|jpe?g|gif|ico|webp|woff2?|pdf|zip)$/i;

/** R8 Markdown style: no em dash anywhere, one sentence per line in Markdown, and the note structure of lint_notes.py. */
export const r08: Rule = {
  id: 'R8',
  title: 'Markdown style',
  run(ctx) {
    const out: Finding[] = [];
    for (const file of ctx.files) {
      if (file.startsWith('tests/content/bad/') || BINARY.test(file)) continue;
      const text = ctx.read(file);
      if (text === null) continue;
      for (const line of emDashLines(text))
        out.push(finding('R8', file, 'em dash (U+2014); use a plain hyphen', line));
      if (!file.endsWith('.md')) continue;
      for (const line of multiSentenceLines(text))
        out.push(finding('R8', file, 'more than one sentence on this line', line));
    }
    for (const note of ctx.notes) out.push(...structure(note));
    return out;
  },
};

function structure(note: Note): Finding[] {
  const out: Finding[] = [];
  const keys = note.kind === 'lesson' ? LESSON_KEYS : MODULE_KEYS;
  for (const key of keys) {
    if (!note.keys.includes(key)) out.push(finding('R8', note.path, `frontmatter is missing '${key}'`, 1));
  }
  const order = note.kind === 'lesson' ? LESSON_ORDER : MODULE_ORDER;
  const required = note.kind === 'lesson' ? LESSON_REQUIRED : MODULE_ORDER;
  const sections = note.headings.filter((h) => h.depth === 2);
  const names = sections.map((h) => h.text);
  for (const name of required) {
    if (!names.includes(name)) out.push(finding('R8', note.path, `missing section '## ${name}'`));
  }
  for (const h of sections) {
    if (!order.includes(h.text))
      out.push(finding('R8', note.path, `unexpected section '## ${h.text}'`, h.line));
  }
  const known = names.filter((name) => order.includes(name));
  const sorted = [...known].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  if (known.join('|') !== sorted.join('|')) {
    out.push(finding('R8', note.path, `sections out of order: ${known.join(', ')}`));
  }
  return out;
}
