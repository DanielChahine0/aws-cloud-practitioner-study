import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ContentIndex, LabView, QuestionView } from '../../../schemas/chunks.ts';
import type { NewEvent } from '../../../schemas/events.ts';
import type { ConfigureSpec, SimulateSpec, SortAction, SortSpec } from '../../../schemas/lab.ts';
import type { TraceAction, TraceSpec } from '../../../schemas/lab-trace.ts';
import { openSession } from '../../engine/replay.ts';
import type { ConfigureState } from '../../labs/configure/model.ts';
import { ConfigureView } from '../../labs/configure/View.tsx';
import { allPass, type GoalResult, replayLab } from '../../labs/contract.ts';
import { checkLab, type EngineEntry, engineOf } from '../../labs/engines.ts';
import type { SimulateState } from '../../labs/simulate/model.ts';
import { SimulateView } from '../../labs/simulate/View.tsx';
import type { SortState } from '../../labs/sort/model.ts';
import { SortView } from '../../labs/sort/View.tsx';
import type { TraceState } from '../../labs/trace/model.ts';
import { TraceView } from '../../labs/trace/View.tsx';
import { KV_KEYS } from '../../store/kv.ts';
import { ulid } from '../../store/ulid.ts';
import { Breadcrumbs } from '../../ui/Breadcrumbs.tsx';
import { useTitle } from '../../ui/useTitle.ts';
import { ensureModule, modules } from '../content.ts';
import { gPending, isControl, isTyping } from '../keyboard.ts';
import {
  CREDITS_NOTE,
  checkLabel,
  goalWord,
  hintLine,
  labCheckLine,
  labDoneLine,
  labLede,
  placedLine,
  RESET_ASK,
  returnedLine,
  ruleOffLine,
  ruleOnLine,
  traceRuleText,
} from '../lab.ts';
import { type LabDraft, labDraftOf, labDraftsOf, withDraft, withHint } from '../lab-draft.ts';
import { type LabCommand, labKey } from '../lab-keys.ts';
import { memory } from '../memory.ts';
import { kvRecords, newSessionSeed, progress, recordAll, storeReady, writeKv } from '../progress.ts';
import { badgeEarnedLine, badgesIn } from '../results.ts';
import { pad2, type Route, toHash } from '../router.ts';
import { labHolding, overlay } from '../state.ts';
import { NotFound } from './NotFound.tsx';
import { Session } from './Runner.tsx';

type LabRoute = Extract<Route, { kind: 'lab' }>;

/** A lab `#/m/NN/lab/<id>` (spec 5, 7.2): the brief, the workspace, the goals checked on demand, then the debrief. */
export function Lab({ idx, route }: { idx: ContentIndex; route: LabRoute }) {
  const meta = idx.modules.find((m) => m.n === route.module);
  useEffect(() => ensureModule(route.module), [route.module]);
  const chunk = modules.value.get(route.module);
  const lab = chunk?.labs.find((l) => l.id === route.id);
  const entry = lab === undefined ? null : engineOf(lab.engine);
  useTitle(lab === undefined ? 'Lab' : `Lab: ${lab.title}`);
  if (meta === undefined) return <NotFound hash={toHash(route)} />;
  if (chunk === undefined || !storeReady.value) return <p class="muted">Loading</p>;
  if (lab === undefined || entry === null) return <NotFound hash={toHash(route)} />;
  return <LabBody key={`${lab.id} ${lab.rev}`} idx={idx} short={meta.short} lab={lab} entry={entry} />;
}

interface BodyProps {
  idx: ContentIndex;
  short: string;
  lab: LabView;
  entry: EngineEntry;
}

/** The kv drafts as they are now, read without subscribing. */
const draftsNow = () => labDraftsOf(kvRecords.peek()[KV_KEYS.labDrafts]?.value);

function LabBody({ idx, short, lab, entry }: BodyProps) {
  const { engine } = entry;
  const [draft, setDraft] = useState<LabDraft>(
    () => labDraftOf(draftsNow(), lab.id, lab.rev) ?? { rev: lab.rev, actions: [], hints: [] },
  );
  const state = useMemo(() => replayLab(engine, lab.spec, draft.actions), [engine, lab.spec, draft.actions]);
  const [results, setResults] = useState<GoalResult[] | null>(null);
  const [shown, setShown] = useState<ReadonlySet<string>>(() => new Set(draft.hints));
  const [held, setHeldState] = useState<string | null>(null);
  const [asking, setAskingState] = useState(false);
  const [announce, setAnnounce] = useState('');
  const [debriefSid, setDebriefSid] = useState<string | null>(
    () => openSession(progress.peek(), 'debrief', lab.id)?.sid ?? null,
  );
  // What the keys and handlers read: a key may come before the render of the key before it, so every change lands here
  // at once, and the state above only renders it.
  const live = useRef({ draft, held, asking, done: debriefSid !== null });
  const busy = useRef(false);
  const debriefTitle = useRef<HTMLHeadingElement>(null);
  const keepWorking = useRef<HTMLButtonElement>(null);
  const resetButton = useRef<HTMLButtonElement>(null);
  const board = useRef<HTMLElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const done = debriefSid !== null;

  // Escape puts a held card down before it goes up a level: keys.ts reads this signal on the very next keydown.
  const setHeld = (card: string | null): void => {
    live.current.held = card;
    setHeldState(card);
    labHolding.value = card !== null;
  };
  const setAsking = (on: boolean): void => {
    live.current.asking = on;
    setAskingState(on);
  };
  const save = (next: LabDraft | null): void => {
    void writeKv(KV_KEYS.labDrafts, withDraft(draftsNow(), lab.id, next));
  };
  const update = (next: LabDraft): void => {
    live.current.draft = next;
    setDraft(next);
    save(next);
  };
  const dispatch = (action: unknown): void => {
    const now = live.current.draft;
    update({ ...now, actions: [...now.actions, action] });
  };

  const openHint = (goalId: string): void => {
    setShown((open) => new Set([...open, goalId]));
    const next = withHint(live.current.draft, goalId);
    if (next !== live.current.draft) update(next);
  };

  const check = async (): Promise<void> => {
    if (busy.current || live.current.done) return;
    const draft = live.current.draft;
    const settled = [...draft.actions, ...entry.settle];
    if (entry.settle.length > 0) update({ ...draft, actions: settled });
    const now = replayLab(engine, lab.spec, settled);
    const checked = checkLab(entry, lab.spec, now);
    setResults(checked);
    const met = checked.filter((r) => r.pass).length;
    if (!allPass(checked)) {
      setAnnounce(labCheckLine(met, checked.length, 0));
      return;
    }
    busy.current = true;
    const sid = ulid();
    const qids = lab.debrief.questions.map((q) => q.id);
    const events: NewEvent[] = [
      { t: 'lab.done', lab: lab.id, rev: lab.rev, hints: draft.hints.length },
      { t: 'session', sid, mode: 'debrief', phase: 'start', scope: lab.id, seed: newSessionSeed(), qids },
    ];
    const [labDone] = await recordAll(events);
    save(null);
    const xp = labDone === undefined ? 0 : (memory.peek()?.xpByEvent.get(labDone.id) ?? 0);
    setAnnounce(labCheckLine(met, checked.length, xp));
    setHeld(null);
    live.current.done = true;
    setDebriefSid(sid);
  };

  const reset = (): void => {
    update({ ...live.current.draft, actions: [] });
    setResults(null);
    setHeld(null);
    setAsking(false);
    requestAnimationFrame(() => resetButton.current?.focus());
  };

  useEffect(
    () => () => {
      labHolding.value = false;
    },
    [],
  );
  useLayoutEffect(() => {
    if (asking) keepWorking.current?.focus();
  }, [asking]);
  useLayoutEffect(() => {
    if (done) debriefTitle.current?.focus();
  }, [done]);
  // Each region (the tray, the buckets, the goals' hints) is one tab stop (spec 7.4): the item focused last in it, else
  // its first; the arrow keys move within it.
  useLayoutEffect(() => {
    for (const region of root.current?.querySelectorAll<HTMLElement>('[data-lab-region]') ?? []) {
      const items = [...region.querySelectorAll<HTMLElement>('[data-lab-item]')];
      const active = items.find((item) => item.tabIndex === 0) ?? items[0];
      for (const item of items) item.tabIndex = item === active ? 0 : -1;
    }
  });
  useLayoutEffect(() => {
    const el = root.current;
    if (el === null) return;
    const rove = (event: FocusEvent): void => {
      const item =
        event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-lab-item]') : null;
      const region = item?.closest('[data-lab-region]');
      if (item === null || item === undefined || region === null || region === undefined) return;
      for (const other of region.querySelectorAll<HTMLElement>('[data-lab-item]')) {
        other.tabIndex = other === item ? 0 : -1;
      }
    };
    el.addEventListener('focusin', rove);
    return () => el.removeEventListener('focusin', rove);
  }, []);

  const sort = lab.engine === 'sort' ? (lab.spec as SortSpec) : null;

  const place = (card: string, bucket: string): void => {
    if (sort === null) return;
    dispatch({ t: 'place', card, bucket } satisfies SortAction);
    setHeld(null);
    const text = sort.cards.find((c) => c.id === card)?.text ?? '';
    const label = sort.buckets.find((b) => b.id === bucket)?.label ?? '';
    setAnnounce(placedLine(text, label));
  };
  const onSortAction = (action: SortAction): void => {
    if (action.t === 'place') place(action.card, action.bucket);
    else dispatch(action);
  };
  /** A switched Trace rule is announced by its text, never its id. */
  const onTraceAction = (action: TraceAction): void => {
    dispatch(action);
    if (action.t !== 'toggle') return;
    const text = traceRuleText(lab.spec as TraceSpec, action.rule);
    if (text !== null) setAnnounce(action.on ? ruleOnLine(text) : ruleOffLine(text));
  };
  const onBoardAction = (action: unknown): void => {
    if (lab.engine === 'sort') onSortAction(action as SortAction);
    else if (lab.engine === 'trace') onTraceAction(action as TraceAction);
    else dispatch(action);
  };

  const run = (command: LabCommand): void => {
    switch (command.kind) {
      case 'check':
        void check();
        break;
      case 'hint': {
        const goal =
          lab.goals.find((g) => !(results?.find((r) => r.goalId === g.id)?.pass ?? false)) ?? lab.goals[0];
        if (goal === undefined) break;
        openHint(goal.id);
        const now = replayLab(engine, lab.spec, live.current.draft.actions);
        setAnnounce(hintLine(goal.hint, engine.hint(lab.spec, now, goal.id)));
        break;
      }
      case 'reset':
        setAsking(true);
        break;
      case 'place': {
        const bucket = sort?.buckets[command.bucket - 1];
        const card = live.current.held;
        if (card === null || bucket === undefined) break;
        place(card, bucket.id);
        // Sorting goes on from the tray's first card, or from the bucket once the tray is empty.
        requestAnimationFrame(() => {
          const next =
            board.current?.querySelector<HTMLElement>('.sort-tray [data-lab-item]') ??
            document.getElementById(`bucket-${bucket.id}`);
          next?.focus();
        });
        break;
      }
      case 'unplace': {
        const card = live.current.held;
        if (card === null || sort === null) break;
        dispatch({ t: 'unplace', card } satisfies SortAction);
        setHeld(null);
        setAnnounce(returnedLine(sort.cards.find((c) => c.id === card)?.text ?? ''));
        requestAnimationFrame(() =>
          board.current?.querySelector<HTMLElement>(`.sort-tray [data-card="${card}"]`)?.focus(),
        );
        break;
      }
      case 'drop':
        setHeld(null);
        break;
      case 'move': {
        const active = document.activeElement;
        const region = active instanceof HTMLElement ? active.closest('[data-lab-region]') : null;
        if (region === null) break;
        const items = [...region.querySelectorAll<HTMLElement>('[data-lab-item]')];
        const at = items.indexOf(active as HTMLElement);
        items[Math.min(items.length - 1, Math.max(0, at + command.delta))]?.focus();
        break;
      }
    }
  };
  const runRef = useRef(run);
  runRef.current = run;
  const shape = { engine: lab.engine, buckets: sort?.buckets.length ?? 0 };
  const boardKeys = useRef(shape);
  boardKeys.current = shape;

  // A layout effect, so the keys work from the first render of the board.
  useLayoutEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || overlay.value !== null) return;
      const target = event.target;
      const element = target instanceof Element ? target : null;
      const command = labKey(
        {
          key: event.key,
          meta: event.metaKey,
          ctrl: event.ctrlKey,
          alt: event.altKey,
          shift: event.shiftKey,
          typing: isTyping(target),
          control: isControl(target),
          select:
            target instanceof HTMLSelectElement ||
            (target instanceof HTMLInputElement && target.type === 'number'),
          at: event.timeStamp,
        },
        {
          engine: boardKeys.current.engine,
          holding: live.current.held !== null,
          bucketCount: boardKeys.current.buckets,
          inItems: element?.closest('[data-lab-item]') != null,
          // A button, link or summary keeps Enter for its own action; a card, a bucket target, a select or a
          // checkbox does not, so Enter checks from them.
          onControl:
            element !== null &&
            element.closest('a, button, summary') !== null &&
            element.closest('.card, .bucket-target') === null,
          gPending: gPending(event.timeStamp),
          confirmOpen: live.current.asking,
          done: live.current.done,
        },
      );
      if (command === null) return;
      event.preventDefault();
      runRef.current(command);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const doneBefore = progress.value.labsDone.get(lab.id);
  const shownResults =
    results ?? (done ? lab.goals.map((g) => ({ goalId: g.id, pass: true, message: '' })) : null);
  const session = debriefSid === null ? undefined : progress.value.sessions.get(debriefSid);
  const shipped = useMemo(
    () => new Map<string, QuestionView>(lab.debrief.questions.map((q) => [q.id, q])),
    [lab.debrief.questions],
  );
  const labHref = `#/m/${pad2(lab.module)}/lab/${lab.id}`;

  return (
    <div class="lab" ref={root}>
      <Breadcrumbs
        items={[
          { label: 'Home', href: '#/' },
          { label: `Module ${lab.module}: ${short}`, href: `#/m/${pad2(lab.module)}` },
          { label: `Lab: ${lab.title}`, href: labHref },
        ]}
      />
      <h1>{lab.title}</h1>
      <p class="muted lede">{labLede(lab.engine, lab.minutes)}</p>
      {doneBefore !== undefined && <p class="muted lab-done-line">{labDoneLine(doneBefore.day)}</p>}
      <p class="lab-brief">{lab.brief}</p>
      {lab.credits && <p class="muted credits-note">{CREDITS_NOTE}</p>}
      {!done && (
        <section class="lab-board" aria-label="Workspace" ref={board}>
          <Board lab={lab} state={state} held={held} onHold={setHeld} onAction={onBoardAction} />
        </section>
      )}
      <section class="lab-goals" aria-labelledby="lab-goals-title">
        <h2 id="lab-goals-title">Goals</h2>
        <ul class="goal-list" data-lab-region>
          {lab.goals.map((goal) => {
            const result = shownResults?.find((r) => r.goalId === goal.id) ?? null;
            const open = shown.has(goal.id);
            return (
              <li
                key={goal.id}
                class={`goal ${result === null ? 'is-unchecked' : result.pass ? 'is-met' : 'is-open'}`}
              >
                <p class="goal-line">
                  {result !== null && <GoalIcon pass={result.pass} />}
                  <span class="goal-word">{goalWord(result)}</span> {goal.label}
                  {result !== null && result.message !== '' && (
                    <span class="muted goal-message"> {result.message}</span>
                  )}
                </p>
                {!done && (
                  <button
                    type="button"
                    class="link-button"
                    aria-expanded={open}
                    data-lab-item
                    tabIndex={-1}
                    onClick={() =>
                      open ? setShown(new Set([...shown].filter((g) => g !== goal.id))) : openHint(goal.id)
                    }
                  >
                    Hint
                  </button>
                )}
                {!done && open && (
                  <p class="hint">{hintLine(goal.hint, engine.hint(lab.spec, state, goal.id))}</p>
                )}
              </li>
            );
          })}
        </ul>
        <LabBadgeLine idx={idx} eventId={doneBefore?.eventId ?? null} />
      </section>
      {!done && !asking && (
        <div class="lab-actions">
          <button type="button" class="button lab-button" onClick={() => void check()}>
            {checkLabel(lab.engine)} <kbd>Enter</kbd>
          </button>
          <button
            type="button"
            class="button button-quiet lab-button"
            ref={resetButton}
            onClick={() => setAsking(true)}
          >
            Reset <kbd>r</kbd>
          </button>
        </div>
      )}
      {!done && asking && (
        <fieldset class="lab-reset">
          <legend>{RESET_ASK}</legend>
          <button type="button" class="button lab-button" onClick={reset}>
            Reset
          </button>
          <button
            type="button"
            class="button button-quiet lab-button"
            ref={keepWorking}
            onClick={() => {
              setAsking(false);
              requestAnimationFrame(() => resetButton.current?.focus());
            }}
          >
            Keep working
          </button>
        </fieldset>
      )}
      <p class="visually-hidden" aria-live="polite">
        {announce}
      </p>
      {done && (
        <section class="lab-debrief" aria-labelledby="debrief-title">
          <h2 id="debrief-title" tabIndex={-1} ref={debriefTitle}>
            Debrief
          </h2>
          <ul class="debrief-lines">
            {lab.debrief.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p class="debrief-notes">
            {lab.notes.map((note) => (
              <a key={note.route} href={note.route}>
                Read in notes: {note.title}
              </a>
            ))}
          </p>
          {session !== undefined && (
            <Session
              idx={idx}
              shipped={shipped}
              pool={[]}
              session={session}
              mode="debrief"
              module={lab.module}
              slug={null}
            />
          )}
        </section>
      )}
    </div>
  );
}

/** The engine view for one lab; each engine's state comes from its own reducer. */
function Board(props: {
  lab: LabView;
  state: unknown;
  held: string | null;
  onHold(card: string | null): void;
  onAction(action: unknown): void;
}) {
  const { lab, state, held, onHold, onAction } = props;
  switch (lab.engine) {
    case 'sort':
      return (
        <SortView
          spec={lab.spec as SortSpec}
          state={state as SortState}
          held={held}
          onHold={onHold}
          onAction={onAction}
        />
      );
    case 'configure':
      return (
        <ConfigureView spec={lab.spec as ConfigureSpec} state={state as ConfigureState} onAction={onAction} />
      );
    case 'simulate':
      return (
        <SimulateView spec={lab.spec as SimulateSpec} state={state as SimulateState} onAction={onAction} />
      );
    case 'trace':
      return <TraceView spec={lab.spec as TraceSpec} state={state as TraceState} onAction={onAction} />;
  }
}

/** A goal's icon beside its word, so colour is never the only signal (spec 7.6). */
function GoalIcon({ pass }: { pass: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" focusable="false">
      {pass ? (
        <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2" />
      ) : (
        <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="2" />
      )}
    </svg>
  );
}

/** `Badge: Hands On` under the goals when the lab's first completion earned a badge (spec 3.10). */
function LabBadgeLine({ idx, eventId }: { idx: ContentIndex; eventId: string | null }) {
  const earned = memory.value?.badges;
  if (earned === undefined || eventId === null) return null;
  const names = badgesIn(earned, new Set([eventId])).map(
    (id) => idx.badges.find((b) => b.id === id)?.name ?? id,
  );
  return names.length === 0 ? null : <p class="badge-line">{badgeEarnedLine(names)}</p>;
}
