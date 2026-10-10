import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ContentIndex, ModuleChunk, QuestionView } from '../../../schemas/chunks.ts';
import type { StudyEvent } from '../../../schemas/events.ts';
import { SURE_HINT } from '../../engine/bets.ts';
import { studyDayAt, tzOffset } from '../../engine/day.ts';
import { resolveConcept, sessionSummary } from '../../engine/memory.ts';
import { CHUNK_SIZE } from '../../engine/queue.ts';
import { openSession, type SessionState } from '../../engine/replay.ts';
import {
  type PoolQuestion,
  relearnVariant,
  selectCheck,
  selectQuiz,
  sessionItems,
} from '../../engine/select.ts';
import { recall } from '../../engine/srs.ts';
import { ulid } from '../../store/ulid.ts';
import { Breadcrumbs } from '../../ui/Breadcrumbs.tsx';
import { useTitle } from '../../ui/useTitle.ts';
import { now } from '../clock.ts';
import { ensureExamForm, ensureModule, examForms, modules } from '../content.ts';
import { nothingDueLine } from '../home.ts';
import { firstTryOf, incidentPaidLine } from '../incident.ts';
import { isControl, isTyping } from '../keyboard.ts';
import { formsToLoad, learnPoolNow, practicePoolOf } from '../learn-pool.ts';
import { learnForms, memory, memoryContent, queue } from '../memory.ts';
import { weakestConcepts } from '../module.ts';
import { neighbors } from '../nav.ts';
import { events, newSessionSeed, progress, record, recordAll, storeReady } from '../progress.ts';
import { badgeEarnedLine, badgesIn } from '../results.ts';
import { pad2, toHash } from '../router.ts';
import {
  canSubmit,
  displayOrder,
  endSummaryLine,
  focusTitle,
  homedConcepts,
  isCorrect,
  leftId,
  modeLabel,
  type Picked,
  rightId,
  verdictAnnouncement,
} from '../runner.ts';
import { type RunnerCommand, runnerKey } from '../runner-keys.ts';
import { highlight, navigate, overlay } from '../state.ts';
import { NotFound } from './NotFound.tsx';

/** The modes a `Session` runs; a lab debrief (spec 5.1) runs inside the lab screen, never at a runner route. */
export type RunnerMode = 'check' | 'quiz' | 'focus' | 'review' | 'debrief' | 'incident';
type FlagReason = Extract<StudyEvent, { t: 'flag' }>['reason'];

interface Props {
  idx: ContentIndex;
  /** The routed modes; an incident runs its Session from its own screen. */
  mode: Exclude<RunnerMode, 'debrief' | 'incident'>;
  /** `m03/aws-lambda` for a lesson check, `m03` for a module quiz, `2.3` or `m03` for a focus quiz, `review` for a review. */
  scope: string;
}

interface Feedback {
  qid: string;
  picked: Picked;
  correct: boolean;
}

const LETTERS = 'abcde';
const REASONS: readonly { id: FlagReason; label: string }[] = [
  { id: 'wrong-key', label: 'Wrong answer key' },
  { id: 'ambiguous', label: 'Ambiguous' },
  { id: 'outdated', label: 'Outdated' },
  { id: 'typo', label: 'Typo' },
  { id: 'other', label: 'Other' },
];

/** The concept a question tests, as memory keys it (aliases resolved); the raw id when memory does not know it. */
function memoryConcept(concept: string): string {
  const content = memoryContent.peek();
  return (content === null ? null : resolveConcept(content, concept)) ?? concept;
}

/** The concept's recall now (spec 3.6), or 0 without a card, which ranks it first in a module quiz (spec 4.1). */
function conceptRecall(concept: string): number {
  const card = memory.peek()?.concepts.get(memoryConcept(concept))?.card ?? null;
  return card === null ? 0 : recall(card, now.peek());
}

/** True when the concept carries a misconception mark (spec 3.1) at this moment. */
function markedMisconception(concept: string): boolean {
  return (memory.peek()?.concepts.get(memoryConcept(concept))?.misconception ?? null) !== null;
}

/**
 * The learn pool of some chunks plus the items of forms whose mock is over (spec 4.3), with each concept as memory
 * keys it.
 */
function poolOf(chunks: readonly ModuleChunk[]): PoolQuestion[] {
  return learnPoolNow(practicePoolOf(chunks, memoryConcept));
}

/** Every question a session may show: the loaded chunks' and the loaded chunks of the learn pool's forms. */
function shippedOf(chunks: readonly ModuleChunk[]): Map<string, QuestionView> {
  const out = new Map<string, QuestionView>();
  for (const c of chunks) for (const q of c.questions) out.set(q.id, q);
  for (const form of learnForms.value) {
    for (const q of examForms.value.get(form)?.questions ?? []) out.set(q.id, q);
  }
  return out;
}

type FormsState = 'ready' | 'loading' | 'failed';

/** What a runner shows while a session's form chunks fail to load. */
const FORMS_ERROR = 'This session could not load. Check your connection and try again.';

/**
 * Loads the form chunks a session needs before it shows (`formsToLoad`), so a resumed session never drops an item of
 * a taken form as unshipped: 'loading' until each is in `examForms`, then 'ready', or 'failed' when one cannot load.
 */
function useSessionForms(
  idx: ContentIndex,
  session: SessionState | undefined,
  also: Iterable<string>,
): FormsState {
  const pending = session === undefined ? [] : formsToLoad(session.qids, also, idx.exam, examForms.value);
  const key = pending.join(' ');
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    if (key === '') return;
    let live = true;
    void Promise.all(key.split(' ').map((f) => ensureExamForm(f))).then((chunks) => {
      if (live && chunks.includes(null)) setFailed(key);
    });
    return () => {
      live = false;
    };
  }, [key]);
  if (key === '') return 'ready';
  return failed === key ? 'failed' : 'loading';
}

/** Starts the session of this mode and scope, or finds the one in progress; null when nothing can be asked. */
function startOrResume(
  idx: ContentIndex,
  chunk: ModuleChunk,
  mode: 'check' | 'quiz',
  scope: string,
): string | null {
  const open = openSession(progress.peek(), mode, scope);
  if (open !== null) return open.sid;
  const seed = newSessionSeed();
  const module = Number(scope.slice(1, 3));
  const pool = poolOf([chunk]).filter((q) => q.module === module);
  const slug = scope.split('/')[1] ?? '';
  const qids =
    mode === 'check'
      ? selectCheck({
          concepts: homedConcepts(idx, chunk, scope, slug),
          pool: pool.filter((q) => q.note === scope),
          progress: progress.peek(),
          seed,
        })
      : selectQuiz({ pool, progress: progress.peek(), seed, recall: conceptRecall });
  if (qids.length === 0) return null;
  const sid = ulid();
  void record({ t: 'session', sid, mode, phase: 'start', scope, seed, qids });
  return sid;
}

/** The size of a focus quiz (spec 4.1). */
const FOCUS_SIZE = 10;

/** The concepts a focus quiz covers: a task statement's tested concepts, or a module's 10 weakest. */
function focusConcepts(idx: ContentIndex, scope: string): string[] {
  if (scope.startsWith('m')) {
    const ids = idx.concepts.filter((c) => c.tested && c.home.startsWith(`${scope}/`)).map((c) => c.id);
    const m = memory.peek();
    if (m === null) return ids.slice(0, FOCUS_SIZE);
    const at = now.peek();
    return weakestConcepts(ids, new Map(), m, at, tzOffset(at))
      .slice(0, FOCUS_SIZE)
      .map((row) => row.id);
  }
  return idx.concepts.filter((c) => c.tested && c.tasks.includes(scope)).map((c) => c.id);
}

/** The runner `#/s/check/mNN/<slug>`, `#/s/quiz/mNN`, `#/s/focus/<scope>` and `#/s/review`. */
export function Runner({ idx, mode, scope }: Props) {
  if (mode === 'review') return <ReviewRunner idx={idx} />;
  if (mode === 'focus') return <FocusRunner idx={idx} scope={scope} />;
  return <ModuleRunner idx={idx} mode={mode} scope={scope} />;
}

/** A focus quiz (spec 4.1): 10 items over a task's concepts or a module's weakest, loading every module it needs. */
function FocusRunner({ idx, scope }: { idx: ContentIndex; scope: string }) {
  const title = focusTitle(scope, idx.blueprint.tasks);
  useTitle(title);
  const module = scope.startsWith('m') ? Number(scope.slice(1)) : null;
  const known =
    module === null
      ? idx.blueprint.tasks.some((t) => t.id === scope)
      : idx.modules.some((m) => m.n === module);
  const ready = storeReady.value;
  const [concepts, setConcepts] = useState<readonly string[] | null>(null);
  const [sid, setSid] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);
  const loaded = modules.value;

  // biome-ignore lint/correctness/useExhaustiveDependencies: Biome takes a signal's value for a constant import; it changes, so it is a dependency
  useEffect(() => {
    if (known && ready && concepts === null) setConcepts(focusConcepts(idx, scope));
  }, [known, ready, concepts, idx, scope]);
  const wanted = useMemo(() => (concepts === null ? [] : modulesOf(concepts)), [concepts]);
  useEffect(() => {
    for (const n of wanted) ensureModule(n);
  }, [wanted]);
  const chunks = wanted.map((n) => loaded.get(n)).filter((c): c is ModuleChunk => c !== undefined);
  const allLoaded = concepts !== null && chunks.length === wanted.length;

  // biome-ignore lint/correctness/useExhaustiveDependencies: Biome takes a signal's value for a constant import; it changes, so it is a dependency
  useEffect(() => {
    if (!allLoaded || concepts === null || sid !== null || empty) return;
    const open = openSession(progress.peek(), 'focus', scope);
    if (open !== null) {
      setSid(open.sid);
      return;
    }
    const want = new Set(concepts);
    const pool = poolOf(chunks).filter((q) => want.has(q.concept));
    const seed = newSessionSeed();
    const qids = selectQuiz({
      pool,
      progress: progress.peek(),
      seed,
      size: FOCUS_SIZE,
      recall: conceptRecall,
    });
    if (qids.length === 0) {
      setEmpty(true);
      return;
    }
    const started = ulid();
    void record({ t: 'session', sid: started, mode: 'focus', phase: 'start', scope, seed, qids });
    setSid(started);
  }, [allLoaded, concepts, sid, empty, scope, loaded]);

  const session = sid === null ? undefined : progress.value.sessions.get(sid);
  const forms = useSessionForms(idx, session, []);

  if (!known) return <NotFound hash={location.hash} />;
  const short = module === null ? undefined : idx.modules.find((m) => m.n === module)?.short;
  const crumbs = [
    { label: 'Home', href: '#/' },
    ...(module === null ? [] : [{ label: `Module ${module}: ${short ?? ''}`, href: `#/m/${pad2(module)}` }]),
    { label: modeLabel('focus'), href: location.hash },
  ];
  return (
    <>
      <Breadcrumbs items={crumbs} />
      <h1>{title}</h1>
      {empty ? (
        <p class="muted">No practice questions for this focus quiz yet.</p>
      ) : forms === 'failed' ? (
        <p class="muted">{FORMS_ERROR}</p>
      ) : !allLoaded || session === undefined || forms === 'loading' ? (
        <p class="muted">Loading</p>
      ) : (
        <Session
          idx={idx}
          shipped={shippedOf(chunks)}
          pool={[]}
          session={session}
          mode="focus"
          module={module}
          slug={null}
        />
      )}
    </>
  );
}

function ModuleRunner({ idx, mode, scope }: { idx: ContentIndex; mode: 'check' | 'quiz'; scope: string }) {
  const module = Number(scope.slice(1, 3));
  const slug = mode === 'check' ? (scope.split('/')[1] ?? '') : null;
  const meta = idx.modules.find((m) => m.n === module);
  const lessonMeta = slug === null ? undefined : meta?.lessons.find((l) => l.slug === slug);
  const chunk = modules.value.get(module);
  const title =
    mode === 'check'
      ? `${modeLabel(mode)}: ${lessonMeta?.title ?? ''}`
      : `${modeLabel(mode)}: ${meta?.short ?? ''}`;
  useTitle(title);
  useEffect(() => ensureModule(module), [module]);

  const [sid, setSid] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);
  const known = meta !== undefined && (mode === 'quiz' || lessonMeta !== undefined);
  // The session starts once the chunk and the stored log have loaded, so a session in progress is found.
  const startable = known && storeReady.value ? chunk : undefined;
  useEffect(() => {
    if (startable === undefined || sid !== null || empty) return;
    const started = startOrResume(idx, startable, mode, scope);
    if (started === null) setEmpty(true);
    else setSid(started);
  }, [startable, sid, empty, idx, mode, scope]);
  const session = sid === null ? undefined : progress.value.sessions.get(sid);
  const forms = useSessionForms(idx, session, []);

  if (!known) return <NotFound hash={location.hash} />;

  const crumbs = [
    { label: 'Home', href: '#/' },
    { label: `Module ${module}: ${meta.short}`, href: `#/m/${pad2(module)}` },
    ...(lessonMeta === undefined
      ? []
      : [{ label: lessonMeta.title, href: `#/m/${pad2(module)}/l/${lessonMeta.slug}` }]),
    { label: modeLabel(mode), href: location.hash },
  ];
  return (
    <>
      <Breadcrumbs items={crumbs} />
      <h1>{title}</h1>
      {empty ? (
        <p class="muted">
          {mode === 'check'
            ? 'No practice questions for this lesson yet.'
            : 'No practice questions for this module yet.'}
        </p>
      ) : forms === 'failed' ? (
        <p class="muted">{FORMS_ERROR}</p>
      ) : chunk === undefined || session === undefined || forms === 'loading' ? (
        <p class="muted">Loading</p>
      ) : (
        <Session
          idx={idx}
          shipped={shippedOf([chunk])}
          pool={[]}
          session={session}
          mode={mode}
          module={module}
          slug={slug}
        />
      )}
    </>
  );
}

/** The modules that home some concepts. */
function modulesOf(concepts: readonly string[]): number[] {
  const content = memoryContent.peek();
  const out = new Set<number>();
  for (const c of concepts) {
    const module = content?.concepts.get(c)?.module;
    if (module !== undefined) out.add(module);
  }
  return [...out].sort((a, b) => a - b);
}

/**
 * The review `#/s/review` (spec 3.6 and 3.7): resumes today's review, or abandons one from an earlier study day
 * and starts on the first 20 queue concepts, one variant each, once their modules have loaded.
 */
function ReviewRunner({ idx }: { idx: ContentIndex }) {
  useTitle('Review');
  const [sid, setSid] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);
  const [wanted, setWanted] = useState<readonly string[] | null>(null);
  const ready = storeReady.value;
  const q = queue.value;
  const loaded = modules.value;

  // biome-ignore lint/correctness/useExhaustiveDependencies: Biome takes a signal's value for a constant import; it changes, so it is a dependency
  useEffect(() => {
    if (!ready || q === null || sid !== null || empty || wanted !== null) return;
    const at = now.peek();
    const tz = tzOffset(at);
    const open = openSession(progress.peek(), 'review', 'review');
    if (open !== null) {
      if (studyDayAt(new Date(open.startedAt), tz) === studyDayAt(at, tz)) {
        setSid(open.sid);
        return;
      }
      void record({ t: 'session', sid: open.sid, mode: 'review', phase: 'abandon', seed: open.seed });
    }
    const concepts = q.items.slice(0, CHUNK_SIZE);
    if (concepts.length === 0) setEmpty(true);
    else setWanted(concepts);
  }, [ready, q, sid, empty, wanted]);

  useEffect(() => {
    if (wanted !== null) for (const n of modulesOf(wanted)) ensureModule(n);
  }, [wanted]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Biome takes a signal's value for a constant import; it changes, so it is a dependency
  useEffect(() => {
    if (wanted === null || sid !== null) return;
    const chunks = modulesOf(wanted).map((n) => loaded.get(n));
    if (chunks.some((c) => c === undefined)) return;
    const seed = newSessionSeed();
    const qids = selectCheck({
      concepts: wanted,
      pool: poolOf(chunks.filter((c): c is ModuleChunk => c !== undefined)),
      progress: progress.peek(),
      seed,
    });
    if (qids.length === 0) {
      setEmpty(true);
      return;
    }
    const started = ulid();
    void record({ t: 'session', sid: started, mode: 'review', phase: 'start', scope: 'review', seed, qids });
    setSid(started);
  }, [wanted, sid, loaded]);

  const session = sid === null ? undefined : progress.value.sessions.get(sid);
  const shipped = shippedOf([...loaded.values()]);
  // A resumed review can hold questions of modules not loaded yet; the index says which ids still ship.
  const missing = session?.qids.some((id) => id in idx.questionVersions && !shipped.has(id)) === true;
  useEffect(() => {
    if (missing) for (const m of idx.modules) ensureModule(m.n);
  }, [missing, idx]);
  // Every form of the learn pool, not only the session's: a relearn variant comes from the whole learn pool, so it
  // must not change when a form loads mid-session.
  const forms = useSessionForms(idx, session, learnForms.value);

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Home', href: '#/' },
          { label: modeLabel('review'), href: toHash({ kind: 'review' }) },
        ]}
      />
      <h1>{modeLabel('review')}</h1>
      {empty ? (
        <>
          <p class="muted">{q === null ? 'Nothing due.' : nothingDueLine(q, now.value)}</p>
          <p>
            <a href="#/">Back to Home</a>
          </p>
        </>
      ) : forms === 'failed' ? (
        <p class="muted">{FORMS_ERROR}</p>
      ) : session === undefined || missing || forms === 'loading' ? (
        <p class="muted">Loading</p>
      ) : (
        <Session
          idx={idx}
          shipped={shipped}
          pool={poolOf([...loaded.values()])}
          session={session}
          mode="review"
          module={null}
          slug={null}
        />
      )}
    </>
  );
}

interface SessionProps {
  idx: ContentIndex;
  /** Every loaded live question by id. */
  shipped: ReadonlyMap<string, QuestionView>;
  /** Where a review's relearn variants come from; empty for checks and quizzes. */
  pool: readonly PoolQuestion[];
  session: SessionState;
  mode: RunnerMode;
  module: number | null;
  slug: string | null;
}

/** One session's questions, one at a time, then its end line; the lab screen embeds it for a debrief. */
export function Session({ idx, shipped, pool, session, mode, module, slug }: SessionProps) {
  const items = sessionItems(session, (qid, concept) =>
    relearnVariant({ concept: memoryConcept(concept), avoid: qid, pool, seed: session.seed }),
  ).filter((item) => shipped.has(item.qid));
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const shown =
    feedback === null
      ? items.find((item) => !session.answers.has(item.qid))
      : items.find((item) => item.qid === feedback.qid);
  // Complete once every item has an answer; a wrong review answer adds its relearn item before this is read.
  const complete = items.every((item) => session.answers.has(item.qid));
  const submitted = useRef(session.submittedAt !== null);

  // Submits once every item has an answer: right after the last answer, or on resuming such a session.
  const finish = (): void => {
    if (submitted.current) return;
    submitted.current = true;
    const submit = { t: 'session', sid: session.sid, mode, phase: 'submit', seed: session.seed } as const;
    if (mode === 'incident') {
      // One transaction, so a reload never keeps the submit without the solve that pays it.
      void recordAll([
        submit,
        { t: 'incident.done', incident: session.scope, firstTry: firstTryOf(session) },
      ]);
      return;
    }
    void record(submit);
    if (mode === 'check' && !progress.peek().lessonsDone.has(session.scope)) {
      void record({ t: 'lesson.done', note: session.scope });
    }
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;
  useEffect(() => {
    if (complete) finishRef.current();
  }, [complete]);

  if (shown === undefined)
    return <EndLine idx={idx} mode={mode} module={module} slug={slug} session={session} />;
  const q = shipped.get(shown.qid);
  if (q === undefined) return null;
  return (
    <Question
      key={q.id}
      q={q}
      session={session}
      mode={mode}
      relearn={shown.relearn}
      position={items.indexOf(shown) + 1}
      total={items.length}
      feedback={feedback}
      onAnswered={setFeedback}
      onNext={() => setFeedback(null)}
    />
  );
}

function EndLine({
  idx,
  mode,
  module,
  slug,
  session,
}: {
  idx: ContentIndex;
  mode: RunnerMode;
  module: number | null;
  slug: string | null;
  session: SessionState;
}) {
  const m = memory.value;
  const content = memoryContent.value;
  const at = now.value;
  const line =
    m === null || content === null
      ? ''
      : endSummaryLine(sessionSummary(session, m, content, at, tzOffset(at)));
  if (mode === 'incident') {
    const done = events.value.find((e) => e.t === 'incident.done' && e.incident === session.scope);
    const xp = done === undefined ? 0 : (m?.xpByEvent.get(done.id) ?? 0);
    return (
      <>
        <p class="end-line" aria-live="polite">
          {line}
        </p>
        <p class="incident-paid">{incidentPaidLine(xp)}</p>
        <BadgeLine idx={idx} session={session} />
        <ul class="end-links">
          <li>
            <a href="#/">Back to Home</a>
          </li>
        </ul>
      </>
    );
  }
  if (mode === 'review') {
    const more = (queue.value?.items.length ?? 0) > 0;
    return (
      <>
        <p class="end-line" aria-live="polite">
          {line}
        </p>
        <BadgeLine idx={idx} session={session} />
        <p class="review-done">Done for now.</p>
        <ul class="end-links">
          <li>
            <a href="#/">Back to Home</a>
          </li>
          {more && (
            <li>
              <a href={toHash({ kind: 'review' })}>Review more</a>
            </li>
          )}
        </ul>
      </>
    );
  }
  const next = slug === null || module === null ? null : neighbors(idx.modules, module, slug).next;
  return (
    <>
      <p class="end-line" aria-live="polite">
        {line}
      </p>
      <BadgeLine idx={idx} session={session} />
      <ul class="end-links">
        {mode === 'check' && slug !== null && module !== null ? (
          <>
            <li>
              <a href={`#/m/${pad2(module)}/l/${slug}`}>Back to the lesson</a>
            </li>
            {next !== null && (
              <li>
                <a href={`#/m/${pad2(next.module)}/l/${next.slug}`}>Next lesson</a>
              </li>
            )}
          </>
        ) : mode === 'debrief' && module !== null ? (
          <li>
            <a href={`#/m/${pad2(module)}`}>Back to Module {module}</a>
          </li>
        ) : mode === 'focus' ? (
          <>
            <li>
              <a href={module === null ? '#/' : `#/m/${pad2(module)}`}>
                {module === null ? 'Back to Home' : `Back to Module ${module}`}
              </a>
            </li>
            <li>
              <a href={toHash({ kind: 'focus', scope: session.scope })}>Another focus quiz</a>
            </li>
          </>
        ) : module !== null ? (
          <>
            <li>
              <a href={`#/m/${pad2(module)}`}>Back to Module {module}</a>
            </li>
            <li>
              <a href={`#/s/quiz/m${pad2(module)}`}>Another quiz</a>
            </li>
          </>
        ) : null}
      </ul>
    </>
  );
}

/** `Badge: First Brew` under the end line when an event of this session earned a badge (spec 3.10). */
function BadgeLine({ idx, session }: { idx: ContentIndex; session: SessionState }) {
  const earned = memory.value?.badges;
  if (earned === undefined) return null;
  const ids = new Set(events.value.filter((e) => 'sid' in e && e.sid === session.sid).map((e) => e.id));
  const names = badgesIn(earned, ids).map((id) => idx.badges.find((b) => b.id === id)?.name ?? id);
  return names.length === 0 ? null : <p class="badge-line">{badgeEarnedLine(names)}</p>;
}

interface QuestionProps {
  q: QuestionView;
  session: SessionState;
  mode: RunnerMode;
  /** True for a review's relearn step (spec 3.6), which the answer event carries. */
  relearn: boolean;
  position: number;
  total: number;
  feedback: Feedback | null;
  onAnswered: (f: Feedback) => void;
  onNext: () => void;
}

function Question({
  q,
  session,
  mode,
  relearn,
  position,
  total,
  feedback,
  onAnswered,
  onNext,
}: QuestionProps) {
  const order = displayOrder(q, session.seed);
  const [choice, setChoice] = useState<string[]>([]);
  /** Match: left index to the right id it is paired with. */
  const [pairs, setPairs] = useState<ReadonlyMap<number, string>>(new Map());
  const [activeLeft, setActiveLeft] = useState(0);
  const [expandAll, setExpandAll] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  /** True once the answer's event is committed; Next waits for it (spec 8.1). */
  const [stored, setStored] = useState(false);
  /** The live region's words, with the XP the replay gave the stored answer. */
  const [announce, setAnnounce] = useState('');
  /** Whether the concept carried a misconception as the question showed (spec 3.1), so feedback can say so. */
  const [wasSure] = useState(() => markedMisconception(q.concept));
  const stem = useRef<HTMLParagraphElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const shownAt = useRef(Date.now());
  const answered = feedback !== null;

  const picked: Picked =
    q.type === 'match'
      ? [...pairs.entries()].sort(([a], [b]) => a - b).map(([l, r]): [string, string] => [leftId(l), r])
      : choice;
  const ready = canSubmit(q, picked);

  useLayoutEffect(() => {
    // Each question starts at the top of the page, with focus on its stem (spec 7.5).
    window.scrollTo(0, 0);
    stem.current?.focus({ preventScroll: true });
  }, []);

  const submit = (sure: boolean): void => {
    if (answered || !ready) return;
    const correct = isCorrect(q, picked);
    // The answer joins the log first, so a session submit that follows it scores this answer too.
    const saved = record({
      t: 'answer',
      sid: session.sid,
      mode,
      qid: q.id,
      qv: q.version,
      concept: q.concept,
      picked,
      correct,
      sure,
      ms: Date.now() - shownAt.current,
      ...(relearn ? { relearn: true } : {}),
    });
    onAnswered({ qid: q.id, picked, correct });
    // Next turns on and takes focus once the answer is stored (spec 8.1 waits for the commit before showing Next).
    // The page stays where the reader is, with the verdict under the stem; on a phone Next sits in the sticky bar.
    void saved.then((event) => {
      setStored(true);
      setAnnounce(verdictAnnouncement(correct, memory.peek()?.xpByEvent.get(event.id) ?? 0));
    });
  };

  useEffect(() => {
    if (stored) nextButton.current?.focus({ preventScroll: true });
  }, [stored]);

  const next = (): void => {
    if (stored) onNext();
  };

  const choose = (id: string): void => {
    if (answered) return;
    if (q.type === 'single') setChoice([id]);
    else setChoice((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  };

  const pair = (left: number, right: string | null): void => {
    setPairs((current) => {
      const next = new Map(current);
      for (const [l, r] of current) if (r === right && l !== left) next.delete(l);
      if (right === null) next.delete(left);
      else next.set(left, right);
      return next;
    });
  };

  const readInNotes = (): void => {
    highlight.value = q.read.text;
    navigate(q.read.route);
  };

  const run = (command: RunnerCommand): void => {
    switch (command.kind) {
      case 'choose': {
        const id = order[command.n - 1];
        if (id !== undefined) choose(id);
        break;
      }
      case 'pick-left':
        setActiveLeft(command.n - 1);
        break;
      case 'pair': {
        const right = order[LETTERS.indexOf(command.letter)];
        if (right === undefined) break;
        pair(activeLeft, right);
        const nextFree = q.pairs.findIndex((_, i) => i !== activeLeft && !pairs.has(i));
        if (nextFree !== -1) setActiveLeft(nextFree);
        break;
      }
      case 'unpair':
        pair(activeLeft, null);
        break;
      case 'check':
        submit(false);
        break;
      case 'sure':
        submit(true);
        break;
      case 'next':
        next();
        break;
      case 'expand':
        setExpandAll(true);
        break;
      case 'read':
        readInNotes();
        break;
      case 'report':
        setReportOpen(true);
        break;
    }
  };

  const runRef = useRef(run);
  runRef.current = run;
  const state = {
    type: q.type,
    answered,
    optionCount: q.options.length,
    leftCount: q.pairs.length,
    reportOpen,
  };
  const stateRef = useRef(state);
  stateRef.current = state;

  // A layout effect, so the keys work from the render that shows the question, before the next key press.
  useLayoutEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || overlay.value !== null) return;
      const target = event.target;
      // A focused link, button or summary answers Enter itself, which keeps one action per key press.
      const native =
        event.key === 'Enter' &&
        !event.shiftKey &&
        target instanceof Element &&
        target.closest('a, button, summary') !== null;
      if (native) return;
      const command = runnerKey(
        {
          key: event.key,
          meta: event.metaKey,
          ctrl: event.ctrlKey,
          alt: event.altKey,
          shift: event.shiftKey,
          typing: isTyping(target),
          control: isControl(target),
          select: target instanceof HTMLSelectElement,
          at: event.timeStamp,
        },
        stateRef.current,
      );
      if (command === null) return;
      event.preventDefault();
      runRef.current(command);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <section class="runner" data-qid={q.id} aria-labelledby="stem">
      <p class="muted runner-position">
        {position} of {total}
      </p>
      <p id="stem" class="stem" tabIndex={-1} ref={stem}>
        {q.stem}
      </p>
      {answered ? (
        <Review q={q} order={order} feedback={feedback} expandAll={expandAll} wasSure={wasSure} />
      ) : q.type === 'match' ? (
        <MatchForm
          q={q}
          order={order}
          pairs={pairs}
          activeLeft={activeLeft}
          onPair={pair}
          onFocusLeft={setActiveLeft}
        />
      ) : (
        <fieldset class="options" aria-labelledby="stem">
          {order.map((id, i) => {
            const option = q.options.find((o) => o.id === id);
            if (option === undefined) return null;
            return (
              <label key={id} class={`option${choice.includes(id) ? ' chosen' : ''}`}>
                <input
                  type={q.type === 'single' ? 'radio' : 'checkbox'}
                  name={`q-${q.id}`}
                  value={id}
                  checked={choice.includes(id)}
                  onChange={() => choose(id)}
                />
                <span class="option-n" aria-hidden="true">
                  {i + 1}
                </span>
                <span class="option-text">{option.text}</span>
              </label>
            );
          })}
        </fieldset>
      )}
      <p class="visually-hidden" aria-live="polite">
        {announce}
      </p>
      {answered && (
        <div class="after">
          {q.takeaway !== '' && <p class="takeaway">{q.takeaway}</p>}
          <p>
            <a
              href={q.read.route}
              onClick={(event) => {
                event.preventDefault();
                readInNotes();
              }}
            >
              Read in notes
            </a>{' '}
            <kbd>o</kbd>
          </p>
        </div>
      )}
      {/* The bar is a child of the runner itself, so on a phone it sticks while any part of the question shows. */}
      {answered ? (
        <div class="submit-bar">
          <button ref={nextButton} class="button" type="button" disabled={!stored} onClick={next}>
            Next <kbd>Enter</kbd>
          </button>
        </div>
      ) : (
        <div class="submit-bar">
          <button class="button" type="button" disabled={!ready} onClick={() => submit(false)}>
            Check <kbd>Enter</kbd>
          </button>
          <button class="button" type="button" disabled={!ready} onClick={() => submit(true)}>
            Sure <kbd>Shift+Enter</kbd>
          </button>
          <span class="muted submit-hint">{SURE_HINT}</span>
        </div>
      )}
      {reportOpen ? (
        <Report q={q} onClose={() => setReportOpen(false)} />
      ) : (
        <p>
          <button class="link-button" type="button" onClick={() => setReportOpen(true)}>
            Report a problem
          </button>{' '}
          <kbd>!</kbd>
        </p>
      )}
    </section>
  );
}

function MatchForm({
  q,
  order,
  pairs,
  activeLeft,
  onPair,
  onFocusLeft,
}: {
  q: QuestionView;
  order: readonly string[];
  pairs: ReadonlyMap<number, string>;
  activeLeft: number;
  onPair: (left: number, right: string | null) => void;
  onFocusLeft: (left: number) => void;
}) {
  const rightText = (id: string): string => q.pairs[Number(id.slice(1)) - 1]?.right ?? '';
  return (
    <div class="match">
      <ol class="match-rights" aria-label="Answers to pair">
        {order.map((id, i) => (
          <li key={id} class="match-right">
            <span class="option-n">{LETTERS[i]}</span>
            <span>{rightText(id)}</span>
          </li>
        ))}
      </ol>
      <fieldset class="options" aria-labelledby="stem">
        {q.pairs.map((p, i) => {
          const selectId = `match-${q.id}-${i}`;
          return (
            <div key={p.left} class={`match-row${i === activeLeft ? ' active' : ''}`}>
              <label for={selectId}>
                <span class="option-n" aria-hidden="true">
                  {i + 1}
                </span>
                <span class="option-text">{p.left}</span>
              </label>
              <select
                id={selectId}
                value={pairs.get(i) ?? ''}
                onFocus={() => onFocusLeft(i)}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  onPair(i, value === '' ? null : value);
                }}
              >
                <option value="">Choose a match</option>
                {order.map((id, k) => (
                  <option key={id} value={id}>
                    {LETTERS[k]}. {rightText(id)}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </fieldset>
    </div>
  );
}

function Verdict({ correct }: { correct: boolean }) {
  return (
    <p class={`verdict ${correct ? 'ok' : 'bad'}`}>
      <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" focusable="false">
        {correct ? (
          <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2" />
        ) : (
          <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="2" />
        )}
      </svg>
      {correct ? 'Correct' : 'Incorrect'}
    </p>
  );
}

/** The first line of feedback for a concept answered wrong with Sure before (spec 3.1). */
function SureLastTime() {
  return <p class="misconception">You were sure last time</p>;
}

function Review({
  q,
  order,
  feedback,
  expandAll,
  wasSure,
}: {
  q: QuestionView;
  order: readonly string[];
  feedback: Feedback;
  expandAll: boolean;
  /** The concept carried a misconception as the question showed: say so first and pin every why open. */
  wasSure: boolean;
}) {
  if (q.type === 'match') {
    const chosen = new Map((feedback.picked as [string, string][]).map(([l, r]) => [l, r]));
    return (
      <>
        {wasSure && <SureLastTime />}
        <Verdict correct={feedback.correct} />
        <ul class="review">
          {q.pairs.map((p, i) => {
            const mine = chosen.get(leftId(i));
            const right = mine === rightId(i);
            const mineText = q.pairs[Number((mine ?? 'r0').slice(1)) - 1]?.right ?? '';
            return (
              <li key={p.left} class={`review-item ${right ? 'is-correct' : 'is-wrong'}`}>
                <p class="review-line">
                  <span class="option-n">{i + 1}</span>
                  <span class="option-text">
                    {p.left}: {p.right}
                  </span>
                </p>
                <p class="tags">
                  {right ? (
                    <span class="tag ok">Your answer, correct</span>
                  ) : (
                    <>
                      <span class="tag bad">Your answer: {mineText}</span>
                      <span class="tag ok">Correct answer: {p.right}</span>
                    </>
                  )}
                </p>
                <details open>
                  <summary>Why</summary>
                  <p>{p.why}</p>
                </details>
              </li>
            );
          })}
        </ul>
      </>
    );
  }
  const chosen = new Set(feedback.picked as string[]);
  return (
    <>
      {wasSure && <SureLastTime />}
      <Verdict correct={feedback.correct} />
      <ul class="review">
        {order.map((id, i) => {
          const option = q.options.find((o) => o.id === id);
          if (option === undefined) return null;
          const mine = chosen.has(id);
          return (
            <li
              key={id}
              class={`review-item${option.correct ? ' is-correct' : ''}${mine && !option.correct ? ' is-wrong' : ''}`}
            >
              <p class="review-line">
                <span class="option-n">{i + 1}</span>
                <span class="option-text">{option.text}</span>
              </p>
              {(mine || option.correct) && (
                <p class="tags">
                  {mine && <span class={`tag ${option.correct ? 'ok' : 'bad'}`}>Your answer</span>}
                  {option.correct && <span class="tag ok">Correct answer</span>}
                </p>
              )}
              <details open={expandAll || wasSure || mine || option.correct}>
                <summary>Why</summary>
                <p>{option.why}</p>
              </details>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Report({ q, onClose }: { q: QuestionView; onClose: () => void }) {
  const [reason, setReason] = useState<FlagReason | null>(null);
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => {
    first.current?.focus();
  }, []);

  if (sent) {
    return (
      <p class="report-done" role="status">
        Reported. It travels with your next backup.
      </p>
    );
  }
  return (
    <form
      class="report"
      aria-labelledby="report-title"
      onSubmit={(event) => {
        event.preventDefault();
        if (reason === null) return;
        const text = note.trim();
        void record({ t: 'flag', qid: q.id, qv: q.version, reason, ...(text === '' ? {} : { note: text }) });
        setSent(true);
      }}
    >
      <h2 id="report-title">Report a problem</h2>
      <fieldset class="report-reasons">
        <legend>What is wrong?</legend>
        {REASONS.map((r, i) => (
          <label key={r.id}>
            <input
              ref={i === 0 ? first : null}
              type="radio"
              name="report-reason"
              value={r.id}
              checked={reason === r.id}
              onChange={() => setReason(r.id)}
            />
            {r.label}
          </label>
        ))}
      </fieldset>
      <label class="report-note">
        Note (optional)
        <textarea rows={3} value={note} onInput={(event) => setNote(event.currentTarget.value)} />
      </label>
      <p class="muted">Question {q.id}</p>
      <div class="report-actions">
        <button class="button" type="submit" disabled={reason === null}>
          Send
        </button>
        <button class="link-button" type="button" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}
