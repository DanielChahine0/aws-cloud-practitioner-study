import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { ContentIndex, ModuleChunk, QuestionView } from '../../../schemas/chunks.ts';
import type { StudyEvent } from '../../../schemas/events.ts';
import { openSession, type SessionState } from '../../engine/replay.ts';
import { selectCheck, selectQuiz } from '../../engine/select.ts';
import { ulid } from '../../store/ulid.ts';
import { Breadcrumbs } from '../../ui/Breadcrumbs.tsx';
import { useTitle } from '../../ui/useTitle.ts';
import { ensureModule, modules } from '../content.ts';
import { isTyping } from '../keyboard.ts';
import { neighbors } from '../nav.ts';
import { newSessionSeed, progress, record, storeReady } from '../progress.ts';
import { pad2 } from '../router.ts';
import {
  canSubmit,
  displayOrder,
  endLine,
  homedConcepts,
  isCorrect,
  leftId,
  modeLabel,
  type Picked,
  rightId,
} from '../runner.ts';
import { type RunnerCommand, runnerKey } from '../runner-keys.ts';
import { highlight, navigate, overlay } from '../state.ts';
import { NotFound } from './NotFound.tsx';

type RunnerMode = 'check' | 'quiz';
type FlagReason = Extract<StudyEvent, { t: 'flag' }>['reason'];

interface Props {
  idx: ContentIndex;
  mode: RunnerMode;
  /** `m03/aws-lambda` for a lesson check, `m03` for a module quiz. */
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

/** Starts the session of this mode and scope, or finds the one in progress; null when nothing can be asked. */
function startOrResume(
  idx: ContentIndex,
  chunk: ModuleChunk,
  mode: RunnerMode,
  scope: string,
): string | null {
  const open = openSession(progress.peek(), mode, scope);
  if (open !== null) return open.sid;
  const seed = newSessionSeed();
  const pool = chunk.questions.map((q) => ({ id: q.id, concept: q.concept, note: q.note }));
  const slug = scope.split('/')[1] ?? '';
  const qids =
    mode === 'check'
      ? selectCheck({
          concepts: homedConcepts(idx, chunk, scope, slug),
          pool: pool.filter((q) => q.note === scope),
          progress: progress.peek(),
          seed,
        })
      : selectQuiz({ pool, progress: progress.peek(), seed });
  if (qids.length === 0) return null;
  const sid = ulid();
  void record({ t: 'session', sid, mode, phase: 'start', scope, seed, qids });
  return sid;
}

/** The runner `#/s/check/mNN/<slug>` and `#/s/quiz/mNN`: one question at a time, then the end line. */
export function Runner({ idx, mode, scope }: Props) {
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

  if (!known) return <NotFound hash={location.hash} />;

  const crumbs = [
    { label: 'Home', href: '#/' },
    { label: `Module ${module}: ${meta.short}`, href: `#/m/${pad2(module)}` },
    ...(lessonMeta === undefined
      ? []
      : [{ label: lessonMeta.title, href: `#/m/${pad2(module)}/l/${lessonMeta.slug}` }]),
    { label: modeLabel(mode), href: location.hash },
  ];
  const session = sid === null ? undefined : progress.value.sessions.get(sid);
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
      ) : chunk === undefined || session === undefined ? (
        <p class="muted">Loading</p>
      ) : (
        <Session idx={idx} chunk={chunk} session={session} mode={mode} module={module} slug={slug} />
      )}
    </>
  );
}

interface SessionProps {
  idx: ContentIndex;
  chunk: ModuleChunk;
  session: SessionState;
  mode: RunnerMode;
  module: number;
  slug: string | null;
}

function Session({ idx, chunk, session, mode, module, slug }: SessionProps) {
  const shipped = new Map(chunk.questions.map((q) => [q.id, q] as const));
  const qids = session.qids.filter((id) => shipped.has(id));
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const shownQid = feedback?.qid ?? qids.find((id) => !session.answers.has(id)) ?? null;
  const finished = shownQid === null;
  const submitted = useRef(session.submittedAt !== null);

  // Submits once every question has an answer: right after the last answer, or on resuming such a session.
  const finish = (): void => {
    if (submitted.current) return;
    submitted.current = true;
    void record({ t: 'session', sid: session.sid, mode, phase: 'submit', seed: session.seed });
    if (mode === 'check' && !progress.peek().lessonsDone.has(session.scope)) {
      void record({ t: 'lesson.done', note: session.scope });
    }
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;
  useEffect(() => {
    if (finished) finishRef.current();
  }, [finished]);

  if (shownQid === null) {
    const correct = qids.filter((id) => session.answers.get(id)?.correct === true).length;
    return <EndLine idx={idx} mode={mode} module={module} slug={slug} line={endLine(correct, qids.length)} />;
  }
  const q = shipped.get(shownQid);
  if (q === undefined) return null;
  return (
    <Question
      key={q.id}
      q={q}
      session={session}
      mode={mode}
      position={qids.indexOf(q.id) + 1}
      total={qids.length}
      feedback={feedback}
      onAnswered={(f) => {
        setFeedback(f);
        if (qids.every((id) => id === f.qid || session.answers.has(id))) finish();
      }}
      onNext={() => setFeedback(null)}
    />
  );
}

function EndLine({
  idx,
  mode,
  module,
  slug,
  line,
}: {
  idx: ContentIndex;
  mode: RunnerMode;
  module: number;
  slug: string | null;
  line: string;
}) {
  const next = slug === null ? null : neighbors(idx.modules, module, slug).next;
  return (
    <>
      <p class="end-line" aria-live="polite">
        {line}
      </p>
      <ul class="end-links">
        {mode === 'check' && slug !== null ? (
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
        ) : (
          <>
            <li>
              <a href={`#/m/${pad2(module)}`}>Back to Module {module}</a>
            </li>
            <li>
              <a href={`#/s/quiz/m${pad2(module)}`}>Another quiz</a>
            </li>
          </>
        )}
      </ul>
    </>
  );
}

interface QuestionProps {
  q: QuestionView;
  session: SessionState;
  mode: RunnerMode;
  position: number;
  total: number;
  feedback: Feedback | null;
  onAnswered: (f: Feedback) => void;
  onNext: () => void;
}

function Question({ q, session, mode, position, total, feedback, onAnswered, onNext }: QuestionProps) {
  const order = displayOrder(q, session.seed);
  const [choice, setChoice] = useState<string[]>([]);
  /** Match: left index to the right id it is paired with. */
  const [pairs, setPairs] = useState<ReadonlyMap<number, string>>(new Map());
  const [activeLeft, setActiveLeft] = useState(0);
  const [expandAll, setExpandAll] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
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
    });
    onAnswered({ qid: q.id, picked, correct });
    // Next takes focus once the answer is stored (spec 8.1 waits for the commit before showing Next).
    // The page stays where the reader is, with the verdict under the stem; on a phone Next sits in the sticky bar.
    void saved.then(() => nextButton.current?.focus({ preventScroll: true }));
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
        onNext();
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
        <Review q={q} order={order} feedback={feedback} expandAll={expandAll} />
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
        {feedback === null ? '' : feedback.correct ? 'Correct.' : 'Incorrect.'}
      </p>
      {answered ? (
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
          <div class="submit-bar">
            <button ref={nextButton} class="button" type="button" onClick={onNext}>
              Next <kbd>Enter</kbd>
            </button>
          </div>
        </div>
      ) : (
        <div class="submit-bar">
          <button class="button" type="button" disabled={!ready} onClick={() => submit(false)}>
            Check <kbd>Enter</kbd>
          </button>
          <button class="button" type="button" disabled={!ready} onClick={() => submit(true)}>
            Sure <kbd>Shift+Enter</kbd>
          </button>
          <span class="muted submit-hint">Press Sure when you are more than 71% sure.</span>
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

function Review({
  q,
  order,
  feedback,
  expandAll,
}: {
  q: QuestionView;
  order: readonly string[];
  feedback: Feedback;
  expandAll: boolean;
}) {
  if (q.type === 'match') {
    const chosen = new Map((feedback.picked as [string, string][]).map(([l, r]) => [l, r]));
    return (
      <>
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
                    <span class="tag bad">Your answer: {mineText}</span>
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
              <details open={expandAll || mine || option.correct}>
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
