import { useState } from 'preact/hooks';
import type { ContentIndex } from '../../../schemas/chunks.ts';
import { hexBand } from '../../engine/mastery.ts';
import { reminderDue } from '../../store/backup.ts';
import { KV_KEYS } from '../../store/kv.ts';
import { HexMap } from '../../ui/HexMap.tsx';
import { useTitle } from '../../ui/useTitle.ts';
import { now } from '../clock.ts';
import { TARGET_EXAM_DATE } from '../config.ts';
import { examAskDue, examDateLabel, nextLabel, nothingDueLine, streakLine } from '../home.ts';
import { examAsk, mastery, memory, nextUp, queue, streak } from '../memory.ts';
import { events, progress, record, storeReady, writeKv } from '../progress.ts';
import { overlay } from '../state.ts';
import { lastExportAt } from './Progress.tsx';

const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Home `#/` (spec 7.2): the Next button, the streak reset line, the 13 hexes and at most one reminder line. */
export function Home({ idx }: { idx: ContentIndex }) {
  useTitle('Home');
  const byModule = mastery.value;
  const hexes = idx.modules.map((m) => {
    const value = byModule?.get(m.n) ?? 0;
    return { module: m.n, short: m.short, mastery: value, band: hexBand(value, false) };
  });
  return (
    <>
      <h1>AWS Cloud Practitioner Essentials</h1>
      <NextBlock idx={idx} />
      <StreakReset />
      <HexMap hexes={hexes} />
      <HomeLine idx={idx} />
      <p>
        <a href="#/missions">Missions: real AWS, done by hand</a>
      </p>
    </>
  );
}

/** The Next button (spec 4.6), or "Done for today" with when the next reviews fall due. */
function NextBlock({ idx }: { idx: ContentIndex }) {
  // Next waits for the stored log, so a returning reader never sees the first-run lesson flash past.
  const action = storeReady.value ? nextUp.value : null;
  if (action === null) return <div class="next-block" />;
  const { label, href, minutes } = nextLabel(action, idx);
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

const openProgress = (): void => {
  overlay.value = 'progress';
};

/** At most one line (spec 4.6): the exam date question, the backup reminder, or the first-run line. */
function HomeLine({ idx }: { idx: ContentIndex }) {
  if (!storeReady.value) return null;
  const examDate = memory.value?.examDate ?? null;
  if (examAskDue({ idx, lessonsDone: progress.value.lessonsDone, examDate, examAsk: examAsk.value })) {
    return <ExamQuestion />;
  }
  if (events.value.length === 0) {
    return (
      <p class="home-line">
        Progress lives in this browser.{' '}
        <button class="link-button" type="button" onClick={openProgress}>
          Import a backup
        </button>
      </p>
    );
  }
  const last = lastExportAt();
  const at = now.value;
  if (!reminderDue(events.value, last, at)) return null;
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
