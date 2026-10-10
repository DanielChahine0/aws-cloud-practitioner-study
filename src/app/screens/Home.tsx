import { effect } from '@preact/signals';
import { useEffect, useState } from 'preact/hooks';
import type { ContentIndex } from '../../../schemas/chunks.ts';
import { studyDay } from '../../engine/day.ts';
import { hexBand } from '../../engine/mastery.ts';
import { nextRankLine } from '../../engine/ranks.ts';
import { goNoGo } from '../../engine/readiness.ts';
import { reminderDue } from '../../store/backup.ts';
import { KV_KEYS } from '../../store/kv.ts';
import { HexMap } from '../../ui/HexMap.tsx';
import { useTitle } from '../../ui/useTitle.ts';
import { now } from '../clock.ts';
import { TARGET_EXAM_DATE } from '../config.ts';
import {
  EXTRAS_JOIN,
  EXTRAS_LEAD,
  examAskDue,
  examDateLabel,
  extraLink,
  goNoGoLine,
  nextLabel,
  nothingDueLine,
  overdueLightning,
  readinessLine,
  reminderOf,
  streakLine,
  weakestLine,
} from '../home.ts';
import {
  bosses,
  examAsk,
  extraItems,
  mastery,
  memory,
  nextUp,
  queue,
  rank,
  rankFacts,
  ranks,
  readinessNow,
  streak,
} from '../memory.ts';
import { events, lastExportAt, progress, record, storeReady, writeKv } from '../progress.ts';
import { toHash } from '../router.ts';
import { overlay } from '../state.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Home `#/` (spec 7.2): the Next button, the streak reset line, the 13 hexes, readiness, the next rank, the
 * extras, at most one reminder line, and the ways to Missions and the mocks.
 */
export function Home({ idx }: { idx: ContentIndex }) {
  useTitle('Home');
  useLightningSettle();
  const ready = storeReady.value;
  const at = now.value;
  // Today's incident is picked on the first render of a study day and kept as an event (spec 4.5).
  // A load that fails (a reload while it is in flight, or offline without the chunk) offers nothing; the next render
  // tries again.
  // biome-ignore lint/correctness/useExhaustiveDependencies: Biome takes a signal's value for a constant import; it changes, so it is a dependency
  useEffect(() => {
    if (!ready) return;
    void import('../incident-offer.ts').then(
      (m) => m.offerIncident(at),
      () => undefined,
    );
  }, [ready, at]);
  const byModule = mastery.value;
  const statuses = storeReady.value ? bosses.value : null;
  const hexes = idx.modules.map((m) => {
    const value = byModule?.get(m.n) ?? 0;
    const status = statuses?.get(m.n);
    const passed = status?.passed === true;
    return {
      module: m.n,
      short: m.short,
      mastery: value,
      band: hexBand(value, passed),
      boss: passed ? ('passed' as const) : status?.ready === true ? ('ready' as const) : null,
    };
  });
  return (
    <>
      <h1>AWS Cloud Practitioner Essentials</h1>
      <NextBlock idx={idx} />
      <StreakReset />
      <HexMap hexes={hexes} />
      <ReadinessLines idx={idx} />
      <NextRank />
      <Extras idx={idx} />
      <HomeLine idx={idx} />
      <p>
        <a href="#/missions">Missions: real AWS, done by hand</a>
      </p>
      <p>
        <a href="#/s/mock">Mock exams</a>
      </p>
      <p>
        <a href="#/s/lightning">Lightning round</a>
      </p>
    </>
  );
}

/**
 * Settles a lightning round left open past its deadline (spec 4.1) once the store is ready, so a tab closed
 * mid-round still closes its session and queues its misses; the settle code loads only when one is found.
 */
function useLightningSettle(): void {
  useEffect(
    () =>
      effect(() => {
        if (!storeReady.value) return;
        const at = now.value;
        if (overdueLightning(progress.value, at).length === 0) return;
        void import('../lightning-settle.ts').then((m) => m.settleLightning(at));
      }),
    [],
  );
}

/** The Next button (spec 4.6), or "Done for today" with when the next reviews fall due. */
function NextBlock({ idx }: { idx: ContentIndex }) {
  // nextUp waits for the stored log, so a returning reader never sees the first-run lesson flash past.
  const action = nextUp.value;
  if (action === null) return <div class="next-block" />;
  const { label, href, minutes } = nextLabel(action, idx, now.value);
  if (href === null) {
    const q = queue.value;
    return (
      <div class="next-block">
        <p class="next-done">{label}</p>
        {q !== null && <p class="muted">{nothingDueLine(q, now.value)}</p>}
      </div>
    );
  }
  return (
    <div class="next-block">
      <a class="next" href={href} data-next>
        <span class="next-label">{label}</span>
        <span class="next-meta">
          {minutes !== null && <span>~{minutes} min</span>}
          <kbd class="next-key">Enter</kbd>
        </span>
      </a>
    </div>
  );
}

function StreakReset() {
  const s = storeReady.value ? streak.value : null;
  const line = s === null ? null : streakLine(s);
  return line === null ? null : <p class="muted streak-line">{line}</p>;
}

/** `Readiness 62  Close` and, when a task has at least 3 concepts, the weakest one as a focus quiz link (spec 3.9). */
function ReadinessLines({ idx }: { idx: ContentIndex }) {
  const r = storeReady.value ? readinessNow.value : null;
  if (r === null) return null;
  const weakest = r.weakest;
  const task = weakest === null ? undefined : idx.blueprint.tasks.find((t) => t.id === weakest.task);
  return (
    <>
      <p class="readiness-line">{readinessLine(r)}</p>
      {task !== undefined && (
        <p class="weakest-line">
          <a href={toHash({ kind: 'focus', scope: task.id })}>{weakestLine(task)}</a>
        </p>
      )}
    </>
  );
}

/** What the next rank needs (spec 3.4); nothing at the top rank. */
function NextRank() {
  const shown = storeReady.value && ranks.value.length > 0 ? rank.value : null;
  if (shown === null) return null;
  const r = readinessNow.value;
  const label = r === null || r.value === null ? '-' : r.label;
  const line = nextRankLine(ranks.value, shown, rankFacts.value, label);
  return line === null ? null : <p class="muted rank-line">{line}</p>;
}

/** Optional extras once Next is done for today (spec 4.6): a ready boss, the next mock, then a core lab. */
function Extras({ idx }: { idx: ContentIndex }) {
  const action = nextUp.value;
  const items = extraItems.value;
  if (action === null || action.kind !== 'done' || items.length === 0) return null;
  const links = items.map((e) => extraLink(e, idx));
  // The visible text equals `extrasLine(links)`, so its tested copy is the copy on screen.
  return (
    <p class="extras-line">
      {EXTRAS_LEAD}
      {links.map((link, i) => (
        <span key={link.href}>
          {i > 0 && <span aria-hidden="true">{EXTRAS_JOIN}</span>}
          <a href={link.href}>{link.label}</a>
        </span>
      ))}
    </p>
  );
}

const openProgress = (): void => {
  overlay.value = 'progress';
};

/**
 * At most one line (spec 4.6): the go/no-go reminder, the exam date question, the backup reminder, or the
 * first-run line, in that order.
 */
function HomeLine({ idx }: { idx: ContentIndex }) {
  if (!storeReady.value) return null;
  const examDate = memory.value?.examDate ?? null;
  const r = readinessNow.value;
  const at = now.value;
  const last = lastExportAt();
  const empty = events.value.length === 0;
  const which = reminderOf({
    'go-no-go': examDate !== null && r !== null && goNoGo({ examDate, today: studyDay(at), readiness: r }),
    'exam-ask': examAskDue({
      idx,
      lessonsDone: progress.value.lessonsDone,
      examDate,
      examAsk: examAsk.value,
    }),
    backup: !empty && reminderDue(events.value, last, at),
    'first-run': empty,
  });
  switch (which) {
    case 'go-no-go':
      return examDate === null || r === null ? null : (
        <p class="home-line go-no-go">{goNoGoLine(examDate, r.label)}</p>
      );
    case 'exam-ask':
      return <ExamQuestion />;
    case 'backup': {
      const days = last === null ? 0 : Math.floor((at.getTime() - new Date(last).getTime()) / DAY_MS);
      return (
        <p class="home-line">
          {last === null ? 'No backup yet.' : `Last backup ${days} days ago.`}{' '}
          <button class="link-button" type="button" onClick={openProgress}>
            Export a backup
          </button>
        </p>
      );
    }
    case 'first-run':
      return (
        <p class="home-line">
          Progress lives in this browser.{' '}
          <button class="link-button" type="button" onClick={openProgress}>
            Import a backup
          </button>
        </p>
      );
    case null:
      return null;
  }
}

/** The one-time exam date question (spec 7.5); Save writes a settings event, Not now a kv mark. */
function ExamQuestion() {
  const [date, setDate] = useState(TARGET_EXAM_DATE);
  const valid = ISO_DAY.test(date);
  return (
    <form
      class="home-line exam-ask"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) void record({ t: 'settings', patch: { examDate: date } });
      }}
    >
      <p class="exam-ask-question">
        No exam date yet. The plan targets{' '}
        <span class="exam-ask-date">{examDateLabel(TARGET_EXAM_DATE)}.</span>
      </p>
      <div class="exam-ask-row">
        <label class="date-field">
          Exam date
          <input type="date" value={date} required onInput={(event) => setDate(event.currentTarget.value)} />
        </label>
        <button class="button" type="submit" disabled={!valid}>
          Save
        </button>
        <button class="link-button" type="button" onClick={() => void writeKv(KV_KEYS.examAsk, 'dismissed')}>
          Not now
        </button>
      </div>
    </form>
  );
}
