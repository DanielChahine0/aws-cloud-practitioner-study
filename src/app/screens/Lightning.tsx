import { effect } from '@preact/signals';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ContentIndex, ModuleChunk, QuestionView } from '../../../schemas/chunks.ts';
import { studyDay, tzOffset } from '../../engine/day.ts';
import {
  LIGHTNING_SCOPE,
  lightningDeadline,
  lightningOpen,
  missedConcepts,
  selectLightning,
  settledConcepts,
} from '../../engine/lightning.ts';
import { isDue, type MemoryState, resolveConcept, sessionSummary } from '../../engine/memory.ts';
import { type AnswerRecord, openSession, type SessionState } from '../../engine/replay.ts';
import { ulid } from '../../store/ulid.ts';
import { Breadcrumbs } from '../../ui/Breadcrumbs.tsx';
import { useTitle } from '../../ui/useTitle.ts';
import { now } from '../clock.ts';
import { loadModules } from '../exam-settle.ts';
import { isControl, isTyping } from '../keyboard.ts';
import { practicePoolOf } from '../learn-pool.ts';
import {
  clockText,
  LIGHTNING_LEDE,
  LIGHTNING_LOAD_ERROR,
  LIGHTNING_LOCKED,
  LIGHTNING_START,
  LIGHTNING_UNPAID,
  missLine,
  paidToday,
  roundEndEvents,
} from '../lightning.ts';
import { settleLightning } from '../lightning-settle.ts';
import { memory, memoryContent } from '../memory.ts';
import { newSessionSeed, progress, record, recordAll, storeReady } from '../progress.ts';
import { displayOrder, endSummaryLine, isCorrect } from '../runner.ts';
import { runnerKey } from '../runner-keys.ts';
import { overlay } from '../state.ts';

const CRUMBS = [
  { label: 'Home', href: '#/' },
  { label: 'Lightning round', href: '#/s/lightning' },
];

/** The memory key of a concept id, as the pool and the cards use it. */
function memoryConcept(concept: string): string {
  const content = memoryContent.peek();
  return (content === null ? null : resolveConcept(content, concept)) ?? concept;
}

/**
 * The modules whose chunks a visit needs: every module for a round opened before this visit, whose items may sit in
 * any of them, else the modules that home a settled concept, so the pool is whole on a cold start.
 */
function modulesFor(idx: ContentIndex, memory: MemoryState, resumed: boolean): number[] {
  if (resumed) return idx.modules.map((m) => m.n);
  const content = memoryContent.peek();
  const homes = new Set<number>();
  for (const id of settledConcepts(memory)) {
    const module = content?.concepts.get(id)?.module;
    if (module !== undefined) homes.add(module);
  }
  return [...homes].sort((a, b) => a - b);
}

/** The lightning round `#/s/lightning` (spec 4.1): the start screen, a 90 second round, then its summary. */
export function Lightning({ idx }: { idx: ContentIndex }) {
  useTitle('Lightning round');
  const mem = memory.value;
  const [sid, setSid] = useState<string | null>(null);
  const [chunks, setChunks] = useState<readonly ModuleChunk[] | null | undefined>(undefined);
  const asked = useRef(false);

  useEffect(
    () =>
      effect(() => {
        const m = memory.value;
        if (!storeReady.value || m === null || asked.current) return;
        asked.current = true;
        const open = openSession(progress.peek(), 'lightning', LIGHTNING_SCOPE);
        if (open !== null) setSid(open.sid);
        void loadModules(modulesFor(idx, m, open !== null)).then(setChunks);
      }),
    [idx],
  );

  const shipped = useMemo(() => {
    const out = new Map<string, QuestionView>();
    for (const c of chunks ?? []) for (const q of c.questions) out.set(q.id, q);
    return out;
  }, [chunks]);

  const session = sid === null ? null : (progress.value.sessions.get(sid) ?? null);
  let body = <p class="muted">Loading</p>;
  if (chunks === null) body = <p role="alert">{LIGHTNING_LOAD_ERROR}</p>;
  else if (chunks !== undefined && mem !== null) {
    if (session === null) body = <Start memory={mem} chunks={chunks} onStart={setSid} />;
    else if (session.submittedAt === null && !session.abandoned)
      body = <Round session={session} shipped={shipped} />;
    else body = <Summary session={session} memory={mem} shipped={shipped} />;
  }
  return (
    <>
      <Breadcrumbs items={CRUMBS} />
      <h1>Lightning round</h1>
      {body}
    </>
  );
}

function Start({
  memory: mem,
  chunks,
  onStart,
}: {
  memory: MemoryState;
  chunks: readonly ModuleChunk[];
  onStart: (sid: string) => void;
}) {
  if (!lightningOpen(mem)) return <p class="lede">{LIGHTNING_LOCKED}</p>;
  const start = (): void => {
    const seed = newSessionSeed();
    const qids = selectLightning({
      pool: practicePoolOf(chunks, memoryConcept),
      concepts: settledConcepts(mem),
      progress: progress.peek(),
      seed,
    });
    if (qids.length === 0) return;
    const at = new Date();
    const sid = ulid();
    const deadline = lightningDeadline(at);
    void record(
      { t: 'session', sid, mode: 'lightning', phase: 'start', scope: LIGHTNING_SCOPE, seed, qids, deadline },
      at,
    );
    onStart(sid);
  };
  return (
    <>
      <p class="lede">{LIGHTNING_LEDE}</p>
      {paidToday(progress.value, studyDay(now.value)) && (
        <p class="muted lightning-unpaid">{LIGHTNING_UNPAID}</p>
      )}
      <p>
        <button type="button" class="button" onClick={start}>
          {LIGHTNING_START}
        </button>
      </p>
    </>
  );
}

/** The round: one item at a time, no feedback, until the deadline or the last item; then its end is recorded. */
function Round({ session, shipped }: { session: SessionState; shipped: ReadonlyMap<string, QuestionView> }) {
  const deadline = Date.parse(session.deadline ?? session.startedAt);
  const [t, setT] = useState(() => Date.now());
  const ended = useRef(false);
  const next = session.qids.find((qid) => shipped.has(qid) && !session.answers.has(qid)) ?? null;
  const over = t >= deadline || next === null;

  useEffect(() => {
    const id = setInterval(() => setT(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!over || ended.current) return;
    ended.current = true;
    // Past the deadline the shared settle closes every overdue round once; a round out of items closes itself.
    if (Date.now() >= deadline) void settleLightning(new Date());
    else void recordAll(roundEndEvents(session));
  }, [over, deadline, session]);

  const q = next === null ? undefined : shipped.get(next);
  if (over || q === undefined) return <p class="muted">Loading</p>;

  const answer = (picked: string[], ms: number): void => {
    if (Date.now() >= deadline) {
      setT(Date.now());
      return;
    }
    void record({
      t: 'answer',
      sid: session.sid,
      mode: 'lightning',
      qid: q.id,
      qv: q.version,
      concept: q.concept,
      picked,
      correct: isCorrect(q, picked),
      sure: false,
      ms,
    });
  };

  return (
    <>
      <div class="lightning-bar">
        <p class="muted runner-position">{session.answers.size} answered</p>
        <span class="lightning-clock" role="timer" aria-live="off">
          {clockText(deadline - t)}
        </span>
      </div>
      <Item key={q.id} q={q} seed={session.seed} onAnswer={answer} />
    </>
  );
}

/** One item: digits pick, `Enter` answers with Not sure, and the next item follows at once (no bet, no feedback). */
function Item({
  q,
  seed,
  onAnswer,
}: {
  q: QuestionView;
  seed: number;
  onAnswer: (picked: string[], ms: number) => void;
}) {
  const order = useMemo(() => displayOrder(q, seed), [q, seed]);
  const [choice, setChoice] = useState<string | null>(null);
  const stem = useRef<HTMLParagraphElement>(null);
  const shownAt = useRef(Date.now());
  const submit = (): void => {
    if (choice !== null) onAnswer([choice], Date.now() - shownAt.current);
  };
  const latest = useRef({ order, submit });
  latest.current = { order, submit };

  useLayoutEffect(() => {
    // Each item starts with focus on its stem (spec 7.5).
    stem.current?.focus({ preventScroll: true });
  }, []);

  useLayoutEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || overlay.value !== null) return;
      const target = event.target;
      const native =
        event.key === 'Enter' && target instanceof Element && target.closest('a, button') !== null;
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
          at: event.timeStamp,
        },
        {
          type: 'single',
          answered: false,
          optionCount: latest.current.order.length,
          leftCount: 0,
          reportOpen: false,
        },
      );
      if (command?.kind === 'choose') {
        event.preventDefault();
        setChoice(latest.current.order[command.n - 1] ?? null);
      } else if (command?.kind === 'check') {
        event.preventDefault();
        latest.current.submit();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <section class="runner lightning-item" data-qid={q.id} aria-labelledby="stem">
      <p id="stem" class="stem" tabIndex={-1} ref={stem}>
        {q.stem}
      </p>
      <fieldset class="options" aria-labelledby="stem">
        {order.map((id, i) => {
          const option = q.options.find((o) => o.id === id);
          if (option === undefined) return null;
          return (
            <label key={id} class={`option${choice === id ? ' chosen' : ''}`}>
              <input
                type="radio"
                name={`q-${q.id}`}
                value={id}
                checked={choice === id}
                onChange={() => setChoice(id)}
              />
              <span class="option-n" aria-hidden="true">
                {i + 1}
              </span>
              <span class="option-text">{option.text}</span>
            </label>
          );
        })}
      </fieldset>
      <div class="submit-bar">
        <button type="button" class="button" disabled={choice === null} onClick={submit}>
          Answer <kbd>Enter</kbd>
        </button>
      </div>
    </section>
  );
}

/** The end of a round (spec 4.1): the end line, how many misses went back into review, and every answer. */
function Summary({
  session,
  memory: mem,
  shipped,
}: {
  session: SessionState;
  memory: MemoryState;
  shipped: ReadonlyMap<string, QuestionView>;
}) {
  const content = memoryContent.value;
  if (content === null) return null;
  const at = now.value;
  const tz = tzOffset(at);
  const answers = [...session.answers.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const summary = sessionSummary(session, mem, content, at, tz);
  // A miss on a concept already answered today stays as it is (its one update of the day is spent), so count only
  // the misses that are due now.
  const back = missedConcepts(session).filter((c) => {
    const card = mem.concepts.get(memoryConcept(c))?.card ?? null;
    return card !== null && isDue(card, at, tz);
  });
  const line = missLine(back.length);
  return (
    <>
      <p class="end-line" aria-live="polite">
        {endSummaryLine({ ...summary, total: answers.length })}
      </p>
      {line !== null && <p class="muted lightning-misses">{line}</p>}
      <ol class="lightning-summary">
        {answers.map((a) => (
          <SummaryItem key={a.qid} answer={a} q={shipped.get(a.qid)} />
        ))}
      </ol>
      <ul class="end-links">
        <li>
          <a href="#/">Back to Home</a>
        </li>
        <li>
          <a href="#/s/lightning">Another round</a>
        </li>
      </ul>
    </>
  );
}

function SummaryItem({ answer, q }: { answer: AnswerRecord; q: QuestionView | undefined }) {
  if (q === undefined) return null;
  const mine = q.options.find((o) => (answer.picked as string[]).includes(o.id))?.text ?? '';
  const right = q.options.find((o) => o.correct)?.text ?? '';
  return (
    <li class={`review-item ${answer.correct ? 'is-correct' : 'is-wrong'}`} data-qid={q.id}>
      <p class={`verdict ${answer.correct ? 'ok' : 'bad'}`}>
        <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" focusable="false">
          {answer.correct ? (
            <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2" />
          ) : (
            <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="2" />
          )}
        </svg>
        {answer.correct ? 'Correct' : 'Incorrect'}
      </p>
      <p class="review-line">{q.stem}</p>
      <p class="tags">
        {answer.correct ? (
          <span class="tag ok">Your answer, correct</span>
        ) : (
          <>
            <span class="tag bad">Your answer: {mine}</span>
            <span class="tag ok">Correct answer: {right}</span>
          </>
        )}
      </p>
    </li>
  );
}
