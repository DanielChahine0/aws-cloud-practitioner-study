import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ContentIndex } from '../../../schemas/chunks.ts';
import {
  ADR_FIELDS,
  ADR_HEADINGS,
  type AdrField,
  type AdrText,
  type DecisionView,
  type ProjectChunk,
  type RubricView,
} from '../../../schemas/project-view.ts';
import {
  type ConceptName,
  canSelfGrade,
  citationsOf,
  type DecisionRecord,
  type DecisionStage,
  decisionStage,
  decisionsOf,
  openDay,
  type Scores,
  scoreTotal,
  toShown,
  toStored,
} from '../../engine/capstone.ts';
import { studyDay } from '../../engine/day.ts';
import { PLAN_FILE, planMarkdown } from '../../engine/plan.ts';
import { adrKey } from '../../store/kv.ts';
import { Breadcrumbs } from '../../ui/Breadcrumbs.tsx';
import { useTitle } from '../../ui/useTitle.ts';
import { type AdrDraft, adrDraftOf, emptyAdrDraft } from '../adr-draft.ts';
import { now } from '../clock.ts';
import { TARGET_EXAM_DATE } from '../config.ts';
import { ensureProject, project } from '../content.ts';
import { downloadText } from '../download.ts';
import { examDateLabel } from '../home.ts';
import { bosses, memory } from '../memory.ts';
import { events, kvRecords, record, storeReady, writeKv } from '../progress.ts';
import {
  cardLine,
  citationLine,
  conceptNames,
  DRAFT_SAVE_MS,
  decisionHref,
  EXPORT_PLAN,
  GRADE_GATE,
  gradeAnnouncement,
  liveTicks,
  NO_PROJECT,
  type OpenCitation,
  openCitation,
  PROJECT_HEADINGS,
  PROJECT_LEDE,
  passLine,
  pickCitation,
  READ_IN_NOTES,
  REVEAL_HEADING,
  revealRows,
  SAVE_FINAL,
  SAVE_SELF,
  suggestions,
  TICK_LABEL,
  tickKeyPoint,
} from '../project.ts';
import { highlight } from '../state.ts';
import { LAZY_ERROR } from './Lazy.tsx';
import { NotFound } from './NotFound.tsx';

const CAPSTONE_CRUMBS = [
  { label: 'Home', href: '#/' },
  { label: 'Capstone', href: '#/project' },
];

/** The study day after the exam (the stored exam date, else the target), as the card and the editor say it. */
const examDateNow = (): string => memory.value?.examDate ?? TARGET_EXAM_DATE;

const mapText = (text: AdrText, f: (value: string) => string): AdrText => ({
  context: f(text.context),
  options: f(text.options),
  decision: f(text.decision),
  why: f(text.why),
  tradeoffs: f(text.tradeoffs),
  cost: f(text.cost),
});

/** The six ADR texts alone, without a draft's `v` and ticks. */
const textOf = (draft: AdrText): AdrText => mapText(draft, (t) => t);

/** One decision's stage from the log, the lessons read, today and the exam date (spec 6 and 10.1). */
function stageOf(module: number, rec: DecisionRecord | undefined): DecisionStage {
  return decisionStage({
    lessonsRead: bosses.value.get(module)?.unlocked === true,
    today: studyDay(now.value),
    examDate: examDateNow(),
    record: rec,
  });
}

function storedDraft(module: number): AdrDraft | null {
  return adrDraftOf(kvRecords.value[adrKey(module)]?.value);
}

function lineFor(module: number, stage: DecisionStage, rec: DecisionRecord | undefined): string {
  return cardLine(stage, {
    module,
    open: examDateLabel(openDay(examDateNow())),
    draft: storedDraft(module) !== null,
    self: rec?.self ? scoreTotal(rec.self.scores) : null,
    final: rec?.final ? scoreTotal(rec.final.scores) : null,
  });
}

/**
 * The capstone (spec 6): `#/project` lists the brief, the 13 decision cards, the rubric and Export; `#/project/NN`
 * is the ADR editor of one decision with its self-grade, the key point reveal and the one final grade.
 */
export function Project({ idx, module }: { idx: ContentIndex; module: number | null }) {
  const [failed, setFailed] = useState(false);
  const chunk = project.value;
  const decision = module === null ? undefined : chunk?.decisions.find((d) => d.module === module);
  useTitle(
    module === null
      ? 'Capstone'
      : decision === undefined
        ? `Decision ${module}`
        : `Decision ${module}: ${decision.title}`,
  );
  useEffect(() => {
    if (idx.project === null) return;
    void ensureProject().then((loaded) => setFailed(loaded === null));
  }, [idx]);
  if (idx.project === null) {
    return (
      <>
        <Breadcrumbs items={CAPSTONE_CRUMBS} />
        <h1>Capstone</h1>
        <p class="muted">{NO_PROJECT}</p>
      </>
    );
  }
  if (chunk === null) return failed ? <p role="alert">{LAZY_ERROR}</p> : <p class="muted">Loading</p>;
  if (!storeReady.value) return <p class="muted">Loading</p>;
  if (module === null) return <Overview idx={idx} chunk={chunk} />;
  if (decision === undefined) return <NotFound hash={decisionHref(module)} />;
  return <Editor key={module} idx={idx} rubric={chunk.rubric} decision={decision} />;
}

/** `#/project`: the brief, every decision card with its status line, the rubric and the plan export. */
function Overview({ idx, chunk }: { idx: ContentIndex; chunk: ProjectChunk }) {
  const decisions = decisionsOf(events.value);
  const exportPlan = (): void => {
    const drafts = new Map<number, AdrText>();
    for (const d of chunk.decisions) {
      const draft = storedDraft(d.module);
      if (draft !== null) drafts.set(d.module, textOf(draft));
    }
    const text = planMarkdown({ project: chunk, drafts, decisions, concepts: conceptNames(idx.concepts) });
    downloadText(PLAN_FILE, text, 'text/markdown');
  };
  return (
    <>
      <Breadcrumbs items={CAPSTONE_CRUMBS} />
      <h1>{chunk.title}</h1>
      <p class="muted lede">{PROJECT_LEDE}</p>
      <h2>{PROJECT_HEADINGS.brief}</h2>
      <ul class="brief-facts">
        {chunk.facts.map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>
      <h2>{PROJECT_HEADINGS.decisions}</h2>
      <ul class="rows decision-rows">
        {chunk.decisions.map((d) => {
          const rec = decisions.get(d.module);
          return (
            <li key={d.module}>
              <a class="row" href={decisionHref(d.module)}>
                <span class="row-n">{d.module}</span>
                <span class="row-title">{d.title}</span>
                <span class="row-meta">{lineFor(d.module, stageOf(d.module, rec), rec)}</span>
              </a>
            </li>
          );
        })}
      </ul>
      <h2>{PROJECT_HEADINGS.rubric}</h2>
      <Rubric rubric={chunk.rubric} />
      <p class="sheet-actions">
        <button class="button" type="button" onClick={exportPlan}>
          {EXPORT_PLAN}
        </button>
      </p>
    </>
  );
}

/** The rubric as a list per criterion, which never scrolls sideways on a phone. */
function Rubric({ rubric }: { rubric: RubricView }) {
  return (
    <>
      {rubric.criteria.map((c) => (
        <section key={c.id} class="rubric-criterion" aria-labelledby={`rubric-${c.id}`}>
          <h3 id={`rubric-${c.id}`}>{c.name}</h3>
          <ul class="rubric-levels">
            {c.levels.map((text, level) => (
              <li key={text} class="rubric-level">
                <span class="rubric-score">{level}</span> {text}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p class="muted">{passLine(rubric.passTotal)}</p>
    </>
  );
}

/** `#/project/NN`: the six ADR headings, the live citation check, then the grades and the reveal as inline panels. */
function Editor({
  idx,
  rubric,
  decision,
}: {
  idx: ContentIndex;
  rubric: RubricView;
  decision: DecisionView;
}) {
  const m = decision.module;
  const concepts = useMemo(() => conceptNames(idx.concepts), [idx]);
  const names = useMemo(() => new Map(idx.concepts.map((c) => [c.id, c.name] as const)), [idx]);
  const [draft, setDraft] = useState<AdrDraft>(() => storedDraft(m) ?? emptyAdrDraft(decision.context));
  // The text as typed, with citations by display name; the draft holds the same text with concept ids.
  const [shown, setShown] = useState<AdrText>(() => mapText(draft, (t) => toShown(t, concepts)));
  const [announce, setAnnounce] = useState('');
  const pending = useRef<AdrDraft | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flush = useRef((): void => {
    clearTimeout(timer.current);
    if (pending.current !== null) void writeKv(adrKey(m), pending.current);
    pending.current = null;
  }).current;
  useEffect(() => flush, [flush]);

  const rec = decisionsOf(events.value).get(m);
  const stage = stageOf(m, rec);
  const previous = useRef(stage);
  useEffect(() => {
    if (previous.current === stage) return;
    previous.current = stage;
    document.getElementById(stage === 'self' ? 'reveal-title' : 'decision-status')?.focus();
  }, [stage]);

  const save = (next: AdrDraft): void => {
    setDraft(next);
    pending.current = next;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, DRAFT_SAVE_MS);
  };
  const edit = (field: AdrField, value: string): void => {
    setShown({ ...shown, [field]: value });
    save({ ...draft, [field]: toStored(value, concepts) });
  };

  const saveSelf = async (scores: Scores): Promise<void> => {
    flush();
    await record({
      t: 'decision',
      module: m,
      stage: 'self',
      scores: [scores[0], scores[1], scores[2], scores[3]],
    });
    setAnnounce(gradeAnnouncement('self', scoreTotal(scores), null));
  };
  const saveFinal = async (scores: Scores): Promise<void> => {
    flush();
    const self = rec?.self?.scores ?? scores;
    await record({
      t: 'decision',
      module: m,
      stage: 'final',
      scores: [scores[0], scores[1], scores[2], scores[3]],
      keyPoints: liveTicks(decision, draft.ticks),
    });
    setAnnounce(gradeAnnouncement('final', scoreTotal(scores), scoreTotal(scores) - scoreTotal(self)));
  };

  const editable = stage === 'open' || stage === 'self' || stage === 'done';
  const ticks = stage === 'done' ? (rec?.final?.keyPoints ?? []) : draft.ticks;
  return (
    <>
      <Breadcrumbs
        items={[...CAPSTONE_CRUMBS, { label: `Decision ${m}: ${decision.title}`, href: decisionHref(m) }]}
      />
      <h1>
        Decision {m}: {decision.title}
      </h1>
      <p class="lede">{decision.prompt}</p>
      <p id="decision-status" class="muted decision-status" tabIndex={-1}>
        {lineFor(m, stage, rec)}
      </p>
      {editable && (
        <form class="adr" onSubmit={(event) => event.preventDefault()}>
          {ADR_FIELDS.map((field, i) =>
            field === 'why' ? (
              <WhyField
                key={field}
                label={ADR_HEADINGS[i] ?? ''}
                value={shown.why}
                stored={draft.why}
                concepts={concepts}
                onEdit={(value) => edit('why', value)}
              />
            ) : (
              <div key={field} class="adr-field">
                <label for={`adr-${field}`}>{ADR_HEADINGS[i]}</label>
                <textarea
                  id={`adr-${field}`}
                  rows={field === 'context' ? 4 : 3}
                  value={shown[field]}
                  onInput={(event) => edit(field, event.currentTarget.value)}
                />
              </div>
            ),
          )}
        </form>
      )}
      {stage === 'open' && (
        <Grade
          id="self"
          heading={PROJECT_HEADINGS.self}
          rubric={rubric}
          initial={null}
          ready={canSelfGrade(textOf(draft), concepts)}
          button={SAVE_SELF}
          onSave={saveSelf}
        />
      )}
      {(stage === 'self' || stage === 'done') && (
        <section class="reveal" aria-labelledby="reveal-title">
          <h2 id="reveal-title" tabIndex={-1}>
            {REVEAL_HEADING}
          </h2>
          <ul class="key-points">
            {revealRows(decision, ticks, names).map((row) => (
              <li key={row.id} class="key-point">
                <p id={`kp-${row.id}`} class="key-point-text">
                  {row.text}
                </p>
                {row.concepts !== '' && <p class="muted key-point-text">{row.concepts}</p>}
                <blockquote class="key-point-quote">{row.quote}</blockquote>
                <p class="key-point-actions">
                  <label class="key-point-tick">
                    <input
                      type="checkbox"
                      checked={row.ticked}
                      disabled={stage === 'done'}
                      aria-describedby={`kp-${row.id}`}
                      onChange={(event) =>
                        save({
                          ...draft,
                          ticks: tickKeyPoint(draft.ticks, row.id, event.currentTarget.checked),
                        })
                      }
                    />
                    {TICK_LABEL}
                  </label>
                  <a
                    href={row.route}
                    onClick={() => {
                      highlight.value = row.quote;
                    }}
                  >
                    {READ_IN_NOTES}
                  </a>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {stage === 'self' && rec?.self && (
        <Grade
          id="final"
          heading={PROJECT_HEADINGS.final}
          rubric={rubric}
          initial={rec.self.scores}
          ready={true}
          button={SAVE_FINAL}
          onSave={saveFinal}
        />
      )}
      <p class="visually-hidden" aria-live="polite">
        {announce}
      </p>
    </>
  );
}

/** The keys the open `[[` list handles itself; every other key re-reads the citation at the caret on release. */
const LIST_KEYS: ReadonlySet<string> = new Set(['ArrowUp', 'ArrowDown', 'Enter', 'Escape']);

/** The Why heading: citations by display name, a `[[` list of concept names, and the live citation lines. */
function WhyField({
  label,
  value,
  stored,
  concepts,
  onEdit,
}: {
  label: string;
  value: string;
  stored: string;
  concepts: readonly ConceptName[];
  onEdit: (value: string) => void;
}) {
  const area = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState<OpenCitation | null>(null);
  const [active, setActive] = useState(0);
  const options = open === null ? [] : suggestions(open.query, concepts);
  const listed = options.length > 0;

  /** Reads the open citation at the caret; the highlighted row stays put while the citation is unchanged. */
  const track = (el: HTMLTextAreaElement): void => {
    const now = openCitation(el.value, el.selectionStart);
    if (now !== null && open !== null && now.start === open.start && now.query === open.query) return;
    setOpen(now);
    setActive(0);
  };
  const pick = (c: ConceptName): void => {
    const el = area.current;
    if (el === null || open === null) return;
    const next = pickCitation(el.value, el.selectionStart, open, c.name);
    if (next === null) {
      // The caret moved where the list did not see it: close the list and leave the text alone.
      setOpen(null);
      return;
    }
    // Set the text and the caret now, not in a later frame: keys typed right after a pick must land after the name.
    el.value = next.text;
    el.setSelectionRange(next.caret, next.caret);
    onEdit(next.text);
    setOpen(null);
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (!listed) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((active + step + options.length) % options.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const c = options[active];
      if (c !== undefined) pick(c);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(null);
    }
  };

  return (
    <div class="adr-field">
      <label for="adr-why">{label}</label>
      <textarea
        id="adr-why"
        ref={area}
        rows={4}
        value={value}
        aria-autocomplete="list"
        aria-controls={listed ? 'why-options' : undefined}
        aria-activedescendant={listed ? `why-option-${active}` : undefined}
        aria-describedby="why-citations"
        onInput={(event) => {
          onEdit(event.currentTarget.value);
          track(event.currentTarget);
        }}
        onClick={(event) => track(event.currentTarget)}
        onKeyDown={onKeyDown}
        onKeyUp={(event) => {
          // End, Home, the arrows and the like move the caret without an input event: re-read the citation there.
          if (!LIST_KEYS.has(event.key)) track(event.currentTarget);
        }}
        onBlur={() => setOpen(null)}
      />
      {listed && (
        <div id="why-options" class="suggestions" role="listbox" aria-label="Concepts">
          {options.map((c, i) => (
            <div
              key={c.id}
              id={`why-option-${i}`}
              class="suggestion"
              role="option"
              aria-selected={i === active}
              tabIndex={-1}
              onMouseDown={(event) => {
                event.preventDefault();
                pick(c);
              }}
            >
              {c.name}
            </div>
          ))}
        </div>
      )}
      <div id="why-citations" class="citation-lines" aria-live="polite">
        {citationLine(citationsOf(stored, concepts)).map((line) => (
          <p key={line} class="citation-line">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

/** Four criteria as fieldsets of four radios with their level text; the save button waits for every criterion. */
function Grade({
  id,
  heading,
  rubric,
  initial,
  ready,
  button,
  onSave,
}: {
  id: 'self' | 'final';
  heading: string;
  rubric: RubricView;
  initial: Scores | null;
  ready: boolean;
  button: string;
  onSave: (scores: Scores) => Promise<void>;
}) {
  const [picks, setPicks] = useState<readonly (number | null)[]>(() =>
    initial === null ? [null, null, null, null] : [...initial],
  );
  const [busy, setBusy] = useState(false);
  const [a, b, c, d] = picks;
  const scores: Scores | null = a != null && b != null && c != null && d != null ? [a, b, c, d] : null;
  return (
    <section class="grade" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>{heading}</h2>
      {rubric.criteria.map((criterion, i) => (
        <fieldset key={criterion.id} class="criterion">
          <legend>{criterion.name}</legend>
          <div class="options">
            {criterion.levels.map((text, level) => (
              <label key={text} class={picks[i] === level ? 'option chosen' : 'option'}>
                <input
                  type="radio"
                  name={`${id}-${criterion.id}`}
                  value={level}
                  checked={picks[i] === level}
                  onChange={() => setPicks(picks.map((p, j) => (j === i ? level : p)))}
                />
                <span class="option-n">{level}</span>
                <span class="option-text">{text}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      {ready ? (
        <p>
          <button
            class="button"
            type="button"
            disabled={scores === null || busy}
            onClick={() => {
              if (scores === null) return;
              setBusy(true);
              void onSave(scores).finally(() => setBusy(false));
            }}
          >
            {button}
          </button>
        </p>
      ) : (
        <p class="muted">{GRADE_GATE}</p>
      )}
    </section>
  );
}
