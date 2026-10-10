/** The mission flow (spec 5.3), loaded on demand: Start, the step ticks, Verify, Cleaned up and the usage check. */
import { useState } from 'preact/hooks';
import type { MissionMeta } from '../../../schemas/chunks.ts';
import { studyDay } from '../../engine/day.ts';
import { GATE_MISSION, type MissionStatus, type MissionStep, planServices } from '../../engine/missions.ts';
import { adrKey, KV_KEYS } from '../../store/kv.ts';
import { now } from '../clock.ts';
import {
  allTicked,
  closedLine,
  creditsOf,
  ESTIMATE_DECISION,
  ESTIMATE_MISSION,
  estimateSaved,
  type FlowSlot,
  lockLine,
  missionAnnounce,
  missionAnnouncement,
  missionTicks,
  type PlanDraft,
  planDraftOf,
  planProblems,
  planRecordOf,
  savedLine,
  stageWord,
  startLabel,
  ticksCleared,
  usageButtonLabel,
  usageLine,
  usageSavedLine,
  verifyHint,
} from '../mission-copy.ts';
import { withTick } from '../mission-records.ts';
import { missionLogs, missionRefs, planRecord, statuses } from '../missions.ts';
import { kvRecords, record, writeKv } from '../progress.ts';

/** Records one mission step and announces it once the log shows it. */
function step(m: MissionMeta, n: number, s: MissionStep, credits?: number): void {
  void record(
    credits === undefined
      ? { t: 'mission', mission: m.id, step: s }
      : { t: 'mission', mission: m.id, step: s, credits },
  ).then(() => {
    const closed = statuses.peek().find((x) => x.id === m.id)?.stage === 'closed';
    missionAnnounce.value = s === 'usage-ok' && !closed ? usageSavedLine(n) : missionAnnouncement(n, s);
  });
}

/** True while an attempt is open and has not passed Verify, which is when steps tick and Verify shows. */
function verifying(m: MissionMeta, s: MissionStatus): boolean {
  if (s.stage !== 'started' && s.stage !== 'live' && s.stage !== 'overdue') return false;
  return missionLogs.value.get(m.id)?.attempts.at(-1)?.verified == null;
}

/** One slot of the mission flow, placed by the mission page after the section that `slot` names. */
export function MissionFlow({ mission, slot }: { mission: MissionMeta; slot: FlowSlot }) {
  const s = statuses.value.find((x) => x.id === mission.id);
  if (s === undefined) return null;
  switch (slot) {
    case 'start':
      return <StartSlot m={mission} s={s} />;
    case 'steps':
      return <StepsSlot m={mission} s={s} />;
    case 'verify':
      return verifying(mission, s) ? <VerifySlot m={mission} s={s} /> : null;
    case 'cleanup':
      return s.stage === 'live' || s.stage === 'overdue' ? (
        <div class="mission-flow">
          <button class="button" type="button" onClick={() => step(mission, s.n, 'cleaned')}>
            Cleaned up
          </button>
        </div>
      ) : null;
    case 'usage':
      return s.usageFrom !== null && (s.stage === 'cleaned' || s.stage === 'verified') ? (
        <UsageSlot m={mission} s={s} from={s.usageFrom} />
      ) : null;
  }
}

function StartSlot({ m, s }: { m: MissionMeta; s: MissionStatus }) {
  const lock = lockLine(s);
  return (
    <div class="mission-flow">
      <p class="mission-line">
        <span class={`stage-word stage-${s.stage}`}>{stageWord(s)}</span>
      </p>
      {lock !== null && <p class="muted mission-line">{lock}</p>}
      {s.stage === 'closed' && s.closedDay !== null && <p class="mission-line">{closedLine(s.closedDay)}</p>}
      {s.stage === 'ready' && (
        <button
          class="button"
          type="button"
          onClick={() => {
            void writeKv(KV_KEYS.missionTicks, ticksCleared(missionTicks.peek(), m.id));
            step(m, s.n, 'start');
          }}
        >
          {startLabel(s.n)}
        </button>
      )}
    </div>
  );
}

function StepsSlot({ m, s }: { m: MissionMeta; s: MissionStatus }) {
  const ticking = verifying(m, s) && m.steps.length > 0;
  const planForm = m.gate && (s.stage === 'started' || s.stage === 'closed');
  if (!ticking && !planForm) return null;
  const ticked = missionTicks.value[m.id] ?? [];
  return (
    <div class="mission-flow">
      {ticking && (
        <ul class="mission-ticks">
          {m.steps.map((st) => (
            <li key={st.id}>
              <label class="mission-tick">
                <input
                  type="checkbox"
                  checked={ticked.includes(st.id)}
                  onChange={(event) =>
                    void writeKv(
                      KV_KEYS.missionTicks,
                      withTick(missionTicks.peek(), m.id, st.id, event.currentTarget.checked),
                    )
                  }
                />
                Done: {st.title}
              </label>
            </li>
          ))}
        </ul>
      )}
      {planForm && <PlanForm />}
    </div>
  );
}

function VerifySlot({ m, s }: { m: MissionMeta; s: MissionStatus }) {
  const hint = verifyHint({
    allTicked: allTicked(m.steps, missionTicks.value[m.id] ?? []),
    needsPlan: m.id === GATE_MISSION,
    planSaved: planRecord.value !== null,
    needsEstimate: m.id === ESTIMATE_MISSION,
    estimateSaved: estimateSaved(kvRecords.value[adrKey(ESTIMATE_DECISION)]?.value),
  });
  const hintId = `${m.id}-verify-hint`;
  return (
    <div class="mission-flow">
      <button
        class="button"
        type="button"
        disabled={hint !== null}
        aria-describedby={hint === null ? undefined : hintId}
        onClick={() => step(m, s.n, 'verified')}
      >
        Verify
      </button>
      {hint !== null && (
        <p id={hintId} class="muted mission-line">
          {hint}
        </p>
      )}
    </div>
  );
}

function UsageSlot({ m, s, from }: { m: MissionMeta; s: MissionStatus; from: string }) {
  const [credits, setCredits] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const open = studyDay(now.value) >= from;
  return (
    <form
      class="mission-flow"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const amount = creditsOf(credits);
        if (amount === null) {
          setProblem('Enter the credits you have left.');
          return;
        }
        setProblem(null);
        step(m, s.n, 'usage-ok', amount);
      }}
    >
      <label class="date-field">
        Credits left ($)
        <input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={credits}
          disabled={!open}
          onInput={(event) => setCredits(event.currentTarget.value)}
        />
      </label>
      <button class="button" type="submit" disabled={!open}>
        {usageButtonLabel(m.keep)}
      </button>
      {!open && <p class="muted mission-line">{usageLine(from)}</p>}
      {problem !== null && (
        <p class="mission-problem" role="alert">
          {problem}
        </p>
      )}
    </form>
  );
}

/** The fields of the Plan status form, shared by Mission 0 and the Already done panel. */
export function PlanFields({ draft, onChange }: { draft: PlanDraft; onChange: (next: PlanDraft) => void }) {
  return (
    <fieldset class="plan-fields">
      <legend>Plan status</legend>
      <div class="plan-row">
        <label class="mission-tick">
          <input
            type="radio"
            name="plan"
            checked={draft.plan === 'free'}
            onChange={() => onChange({ ...draft, plan: 'free' })}
          />
          Free plan
        </label>
        <label class="mission-tick">
          <input
            type="radio"
            name="plan"
            checked={draft.plan === 'paid'}
            onChange={() => onChange({ ...draft, plan: 'paid' })}
          />
          Paid plan
        </label>
      </div>
      <div class="plan-row">
        <label class="date-field">
          Credits left ($)
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={draft.credits}
            onInput={(event) => onChange({ ...draft, credits: event.currentTarget.value })}
          />
        </label>
        <label class="date-field">
          Plan ends on
          <input
            type="date"
            value={draft.endsOn}
            onInput={(event) => onChange({ ...draft, endsOn: event.currentTarget.value })}
          />
        </label>
      </div>
      <fieldset class="plan-services">
        <legend>Services on your plan</legend>
        <ul class="mission-ticks">
          {Object.keys(draft.services).map((name) => (
            <li key={name}>
              <label class="mission-tick">
                <input
                  type="checkbox"
                  checked={draft.services[name] === true}
                  onChange={(event) =>
                    onChange({
                      ...draft,
                      services: { ...draft.services, [name]: event.currentTarget.checked },
                    })
                  }
                />
                {name}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
    </fieldset>
  );
}

/** Mission 0's Plan status form: it writes the kv `plan` record that plan fit reads (spec 5.3 rule 2, 8.1). */
function PlanForm() {
  const saved = planRecord.value;
  const [draft, setDraft] = useState<PlanDraft>(() => planDraftOf(saved, planServices(missionRefs.peek())));
  const [problems, setProblems] = useState<string[]>([]);
  return (
    <form
      class="plan-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const found = planProblems(draft);
        setProblems(found);
        if (found.length === 0) void writeKv(KV_KEYS.plan, planRecordOf(draft, new Date()));
      }}
    >
      <PlanFields draft={draft} onChange={setDraft} />
      {problems.length > 0 && (
        <ul class="mission-problem" role="alert">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <button class="button" type="submit">
        Save plan status
      </button>
      {saved !== null && <p class="muted mission-line">{savedLine(studyDay(new Date(saved.recordedAt)))}</p>}
    </form>
  );
}
