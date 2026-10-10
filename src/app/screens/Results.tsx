import { useEffect, useState } from 'preact/hooks';
import type { ContentIndex, QuestionView } from '../../../schemas/chunks.ts';
import { bossPassMark } from '../../engine/memory.ts';
import { domainBars } from '../../engine/mock.ts';
import { type Cause, type ExamResult, examsOf, type SessionState } from '../../engine/replay.ts';
import { useTitle } from '../../ui/useTitle.ts';
import { examLabel } from '../exam.ts';
import { examQuestions } from '../exam-settle.ts';
import { badges, memory, memoryContent } from '../memory.ts';
import { progress, record, storeReady } from '../progress.ts';
import {
  badgeEarnedLine,
  badgesIn,
  bossLine,
  CAUSE_LABELS,
  changedRightToWrong,
  domainLine,
  scoredLine,
  scoreLine,
  wrongOrder,
} from '../results.ts';
import { toHash } from '../router.ts';

export const NO_RESULT = 'This result is not in this browser.';

/** The results of a boss or mock `#/r/<sid>`: score, verdict or domain bars, then error review (spec 4.3 and 4.4). */
export function Results({ idx, sid }: { idx: ContentIndex; sid: string }) {
  const p = progress.value;
  const session = p.sessions.get(sid);
  const result = p.exams.get(sid);
  const title = session === undefined ? 'Results' : `${examLabel(session, idx)} results`;
  useTitle(title);
  if (!storeReady.value) return <p class="muted">Loading</p>;
  if (session === undefined || result === undefined) {
    return (
      <>
        <h1>Results</h1>
        <p>{NO_RESULT}</p>
        <p>
          <a href="#/">Back to Home</a>
        </p>
      </>
    );
  }
  return <ResultsBody idx={idx} session={session} result={result} title={title} />;
}

function ResultsBody({
  idx,
  session,
  result,
  title,
}: {
  idx: ContentIndex;
  session: SessionState;
  result: ExamResult;
  title: string;
}) {
  const [questions, setQuestions] = useState<ReadonlyMap<string, QuestionView> | null>(null);
  useEffect(() => {
    let live = true;
    void examQuestions(session).then((loaded) => {
      if (live) setQuestions(loaded ?? new Map());
    });
    return () => {
      live = false;
    };
  }, [session]);
  const xp = memory.value?.xpByEvent.get(result.submitId) ?? 0;
  const eventIds = new Set([result.submitId, ...[...session.answers.values()].map((a) => a.id)]);
  const earned = badgesIn(badges.value, eventIds).map(
    (id) => idx.badges.find((b) => b.id === id)?.name ?? id,
  );
  const module = Number(session.scope.slice(1));
  const firstPass =
    result.mode === 'boss' &&
    examsOf(progress.value, 'boss', session.scope).find((r) => r.correct >= bossPassMark(r.total))?.sid ===
      session.sid;
  const wrong = wrongOrder(
    session.qids
      .filter((qid) => session.answers.get(qid)?.correct !== true)
      .map((qid) => ({ qid, flagged: session.answers.get(qid)?.flagged === true })),
  );

  return (
    <>
      <h1>{title}</h1>
      <p class="score-line">{scoreLine(result)}</p>
      {result.mode === 'mock' ? (
        <MockSummary idx={idx} session={session} result={result} xp={xp} />
      ) : (
        <p>{bossLine(result, firstPass, xp)}</p>
      )}
      {earned.length > 0 && <p class="badge-line">{badgeEarnedLine(earned)}</p>}
      <h2>Wrong answers</h2>
      {wrong.length === 0 ? (
        <p>No wrong answers.</p>
      ) : questions === null ? (
        <p class="muted">Loading</p>
      ) : (
        <ol class="wrong-list">
          {wrong.map((qid) => (
            <WrongItem key={qid} sid={session.sid} qid={qid} q={questions.get(qid)} session={session} />
          ))}
        </ol>
      )}
      <ul class="end-links">
        <li>
          <a href="#/">Back to Home</a>
        </li>
        {result.mode === 'boss' && (
          <li>
            <a href={toHash({ kind: 'module', module })}>Back to Module {module}</a>
          </li>
        )}
      </ul>
    </>
  );
}

/** A mock's scored-items note, the timeout line, first-attempt XP and the domain bars (raw percentages only). */
function MockSummary({
  idx,
  session,
  result,
  xp,
}: {
  idx: ContentIndex;
  session: SessionState;
  result: ExamResult;
  xp: number;
}) {
  const taskOf = memoryContent.value?.examTasks ?? new Map<string, string>();
  return (
    <>
      <p class="muted">{scoredLine(result.total)}</p>
      {result.timedOut && <p>Time ran out.</p>}
      {xp > 0 && <p>+{xp} XP</p>}
      <div class="domain-bars">
        {domainBars(result, session, taskOf).map((row) => {
          const name = idx.blueprint.domains.find((d) => d.id === row.domain)?.name ?? `Domain ${row.domain}`;
          const width = row.total === 0 ? 0 : (100 * row.correct) / row.total;
          return (
            <div key={row.domain} class="domain-bar">
              <span class="domain-text">{domainLine(name, row.correct, row.total)}</span>
              <span class="domain-track" aria-hidden="true">
                <span
                  class="domain-fill"
                  style={{ width: `${width}%`, background: `var(--d${row.domain})` }}
                />
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function WrongItem({
  sid,
  qid,
  q,
  session,
}: {
  sid: string;
  qid: string;
  q: QuestionView | undefined;
  session: SessionState;
}) {
  const answer = session.answers.get(qid);
  const cause = progress.value.causes.get(`${sid} ${qid}`) ?? null;
  const picked = (answer?.picked ?? []) as string[];
  const choose = (value: Cause): void => {
    void record({ t: 'cause', sid, qid, cause: value });
  };
  return (
    <li class="wrong-item" data-qid={qid}>
      <p class="stem">{q?.stem ?? 'This question is not in this version of the content.'}</p>
      {q !== undefined && (
        <ul class="review">
          {q.options
            .filter((o) => o.correct || picked.includes(o.id))
            .map((o) => (
              <li key={o.id} class={`review-item ${o.correct ? 'is-correct' : 'is-wrong'}`}>
                <p class="review-line">
                  <span class="option-text">{o.text}</span>
                </p>
                <p class="tags">
                  {picked.includes(o.id) && (
                    <span class={`tag ${o.correct ? 'ok' : 'bad'}`}>Your answer</span>
                  )}
                  {o.correct && <span class="tag ok">Correct answer</span>}
                </p>
                <p class="why">{o.why}</p>
              </li>
            ))}
        </ul>
      )}
      {picked.length === 0 && <p class="muted">Not answered.</p>}
      {answer !== undefined && q !== undefined && changedRightToWrong(answer, q) && (
        <p class="tags">
          <span class="tag auto">Changed right to wrong</span>
        </p>
      )}
      <fieldset class="causes">
        <legend class="visually-hidden">Why was this wrong?</legend>
        {(Object.keys(CAUSE_LABELS) as Cause[]).map((key) => (
          <button
            key={key}
            type="button"
            class="button button-quiet cause"
            aria-pressed={cause === key}
            onClick={() => choose(key)}
          >
            {CAUSE_LABELS[key]}
          </button>
        ))}
      </fieldset>
    </li>
  );
}
