/** The one-time Already done panel on the Missions list (spec 8.1), shown while the log has no mission event. */
import { useState } from 'preact/hooks';
import { studyDay } from '../../engine/day.ts';
import { planServices } from '../../engine/missions.ts';
import { KV_KEYS } from '../../store/kv.ts';
import { type AlreadyDoneForm, alreadyDoneEvents, alreadyDoneProblems } from '../already-done.ts';
import { type PlanDraft, planDraftOf, planProblems, planRecordOf } from '../mission-copy.ts';
import { missionRefs } from '../missions.ts';
import { recordAt, writeKv } from '../progress.ts';
import { PlanFields } from './MissionFlow.tsx';

/** One labelled date field. */
function DateField({
  label,
  value,
  onInput,
}: {
  label: string;
  value: string;
  onInput: (value: string) => void;
}) {
  return (
    <label class="date-field">
      {label}
      <input type="date" value={value} onInput={(event) => onInput(event.currentTarget.value)} />
    </label>
  );
}

export function AlreadyDone() {
  const [mission0, setMission0] = useState('');
  const [mission1, setMission1] = useState(false);
  const [verified1, setVerified1] = useState('');
  const [usage1, setUsage1] = useState('');
  const [credits1, setCredits1] = useState('');
  const [plan, setPlan] = useState<PlanDraft>(() => planDraftOf(null, planServices(missionRefs.peek())));
  const [problems, setProblems] = useState<string[]>([]);
  return (
    <section class="already-done" aria-labelledby="already-done-title">
      <h2 id="already-done-title">Done some missions already?</h2>
      <p class="muted mission-line">
        Record the missions you finished by hand before this page could track them; this shows only once.
      </p>
      <form
        class="plan-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const at = new Date();
          const form: AlreadyDoneForm = {
            mission0,
            mission1,
            verified1,
            usage1,
            credits1,
            plan: planRecordOf(plan, at),
          };
          const found = [...alreadyDoneProblems(form, studyDay(at)), ...planProblems(plan)];
          setProblems(found);
          if (found.length > 0) return;
          void writeKv(KV_KEYS.plan, form.plan, at);
          void recordAt(alreadyDoneEvents(form));
        }}
      >
        <DateField label="Mission 0 finished on" value={mission0} onInput={setMission0} />
        <label class="mission-tick">
          <input
            type="checkbox"
            checked={mission1}
            onChange={(event) => setMission1(event.currentTarget.checked)}
          />
          Mission 1 is done too
        </label>
        {mission1 && (
          <div class="plan-row">
            <DateField label="Mission 1 verified on" value={verified1} onInput={setVerified1} />
            <DateField label="Mission 1 usage checked on" value={usage1} onInput={setUsage1} />
            <label class="date-field">
              Credits left that day ($)
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={credits1}
                onInput={(event) => setCredits1(event.currentTarget.value)}
              />
            </label>
          </div>
        )}
        <PlanFields draft={plan} onChange={setPlan} />
        {problems.length > 0 && (
          <ul class="mission-problem" role="alert">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        <button class="button" type="submit">
          Record them
        </button>
      </form>
    </section>
  );
}
