import { createHash } from 'node:crypto';
import type {
  ConceptMeta,
  ContentIndex,
  GlossaryItem,
  LessonChunk,
  LessonMeta,
  MissionMeta,
  ModuleChunk,
  ModuleMeta,
  QuestionView,
  SearchChunk,
  SearchEntry,
} from '../../schemas/chunks.ts';
import { normalize } from '../../src/app/search.ts';
import {
  CONCEPTS_FILE,
  type Context,
  type LessonNote,
  type ModuleNote,
  type Note,
  type QuestionEntry,
} from './lib/context.ts';
import { evidenceForm, noteLines, sectionAt } from './lib/evidence.ts';
import { parseGlossary, termMatcher } from './lib/glossary.ts';
import { renderDoc, renderInline, routeOf } from './lib/render.ts';

const GLOSSARY_FILE = 'resources/glossary.md';

/** The content build's output: every chunk by its path from the site root, and the name of the index. */
export interface BuiltContent {
  contentVersion: string;
  indexFile: string;
  files: Map<string, string>;
}

const SELECT_SUFFIX = { 2: ' (Select TWO.)', 3: ' (Select THREE.)' } as const;

/** The runner's view of a live question; "Read in notes" points at the section of its first evidence line. */
function questionView({ q }: QuestionEntry, note: Note): QuestionView {
  const evidence = evidenceForm(q.evidence[0] ?? '');
  const line = noteLines(note).get(evidence);
  const section = line === undefined ? null : sectionAt(note, line);
  if (section === null) {
    throw new Error(`${q.id} cites a line ${note.id} does not have; run pnpm content:validate`);
  }
  const common = {
    id: q.id,
    version: q.version,
    concept: q.concept,
    note: q.note,
    task: q.task,
    level: q.level,
    takeaway: q.takeaway,
    read: { route: `${routeOf(note)}/${section.slug}`, text: evidence },
  };
  if (q.type === 'match') {
    const pairs = q.pairs.map(({ left, right, why }) => ({ left, right, why }));
    return { ...common, type: 'match', stem: q.stem, select: null, options: [], pairs };
  }
  const options = q.options.map(({ id, text, correct, why }) => ({ id, text, correct, why }));
  if (q.type === 'multi') {
    return {
      ...common,
      type: 'multi',
      stem: q.stem + SELECT_SUFFIX[q.select],
      select: q.select,
      options,
      pairs: [],
    };
  }
  return { ...common, type: 'single', stem: q.stem, select: null, options, pairs: [] };
}

const sha256 = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');
const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Renders the notes, glossary and missions of a loaded context into hashed JSON chunks (spec 2.10). */
export function buildContent(ctx: Context): BuiltContent {
  const files = new Map<string, string>();
  const emit = (stem: string, data: unknown): string => {
    const json = JSON.stringify(data);
    const name = `content/${stem}.${sha256(json).slice(0, 8)}.json`;
    files.set(name, json);
    return name;
  };

  const glossaryEntries = parseGlossary(ctx.read(GLOSSARY_FILE) ?? '');
  const seen = new Set<string>();
  for (const entry of glossaryEntries) {
    if (seen.has(entry.id)) throw new Error(`${GLOSSARY_FILE}: two terms share the id ${entry.id}`);
    seen.add(entry.id);
  }
  const terms = termMatcher(glossaryEntries);
  const routes = new Map(ctx.notes.map((note) => [note.path, routeOf(note)] as const));
  const notesById = new Map(ctx.notes.map((note) => [note.id, note] as const));
  const search: SearchEntry[] = [];
  const noteOrder = new Map(ctx.notes.map((note, i) => [note.id, i] as const));
  const live = ctx.questions
    .filter(({ q }) => q.status === 'live' && q.pool === 'practice')
    .sort(
      (a, b) =>
        (noteOrder.get(a.noteId) ?? 0) - (noteOrder.get(b.noteId) ?? 0) ||
        (a.q.id < b.q.id ? -1 : a.q.id > b.q.id ? 1 : 0),
    );
  const questionVersions: Record<string, number> = {};

  const modules: ModuleMeta[] = [];
  for (const n of [...new Set(ctx.notes.map((note) => note.module))].sort((a, b) => a - b)) {
    const readme = ctx.notes.find((note): note is ModuleNote => note.kind === 'module' && note.module === n);
    if (readme === undefined || readme.fm === null) {
      throw new Error(`module ${n} has no README with valid frontmatter; run pnpm content:validate`);
    }
    const short = readme.fm.title.replace(/^Module \d+: /, '');
    const lessonNotes = ctx.notes.filter(
      (note): note is LessonNote => note.kind === 'lesson' && note.module === n,
    );
    search.push({
      kind: 'module',
      title: readme.fm.title,
      detail: `${lessonNotes.length} lessons`,
      route: routeOf(readme),
      text: normalize(readme.fm.title),
    });
    const lessons: LessonMeta[] = [];
    const chunkLessons: Record<string, LessonChunk> = {};
    for (const note of lessonNotes) {
      if (note.fm === null) throw new Error(`${note.path}: invalid frontmatter; run pnpm content:validate`);
      const { sections, headings } = renderDoc(note.body, { path: note.path, routes, terms });
      chunkLessons[note.slugFromPath] = {
        slug: note.slugFromPath,
        html: sections.map((s) => s.html).join(''),
        headings,
      };
      lessons.push({
        n: note.number,
        slug: note.slugFromPath,
        title: note.fm.title,
        concepts: [...note.fm.concepts],
      });
      search.push({
        kind: 'lesson',
        title: note.fm.title,
        detail: `Module ${n}: ${short}`,
        route: routeOf(note),
        text: normalize(
          [note.fm.title, ...headings.filter((h) => h.depth === 3).map((h) => h.text)].join(' '),
        ),
      });
    }
    const readmeSections = renderDoc(readme.body, { path: readme.path, routes, terms: null }).sections;
    const questions = live
      .filter((entry) => notesById.get(entry.noteId)?.module === n)
      .map((entry) => {
        const note = notesById.get(entry.noteId);
        if (note === undefined) throw new Error(`${entry.path}: ${entry.noteId} is not a note`);
        questionVersions[entry.q.id] = entry.q.version;
        return questionView(entry, note);
      });
    const chunk: ModuleChunk = { module: n, readme: readmeSections, lessons: chunkLessons, questions };
    modules.push({
      n,
      slug: readme.fm.slug,
      title: readme.fm.title,
      short,
      lessons,
      chunk: emit(`m${pad2(n)}`, chunk),
    });
  }

  const concepts: ConceptMeta[] = ctx.concepts.map((c) => {
    const home = notesById.get(c.home);
    if (home === undefined) throw new Error(`${CONCEPTS_FILE}: [${c.id}] home ${c.home} is not a note`);
    search.push({
      kind: 'concept',
      title: c.name,
      detail: home.kind === 'lesson' && home.fm !== null ? home.fm.title : home.id,
      route: `${routeOf(home)}/${c.anchor}`,
      text: normalize([c.name, ...(c.aliases ?? [])].join(' ')),
    });
    return { id: c.id, name: c.name, home: c.home, anchor: c.anchor, tested: c.tested !== false };
  });

  const glossary: GlossaryItem[] = glossaryEntries.map((entry) => {
    const refs = entry.refs.map((ref) => {
      const route = routes.get(ref.path);
      if (route === undefined) {
        throw new Error(`${GLOSSARY_FILE}: ${entry.term} links to ${ref.path}, which is not a note`);
      }
      return { label: ref.label, route };
    });
    const first = refs[0];
    if (first === undefined) throw new Error(`${GLOSSARY_FILE}: ${entry.term} links to no lesson`);
    search.push({
      kind: 'term',
      title: entry.term,
      detail: first.label,
      route: first.route,
      text: normalize(`${entry.term} ${entry.definition}`),
    });
    return { id: entry.id, term: entry.term, html: renderInline(entry.definition, GLOSSARY_FILE), refs };
  });

  const missions: MissionMeta[] = [...ctx.missions]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((mission) => {
      const fm = mission.fm;
      if (fm === null) throw new Error(`${mission.path}: invalid frontmatter; run pnpm content:validate`);
      const { sections } = renderDoc(mission.body, { path: mission.path, routes, terms: null });
      search.push({
        kind: 'mission',
        title: fm.title,
        detail: `Mission ${Number(mission.id.slice('mission-'.length))}`,
        route: `#/missions/${mission.id}`,
        text: normalize([fm.title, ...fm.services].join(' ')),
      });
      return {
        id: mission.id,
        title: fm.title,
        modules: [...fm.modules],
        services: [...fm.services],
        expectedCredits: fm.expectedCredits,
        gate: fm.gate === true,
        keep: fm.keep,
        maxLiveHours: fm.maxLiveHours ?? null,
        canUseCredits: [...fm.canUseCredits],
        leftovers: [...fm.leftovers],
        sources: fm.sources.map((s) => ({ url: s.url, verified_on: s.verified_on })),
        html: sections.map((s) => s.html).join(''),
      };
    });

  const searchChunk: SearchChunk = { entries: search };
  const body = {
    modules,
    concepts,
    glossary,
    missions,
    questionVersions,
    search: emit('search', searchChunk),
  };
  const contentVersion = `c-${sha256(JSON.stringify(body)).slice(0, 6)}`;
  const index: ContentIndex = { contentVersion, ...body };
  return { contentVersion, indexFile: emit('index', index), files };
}
