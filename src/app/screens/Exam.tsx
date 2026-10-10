import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { ContentIndex, QuestionView } from '../../../schemas/chunks.ts';
import { bossDeadline, bossDraw } from '../../engine/boss.ts';
import { resolveConcept } from '../../engine/memory.ts';
import { mockDeadline, mockQids } from '../../engine/mock.ts';
import type { SessionState } from '../../engine/replay.ts';
import { recall } from '../../engine/srs.ts';
import { KV_KEYS } from '../../store/kv.ts';
import { ulid } from '../../store/ulid.ts';
import { useTitle } from '../../ui/useTitle.ts';
import { now } from '../clock.ts';
import { ensureExamForm } from '../content.ts';
import {
  type ExamCommand,
  examHashOf,
  examKey,
  examLabel,
  examPick,
  examPickable,
  REMIX_FORM,
} from '../exam.ts';
import {
  addTime,
  countsLine,
  type ExamDraft,
  examDraftOf,
  gridLabel,
  isAnswered,
  newDraft,
  pick,
  remixTargets,
  toggleFlag,
} from '../exam-session.ts';
import { examControls, examQuestions, loadModules, openExam, settleExam } from '../exam-settle.ts';
import { isControl, isTyping } from '../keyboard.ts';
import { learnPoolNow, practicePoolOf } from '../learn-pool.ts';
import { bosses, memory, memoryContent, taken } from '../memory.ts';
import { kvRecords, newSessionSeed, progress, record, storeReady, writeKv } from '../progress.ts';
import { pad2, type Route, toHash } from '../router.ts';
import { displayOrder } from '../runner.ts';
import { exam, examPosition, navigate, overlay } from '../state.ts';
import { NotFound } from './NotFound.tsx';

export type ExamRoute = Extract<Route, { kind: 'boss' } | { kind: 'mock' }>;

export const BOSS_LEDE = '15 questions, 21 minutes. The timer cannot pause.';
export const MOCK_LOAD_ERROR = 'This mock could not load. Check your connection and try again.';
export const REMIX_LEDE =
  '65 questions from forms you have taken. No XP, and it does not count toward readiness or rank.';
const START_ERROR = 'This exam could not load. Check your connection and try again.';
const SUBMIT_ERROR = 'The exam could not be submitted. Check your connection and try again.';

/** The concept a question tests, as memory keys it (aliases resolved); the raw id when memory does not know it. */
function memoryConcept(concept: string): string {
  const content = memoryContent.peek();
  return (content === null ? null : resolveConcept(content, concept)) ?? concept;
}

const cardOf = (concept: string) => memory.peek()?.concepts.get(memoryConcept(concept))?.card ?? null;

/** The boss `#/s/boss/mNN` and the mocks `#/s/mock/a` to `d` and `remix`: a start screen, then the exam shell. */
export function Exam({ idx, route }: { idx: ContentIndex; route: ExamRoute }) {
  const shown = useRef<string | null>(null);
  const ready = storeReady.value;
  const p = progress.value;
  const open = ready ? openExam(p) : null;
  const mine = open !== null && examHashOf(open) === toHash(route) ? open : null;
  const done = mine === null && shown.current !== null ? p.sessions.get(shown.current) : undefined;
  const finished = done !== undefined && done.submittedAt !== null;
  if (mine !== null) shown.current = mine.sid;
  // Whoever settled the exam (Submit, the deadline, another tab), its screen moves on to the results.
  useEffect(() => {
    if (finished && done !== undefined) navigate(toHash({ kind: 'results', sid: done.sid }));
  }, [finished, done]);
  if (route.kind === 'boss' && !idx.modules.some((m) => m.n === route.module)) {
    return <NotFound hash={toHash(route)} />;
  }
  if (!ready || finished) return <p class="muted">Loading</p>;
  if (mine !== null) return <ExamRun key={mine.sid} idx={idx} session={mine} />;
  return <ExamStart idx={idx} route={route} open={open} />;
}

function ExamStart({ idx, route, open }: { idx: ContentIndex; route: ExamRoute; open: SessionState | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const meta = route.kind === 'boss' ? idx.modules.find((m) => m.n === route.module) : undefined;
  const form = route.kind === 'mock' && route.form !== 'remix' ? route.form.toUpperCase() : null;
  const title =
    route.kind === 'boss' ? `Boss: ${meta?.short ?? ''}` : form === null ? 'Remix mock' : `Mock ${form}`;
  useTitle(title);
  const size = Object.values(idx.exam.items).filter((i) => i.form === form).length;
  // A form with no live items yet shows only `This mock is not ready yet.`, never `0 questions`.
  const lede =
    route.kind === 'boss'
      ? BOSS_LEDE
      : form === null
        ? REMIX_LEDE
        : size > 0
          ? `${size} questions, 90 minutes. The timer cannot pause.`
          : null;
  const blocked = blockedLine(idx, route, form);

  async function start(): Promise<void> {
    setBusy(true);
    setError(null);
    const problem = await startExam(idx, route, form);
    if (problem !== null) {
      setError(problem);
      setBusy(false);
    }
  }

  return (
    <section class="exam-start" aria-labelledby="exam-title">
      <h1 id="exam-title">{title}</h1>
      {lede !== null && <p class="lede">{lede}</p>}
      {open !== null ? (
        <p>
          <a class="button-link" href={examHashOf(open)}>
            Resume
          </a>{' '}
          <span class="muted">{examLabel(open, idx)} is open. One exam runs at a time.</span>
        </p>
      ) : blocked !== null ? (
        <p class="muted">{blocked}</p>
      ) : (
        <p>
          <button class="button" type="button" disabled={busy} onClick={() => void start()}>
            {route.kind === 'boss'
              ? 'Start the boss'
              : form === null
                ? 'Start the remix'
                : `Start Mock ${form}`}
          </button>
        </p>
      )}
      {error !== null && <p role="alert">{error}</p>}
    </section>
  );
}

/** Why this exam cannot start now, or null. */
function blockedLine(idx: ContentIndex, route: ExamRoute, form: string | null): string | null {
  if (route.kind === 'boss') {
    const status = bosses.value.get(route.module);
    if (status === undefined || !status.unlocked) {
      return `Opens after you read every lesson of Module ${route.module}.`;
    }
    if (status.cooldownUntil !== null) {
      const hours = Math.max(
        1,
        Math.ceil((Date.parse(status.cooldownUntil) - now.value.getTime()) / 3_600_000),
      );
      return `The next boss opens in ${hours} h.`;
    }
    return null;
  }
  if (form === null) return taken.value.size < 4 ? 'Opens after you take all four mocks.' : null;
  return idx.exam.forms.some((f) => f.id === form) ? null : 'This mock is not ready yet.';
}

/** Draws and records the start of a boss, a mock or a remix; returns the line to show when it cannot. */
async function startExam(idx: ContentIndex, route: ExamRoute, form: string | null): Promise<string | null> {
  const seed = newSessionSeed();
  let start: Parameters<typeof record>[0];
  const sid = ulid();
  if (route.kind === 'boss') {
    const n = route.module;
    const chunks = await loadModules(Array.from({ length: n }, (_, i) => i + 1));
    if (chunks === null) return START_ERROR;
    await Promise.all([...taken.peek()].map((f) => ensureExamForm(f)));
    const at = new Date();
    const qids = bossDraw({
      module: n,
      pool: learnPoolNow(practicePoolOf(chunks, memoryConcept)),
      lessons: (idx.modules.find((m) => m.n === n)?.lessons ?? []).map((l) => `m${pad2(n)}/${l.slug}`),
      progress: progress.peek(),
      recall: (concept) => {
        const card = cardOf(concept);
        return card === null ? 0 : recall(card, at);
      },
      studied: (concept) => cardOf(concept) !== null,
      now: at,
      seed,
    });
    if (qids.length === 0) return 'No questions for this boss yet.';
    start = {
      t: 'session',
      sid,
      mode: 'boss',
      phase: 'start',
      scope: `m${pad2(n)}`,
      seed,
      qids,
      deadline: bossDeadline(at),
    };
  } else if (form !== null) {
    const chunk = await ensureExamForm(form);
    if (chunk === null) return MOCK_LOAD_ERROR;
    const live = new Set(Object.keys(idx.exam.items).filter((id) => idx.exam.items[id]?.form === form));
    const qids = mockQids(
      chunk.questions.map((q) => q.id),
      live,
      seed,
    );
    start = {
      t: 'session',
      sid,
      mode: 'mock',
      phase: 'start',
      seed,
      form,
      qids,
      deadline: mockDeadline(new Date()),
    };
  } else {
    const forms = [...taken.peek()];
    const chunks = await Promise.all(forms.map((f) => ensureExamForm(f)));
    if (chunks.some((c) => c === null)) return MOCK_LOAD_ERROR;
    const { remixQids } = await import('../../engine/remix.ts');
    const items = Object.entries(idx.exam.items)
      .filter(([, i]) => forms.includes(i.form))
      .map(([id, i]) => ({ id, concept: i.concept, task: i.task, type: i.type }));
    const qids = remixQids({ items, targets: remixTargets(idx.exam.items), seed });
    if (qids === null) return 'The remix could not be built from these forms.';
    start = {
      t: 'session',
      sid,
      mode: 'mock',
      phase: 'start',
      seed,
      form: REMIX_FORM,
      qids,
      deadline: mockDeadline(new Date()),
    };
  }
  // Another tab or screen may have opened an exam while the chunks loaded; one exam runs at a time.
  if (openExam(progress.peek()) !== null) return null;
  await writeKv(KV_KEYS.examSession, newDraft(sid));
  await record(start);
  return null;
}

type View = 'question' | 'grid' | 'review';

function ExamRun({ idx, session }: { idx: ContentIndex; session: SessionState }) {
  const label = examLabel(session, idx);
  useTitle(label);
  const qids = session.qids;
  const [questions, setQuestions] = useState<ReadonlyMap<string, QuestionView> | null>(null);
  const [failed, setFailed] = useState(false);
  const [draft, setDraft] = useState<ExamDraft>(
    () => examDraftOf(kvRecords.peek()[KV_KEYS.examSession]?.value, session.sid) ?? newDraft(session.sid),
  );
  const [view, setView] = useState<View>('question');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const shownAt = useRef(Date.now());
  const confirm = useRef<HTMLDialogElement>(null);
  const current = Math.min(draft.current, Math.max(0, qids.length - 1));
  const qid = qids[current] ?? '';
  const q = questions?.get(qid);
  const order = q === undefined ? [] : displayOrder(q, session.seed);

  useEffect(() => {
    let live = true;
    void examQuestions(session).then((loaded) => {
      if (!live) return;
      if (loaded === null) setFailed(true);
      else setQuestions(loaded);
    });
    return () => {
      live = false;
    };
  }, [session]);

  useEffect(() => {
    exam.value = { sid: session.sid, label, total: qids.length, deadline: session.deadline ?? '' };
    return () => {
      exam.value = null;
    };
  }, [session.sid, label, qids.length, session.deadline]);

  useEffect(() => {
    examPosition.value = current + 1;
  }, [current]);

  useEffect(() => {
    const el = confirm.current;
    if (el === null) return;
    if (confirmOpen && !el.open) el.showModal();
    if (!confirmOpen && el.open) el.close();
  }, [confirmOpen]);

  /** Writes the draft to kv on every change, so a reload restores the position, picks and flags. */
  const save = (next: ExamDraft): void => {
    setDraft(next);
    void writeKv(KV_KEYS.examSession, next);
  };
  /** The draft with the time on the current question added, and the clock restarted for the next one. */
  const timed = (d: ExamDraft): ExamDraft => {
    const at = Date.now();
    const next = addTime(d, qid, at - shownAt.current);
    shownAt.current = at;
    return next;
  };
  const go = (index: number): void => {
    save({ ...timed(draft), current: Math.min(Math.max(0, index), qids.length - 1) });
    setView('question');
  };
  const choose = (id: string): void => {
    if (q === undefined) return;
    const picked = examPick(q, draft.picks[qid] ?? [], id);
    if (picked !== null) save(pick(draft, qid, picked));
  };
  const flag = (): void => save(toggleFlag(draft, qid));
  const toggleGrid = (): void => setView(view === 'grid' ? 'question' : 'grid');
  async function submit(): Promise<void> {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(false);
    save(timed(draft));
    const recorded = await settleExam(session.sid, new Date());
    setConfirmOpen(false);
    if (!recorded && progress.peek().sessions.get(session.sid)?.submittedAt === null) {
      setSubmitError(true);
      setSubmitting(false);
    }
  }

  const run = (command: ExamCommand): void => {
    switch (command.kind) {
      case 'choose': {
        const id = order[command.n - 1];
        if (id !== undefined && view === 'question') choose(id);
        break;
      }
      case 'prev':
        if (view === 'question') go(current - 1);
        break;
      case 'next':
        if (view === 'question') go(current + 1);
        break;
      case 'flag':
        flag();
        break;
      case 'grid':
        toggleGrid();
        break;
      case 'submit':
        setConfirmOpen(true);
        break;
    }
  };
  const latest = useRef({ run, optionCount: order.length, confirmOpen, gridOpen: view === 'grid' });
  latest.current = { run, optionCount: order.length, confirmOpen, gridOpen: view === 'grid' };

  useEffect(() => {
    examControls.value = {
      flag,
      grid: toggleGrid,
      flagged: draft.flagged.includes(qid),
      gridOpen: view === 'grid',
    };
  });
  useEffect(
    () => () => {
      examControls.value = null;
    },
    [],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (overlay.value !== null || event.defaultPrevented) return;
      const state = latest.current;
      const command = examKey(
        {
          key: event.key,
          meta: event.metaKey,
          ctrl: event.ctrlKey,
          alt: event.altKey,
          shift: event.shiftKey,
          typing: isTyping(event.target),
          control: isControl(event.target),
          at: event.timeStamp,
        },
        { optionCount: state.optionCount, confirmOpen: state.confirmOpen, gridOpen: state.gridOpen },
      );
      if (command === null) return;
      event.preventDefault();
      state.run(command);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const unanswered = qids.filter((id) => !isAnswered(draft, id)).length;
  const counts = countsLine(unanswered, draft.flagged.length);
  const grid = (
    <nav class="exam-grid" aria-label="Questions">
      <ol class="exam-grid-list">
        {qids.map((id, i) => {
          const answered = isAnswered(draft, id);
          const flagged = draft.flagged.includes(id);
          return (
            <li key={id}>
              <button
                type="button"
                class={`grid-cell${answered ? ' is-answered' : ''}${flagged ? ' is-flagged' : ''}`}
                aria-label={gridLabel(i + 1, answered, flagged)}
                aria-current={i === current ? 'true' : undefined}
                onClick={() => go(i)}
              >
                {i + 1}
                {flagged && (
                  <span class="grid-flag" aria-hidden="true">
                    F
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );

  let body = <p class="muted">Loading</p>;
  if (failed) body = <p role="alert">{START_ERROR}</p>;
  else if (view === 'grid') body = grid;
  else if (view === 'review') {
    body = (
      <section class="exam-review" aria-labelledby="review-title">
        <h2 id="review-title">Review</h2>
        {grid}
        <p class="exam-counts">{counts}</p>
        <p>
          <button class="button" type="button" onClick={() => setConfirmOpen(true)}>
            Submit
          </button>
        </p>
      </section>
    );
  } else if (questions !== null) {
    body = (
      <ExamQuestion
        key={qid}
        qid={qid}
        q={q}
        order={order}
        chosen={draft.picks[qid] ?? []}
        flagged={draft.flagged.includes(qid)}
        first={current === 0}
        last={current === qids.length - 1}
        onChoose={choose}
        onPrev={() => go(current - 1)}
        onNext={() => go(current + 1)}
        onFlag={flag}
        onReview={() => {
          save(timed(draft));
          setView('review');
        }}
      />
    );
  }

  return (
    <>
      <h1 class="visually-hidden">{label}</h1>
      {body}
      {submitError && <p role="alert">{SUBMIT_ERROR}</p>}
      <dialog
        ref={confirm}
        class="confirm"
        aria-labelledby="confirm-title"
        onClose={() => setConfirmOpen(false)}
      >
        <div class="sheet-body">
          <h2 id="confirm-title">Submit the exam?</h2>
          <p>{counts}</p>
          <p class="sheet-actions">
            <button class="button button-quiet" type="button" autofocus onClick={() => setConfirmOpen(false)}>
              Keep working
            </button>
            <button class="button" type="button" disabled={submitting} onClick={() => void submit()}>
              Submit
            </button>
          </p>
        </div>
      </dialog>
    </>
  );
}

interface ExamQuestionProps {
  qid: string;
  q: QuestionView | undefined;
  order: readonly string[];
  chosen: readonly string[];
  flagged: boolean;
  first: boolean;
  last: boolean;
  onChoose: (id: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onFlag: () => void;
  onReview: () => void;
}

/** One exam question; keyed by its id, so focus moves to the stem on every new question (spec 7.6). */
function ExamQuestion(props: ExamQuestionProps) {
  const { qid, q, order, chosen, flagged } = props;
  const stem = useRef<HTMLParagraphElement>(null);
  useLayoutEffect(() => {
    stem.current?.focus();
  }, []);
  return (
    <section class="exam" data-qid={qid} aria-labelledby="stem">
      <p id="stem" class="stem" tabIndex={-1} ref={stem}>
        {q?.stem ?? 'This question is not in this version of the content.'}
      </p>
      {q !== undefined && (
        <fieldset class="options" aria-labelledby="stem">
          {order.map((id, i) => {
            const option = q.options.find((o) => o.id === id);
            if (option === undefined) return null;
            return (
              <label key={id} class={`option${chosen.includes(id) ? ' chosen' : ''}`}>
                <input
                  type={q.type === 'single' ? 'radio' : 'checkbox'}
                  name={`q-${q.id}`}
                  value={id}
                  checked={chosen.includes(id)}
                  disabled={!examPickable(q, chosen, id)}
                  onChange={() => props.onChoose(id)}
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
      <div class="exam-nav">
        <button class="button button-quiet" type="button" disabled={props.first} onClick={props.onPrev}>
          Previous
        </button>
        <button class="button button-quiet" type="button" aria-pressed={flagged} onClick={props.onFlag}>
          Flag
        </button>
        {props.last ? (
          <button class="button" type="button" onClick={props.onReview}>
            Review and submit
          </button>
        ) : (
          <button class="button" type="button" onClick={props.onNext}>
            Next
          </button>
        )}
      </div>
    </section>
  );
}
