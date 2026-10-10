import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ContentIndex, LabView, QuestionView } from '../../../schemas/chunks.ts';
import type { NewEvent } from '../../../schemas/events.ts';
import type { ConfigureSpec, SimulateSpec, SortAction, SortSpec } from '../../../schemas/lab.ts';
import type { PlaceAction, PlaceSpec } from '../../../schemas/lab-place.ts';
import { openSession } from '../../engine/replay.ts';
import type { ConfigureState } from '../../labs/configure/model.ts';
import { ConfigureView } from '../../labs/configure/View.tsx';
import { allPass, type GoalResult, replayLab } from '../../labs/contract.ts';
import { checkLab, type EngineEntry, engineOf } from '../../labs/engines.ts';
import { type PlaceState, placeSlots } from '../../labs/place/model.ts';
import { PlaceView } from '../../labs/place/View.tsx';
import type { SimulateState } from '../../labs/simulate/model.ts';
import { SimulateView } from '../../labs/simulate/View.tsx';
import type { SortState } from '../../labs/sort/model.ts';
import { SortView } from '../../labs/sort/View.tsx';
import { KV_KEYS } from '../../store/kv.ts';
import { ulid } from '../../store/ulid.ts';
import { Breadcrumbs } from '../../ui/Breadcrumbs.tsx';
import { useTitle } from '../../ui/useTitle.ts';
import { ensureModule, modules } from '../content.ts';
import { gPending, isControl, isTyping } from '../keyboard.ts';
import {
  backLine,
  CREDITS_NOTE,
  checkLabel,
  downLine,
  goalWord,
  hintLine,
  labCheckLine,
  labDoneLine,
  labLede,
  placedLine,
  RESET_ASK,
  returnedLine,
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

  const hold = useMemo(() => holdBoard(lab), [lab]);

  const place = (item: string, target: string): void => {
    if (hold === null) return;
    dispatch(hold.place(item, target));
    setHeld(null);
    setAnnounce(placedLine(hold.itemLabel(item), hold.targetLabel(target)));
  };
  const onSortAction = (action: SortAction): void => {
    if (action.t === 'place') place(action.card, action.bucket);
    else dispatch(action);
  };
  // A failure preview changes no check, so it is announced at once: which container went down or came back.
  const onPlaceAction = (action: PlaceAction): void => {
    if (action.t === 'place') {
      place(action.piece, action.slot);
      return;
    }
    const spec = lab.spec as PlaceSpec;
    const labelOf = (id: string | null): string => spec.containers.find((c) => c.id === id)?.label ?? '';
    const was = (replayLab(engine, lab.spec, live.current.draft.actions) as PlaceState).failed;
    dispatch(action);
    if (action.t === 'fail') setAnnounce(downLine(labelOf(action.container)));
    if (action.t === 'restore') setAnnounce(backLine(labelOf(was)));
  };
  const onBoardAction = (action: unknown): void => {
    if (lab.engine === 'sort') onSortAction(action as SortAction);
    else if (lab.engine === 'place') onPlaceAction(action as PlaceAction);
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
        const target = hold?.targets[command.bucket - 1];
        const item = live.current.held;
        if (hold === null || item === null || target === undefined) break;
        place(item, target);
        // Placing goes on from the tray's first item, or from the target once the tray is empty.
        requestAnimationFrame(() => {
          const next =
            board.current?.querySelector<HTMLElement>(hold.trayItem()) ??
            document.getElementById(hold.targetId(target));
          next?.focus();
        });
        break;
      }
      case 'unplace': {
        const item = live.current.held;
        if (item === null || hold === null) break;
        dispatch(hold.unplace(item));
        setHeld(null);
        setAnnounce(returnedLine(hold.itemLabel(item)));
        requestAnimationFrame(() => board.current?.querySelector<HTMLElement>(hold.trayItem(item))?.focus());
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
  const shape = { engine: lab.engine, buckets: Math.min(10, hold?.targets.length ?? 0) };
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
          // A button, link or summary keeps Enter for its own action; a card, a piece, a bucket or slot target, a
          // select or a checkbox does not, so Enter checks from them.
          onControl:
            element !== null &&
            element.closest('a, button, summary') !== null &&
            element.closest('.card, .bucket-target, .piece, .slot-target') === null,
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
    case 'place':
      return (
        <PlaceView
          spec={lab.spec as PlaceSpec}
          state={state as PlaceState}
          held={held}
          onHold={onHold}
          onAction={onAction}
        />
      );
  }
}

/** A board where a held item goes into a target (Sort's cards and buckets, Place's pieces and slots). */
interface HoldBoard {
  /** The target ids in the order the digit keys number them. */
  readonly targets: readonly string[];
  itemLabel(item: string): string;
  targetLabel(target: string): string;
  place(item: string, target: string): unknown;
  unplace(item: string): unknown;
  /** The selector of an item in the tray, or of the tray's first item. */
  trayItem(item?: string): string;
  /** The element id of a target's button. */
  targetId(target: string): string;
}

/** The pick-up-and-place shape of a Sort or Place lab, or null for an engine without one. */
function holdBoard(lab: LabView): HoldBoard | null {
  switch (lab.engine) {
    case 'sort': {
      const spec = lab.spec as SortSpec;
      return {
        targets: spec.buckets.map((b) => b.id),
        itemLabel: (card) => spec.cards.find((c) => c.id === card)?.text ?? '',
        targetLabel: (bucket) => spec.buckets.find((b) => b.id === bucket)?.label ?? '',
        place: (card, bucket) => ({ t: 'place', card, bucket }) satisfies SortAction,
        unplace: (card) => ({ t: 'unplace', card }) satisfies SortAction,
        trayItem: (card) =>
          card === undefined ? '.sort-tray [data-lab-item]' : `.sort-tray [data-card="${card}"]`,
        targetId: (bucket) => `bucket-${bucket}`,
      };
    }
    case 'place': {
      const spec = lab.spec as PlaceSpec;
      return {
        targets: placeSlots(spec),
        itemLabel: (piece) => spec.pieces.find((p) => p.id === piece)?.label ?? '',
        targetLabel: (slot) => spec.containers.find((c) => c.id === slot)?.label ?? '',
        place: (piece, slot) => ({ t: 'place', piece, slot }) satisfies PlaceAction,
        unplace: (piece) => ({ t: 'unplace', piece }) satisfies PlaceAction,
        trayItem: (piece) =>
          piece === undefined ? '.place-tray [data-lab-item]' : `.place-tray [data-piece="${piece}"]`,
        targetId: (slot) => `place-${slot}`,
      };
    }
    default:
      return null;
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
