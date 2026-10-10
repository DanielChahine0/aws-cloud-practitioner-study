import { createHash } from 'node:crypto';
import type {
  BadgeView,
  ConceptMeta,
  ContentIndex,
  DomainView,
  ExamChunk,
  ExamFormMeta,
  ExamItemRef,
  GlossaryItem,
  IncidentMeta,
  IncidentView,
  LabMeta,
  LabView,
  LessonChunk,
  LessonMeta,
  MissionMeta,
  ModuleChunk,
  ModuleMeta,
  QuestionView,
  RankView,
  SearchChunk,
  SearchEntry,
  TaskView,
} from '../../schemas/chunks.ts';
import type { Concept } from '../../schemas/concept.ts';
import { LAB_SCHEMAS } from '../../schemas/lab.ts';
import { normalize } from '../../src/app/search.ts';
import {
  CONCEPTS_FILE,
  type Context,
  incidentShips,
  type LabEntry,
  type LessonNote,
  type ModuleNote,
  type Note,
  POOL_DIR,
  type QuestionEntry,
} from './lib/context.ts';
import { evidenceForm, noteLines, sectionAt } from './lib/evidence.ts';
import { parseGlossary, termMatcher } from './lib/glossary.ts';
import { labTexts } from './lib/labs.ts';
import { renderDoc, renderInline, routeOf } from './lib/render.ts';
import { stripMarkdown, words } from './lib/text.ts';

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

const WORDS_PER_MINUTE = 200;
const MAX_CONFUSABLE = 3;

/** A lesson's reading time in whole minutes, at least 1 (spec 4.6). */
export function readingMinutes(body: string): number {
  return Math.max(1, Math.ceil(words(stripMarkdown(body)).length / WORDS_PER_MINUTE));
}

/**
 * `confusableWith` made symmetric (spec 2.4): each concept's own list in order, then every concept that lists it,
 * in registry order, without itself or duplicates, the first 3 kept.
 */
export function confusableLinks(concepts: readonly Concept[]): Map<string, string[]> {
  const links = new Map<string, string[]>();
  for (const c of concepts) {
    const others = concepts.filter((o) => o.confusableWith?.includes(c.id)).map((o) => o.id);
    const unique = [...new Set([...(c.confusableWith ?? []), ...others])].filter((id) => id !== c.id);
    links.set(c.id, unique.slice(0, MAX_CONFUSABLE));
  }
  return links;
}

/**
 * The mock forms (spec 4.3): one chunk per form, `content/exam-a.<hash8>.json` to `exam-d`, holding that form's live
 * items in form order, so an untaken form's text never loads outside its own mock. Pool items in no form never ship.
 * The index files each item under its registered concept id, an alias resolved as R12 does, so an exam item and its
 * practice variants share one concept key. Errors name ids only, because exam-pool text must never reach tool output.
 */
function formChunks(
  ctx: Context,
  notesById: ReadonlyMap<string, Note>,
  emit: (stem: string, data: unknown) => string,
): { forms: ExamFormMeta[]; items: Record<string, ExamItemRef> } {
  const forms: ExamFormMeta[] = [];
  const items: Record<string, ExamItemRef> = {};
  if (ctx.forms === null) return { forms, items };
  const canonical = new Map(ctx.concepts.flatMap((c) => (c.aliases ?? []).map((a) => [a, c.id] as const)));
  const pool = new Map(
    ctx.questions.filter(({ q }) => q.pool === 'exam').map((entry) => [entry.q.id, entry] as const),
  );
  for (const form of ctx.forms.forms) {
    const questions: QuestionView[] = [];
    for (const qid of form.qids) {
      const entry = pool.get(qid);
      if (entry === undefined) throw new Error(`form ${form.id} lists ${qid}, which is not in ${POOL_DIR}/`);
      if (entry.q.status !== 'live') continue;
      if (entry.q.type === 'match') throw new Error(`${qid} in form ${form.id} is a match item`);
      const taken = items[qid];
      if (taken !== undefined) throw new Error(`${qid} sits in forms ${taken.form} and ${form.id}`);
      const note = notesById.get(entry.noteId);
      if (note === undefined) throw new Error(`${entry.path}: ${entry.noteId} is not a note`);
      questions.push(questionView(entry, note));
      items[qid] = {
        version: entry.q.version,
        concept: canonical.get(entry.q.concept) ?? entry.q.concept,
        task: entry.q.task,
        form: form.id,
        type: entry.q.type,
      };
    }
    const chunk: ExamChunk = { form: form.id, questions };
    forms.push({
      id: form.id,
      chunk: emit(`exam-${form.id.toLowerCase()}`, chunk),
      frozen: form.frozen,
      size: questions.length,
    });
  }
  return { forms, items };
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
    .filter(({ q, incident }) => incident === null && q.status === 'live' && q.pool === 'practice')
    .sort(
      (a, b) =>
        (noteOrder.get(a.noteId) ?? 0) - (noteOrder.get(b.noteId) ?? 0) ||
        (a.q.id < b.q.id ? -1 : a.q.id > b.q.id ? 1 : 0),
    );
  const questionVersions: Record<string, number> = {};
  const aliasOf = new Map(ctx.concepts.flatMap((c) => (c.aliases ?? []).map((a) => [a, c.id] as const)));
  const practised = new Set(live.map(({ q }) => aliasOf.get(q.concept) ?? q.concept));
  const checkConceptsOf = (noteId: string): number =>
    ctx.concepts.filter((c) => c.home === noteId && c.tested !== false && practised.has(c.id)).length;

  // Live labs, by module, core before stretch, then id; each ships without its solution and wrong paths (spec 5.1).
  const tierRank = (e: LabEntry): number => (e.lab.tier === 'core' ? 0 : 1);
  const liveLabs = ctx.labs
    .filter((e) => e.lab.status === 'live')
    .sort(
      (a, b) =>
        a.lab.module - b.lab.module ||
        tierRank(a) - tierRank(b) ||
        (a.lab.id < b.lab.id ? -1 : a.lab.id > b.lab.id ? 1 : 0),
    );
  const livePractice = new Map(live.map((entry) => [entry.q.id, entry] as const));
  const labMeta = ({ lab }: LabEntry): LabMeta => ({
    id: lab.id,
    module: lab.module,
    engine: lab.engine,
    tier: lab.tier,
    rev: lab.rev,
    title: lab.title,
    minutes: lab.minutes,
  });
  const labView = (entry: LabEntry): LabView => {
    const { lab } = entry;
    const spec = LAB_SCHEMAS[lab.engine]?.spec.safeParse(lab.spec);
    if (spec === undefined || !spec.success) {
      throw new Error(`${lab.id}: its ${lab.engine} spec does not parse; run pnpm content:validate`);
    }
    const notes = lab.notes.map((id) => {
      const note = notesById.get(id);
      if (note?.kind !== 'lesson' || note.fm === null) {
        throw new Error(`${lab.id}: note ${id} is not a note; run pnpm content:validate`);
      }
      return { route: routeOf(note), title: note.fm.title };
    });
    const questions = lab.debrief.questions.map((qid) => {
      const question = livePractice.get(qid);
      const note = question === undefined ? undefined : notesById.get(question.noteId);
      if (question === undefined || note === undefined) {
        throw new Error(
          `${lab.id}: debrief question ${qid} is not a live practice question; run pnpm content:validate`,
        );
      }
      return questionView(question, note);
    });
    return {
      ...labMeta(entry),
      concepts: [...lab.concepts],
      brief: lab.brief,
      spec: spec.data,
      goals: lab.goals.map((g) => ({ id: g.id, label: g.label, hint: g.hint })),
      notes,
      debrief: { lines: [...lab.debrief.lines], questions },
      credits: lab.engine === 'simulate' || labTexts(lab).some((text) => /lab credit/i.test(text)),
    };
  };
  const labsOf = new Map<string, string[]>();
  for (const { lab } of liveLabs) {
    for (const id of new Set(lab.concepts.map((c) => aliasOf.get(c) ?? c))) {
      labsOf.set(id, [...(labsOf.get(id) ?? []), lab.id]);
    }
  }

  const shipped = ctx.incidents
    .filter(incidentShips)
    .sort((a, b) => (a.incident.id < b.incident.id ? -1 : a.incident.id > b.incident.id ? 1 : 0));
  const incidents: IncidentMeta[] = shipped.map(({ incident }) => ({
    id: incident.id,
    title: incident.title,
    modules: [...incident.modules],
  }));

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
        minutes: readingMinutes(note.body),
        checkConcepts: checkConceptsOf(note.id),
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
    const labs = liveLabs.filter((e) => e.lab.module === n).map(labView);
    const moduleIncidents: IncidentView[] = shipped
      .filter(({ incident }) => incident.modules[0] === n)
      .map(({ incident, steps }) => ({
        id: incident.id,
        title: incident.title,
        modules: [...incident.modules],
        brief: incident.brief,
        steps: steps.map((step) => {
          const note = notesById.get(step.noteId);
          if (note === undefined) throw new Error(`${step.path}: ${step.noteId} is not a note`);
          questionVersions[step.q.id] = step.q.version;
          return questionView(step, note);
        }),
      }));
    const chunk: ModuleChunk = {
      module: n,
      readme: readmeSections,
      lessons: chunkLessons,
      questions,
      labs,
      incidents: moduleIncidents,
    };
    modules.push({
      n,
      slug: readme.fm.slug,
      title: readme.fm.title,
      short,
      lessons,
      chunk: emit(`m${pad2(n)}`, chunk),
    });
  }

  const links = confusableLinks(ctx.concepts);
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
    return {
      id: c.id,
      name: c.name,
      home: c.home,
      anchor: c.anchor,
      tested: c.tested !== false,
      tasks: [...c.tasks],
      confusableWith: links.get(c.id) ?? [],
      aliases: [...(c.aliases ?? [])],
      splitFrom: c.splitFrom ?? null,
      ...(labsOf.has(c.id) ? { labs: labsOf.get(c.id) ?? [] } : {}),
    };
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

  const conceptNames = new Map(ctx.concepts.map((c) => [c.id, c.name] as const));
  for (const { lab } of liveLabs) {
    const names = lab.concepts.map((c) => conceptNames.get(aliasOf.get(c) ?? c) ?? c);
    search.push({
      kind: 'lab',
      title: lab.title,
      detail: `Module ${lab.module} lab`,
      route: `#/m/${pad2(lab.module)}/lab/${lab.id}`,
      text: normalize([lab.brief, ...names].join(' ')),
    });
  }

  const searchChunk: SearchChunk = { entries: search };
  const domains: DomainView[] = (ctx.blueprint?.domains ?? []).map(({ id, name, weight }) => ({
    id,
    name,
    weight,
  }));
  const tasks: TaskView[] = (ctx.blueprint?.tasks ?? []).map(({ id, text, short }) => ({
    id,
    domain: id.charAt(0),
    text,
    short,
  }));
  const ranks: RankView[] = (ctx.ranks ?? []).map((rank) => {
    const requires: Record<string, number | boolean> = {};
    for (const [key, value] of Object.entries(rank.requires)) if (value !== undefined) requires[key] = value;
    return { id: rank.id, name: rank.name, short: rank.short, requires, facts: [...(rank.facts ?? [])] };
  });
  const badges: BadgeView[] = (ctx.badges ?? []).map((badge) => ({
    id: badge.id,
    name: badge.name,
    rule: badge.rule,
    arrives: badge.arrives ?? null,
  }));
  const body = {
    modules,
    concepts,
    glossary,
    missions,
    questionVersions,
    search: emit('search', searchChunk),
    blueprint: { domains, tasks },
    ranks,
    badges,
    exam: formChunks(ctx, notesById, emit),
    labs: liveLabs.map(labMeta),
    incidents,
  };
  const contentVersion = `c-${sha256(JSON.stringify(body)).slice(0, 6)}`;
  const index: ContentIndex = { contentVersion, ...body };
  return { contentVersion, indexFile: emit('index', index), files };
}
