import type { InvestigateAction, InvestigateSpec } from '../../../schemas/lab-investigate.ts';
import {
  ALL_VALUES,
  CHOOSE_ANSWER,
  FILTERS_LEGEND,
  NO_RECORDS,
  QUESTIONS_LEGEND,
  shownLine,
} from '../../app/lab.ts';
import { type InvestigateState, visibleRecords } from './model.ts';

/** A record of the state, read only when the key is its own, so an id such as `constructor` reads nothing. */
const own = (record: Readonly<Record<string, string>>, key: string): string | undefined =>
  Object.hasOwn(record, key) ? record[key] : undefined;

/**
 * Read made-up records and an optional listing, narrow the records with filters, then choose each answer (spec 5.1).
 * Native selects only, in the page's tab order; the listing and the records scroll inside focusable regions, so the
 * page never scrolls sideways on a phone.
 */
export function InvestigateView(props: {
  spec: InvestigateSpec;
  state: InvestigateState;
  onAction(action: InvestigateAction): void;
}) {
  const { spec, state, onAction } = props;
  const filters = spec.columns.filter((c) => c.filter);
  const shown = visibleRecords(spec, state);
  return (
    <div class="inv">
      {spec.listing !== undefined && (
        // biome-ignore lint/a11y/noNoninteractiveTabindex: the listing scrolls sideways on a phone, so the keyboard must reach it (WCAG 2.1.1)
        <section class="inv-listing" aria-label={spec.listing.label} tabIndex={0}>
          <pre>{spec.listing.lines.join('\n')}</pre>
        </section>
      )}
      {filters.length > 0 && (
        <fieldset class="inv-filters">
          <legend>{FILTERS_LEGEND}</legend>
          {filters.map((column) => {
            const id = `inv-filter-${column.id}`;
            return (
              <div key={column.id} class="inv-field">
                <label for={id}>{column.label}</label>
                <select
                  id={id}
                  value={own(state.filters, column.id) ?? ''}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    onAction(
                      value === ''
                        ? { t: 'unfilter', column: column.id }
                        : { t: 'filter', column: column.id, value },
                    );
                  }}
                >
                  <option value="">{ALL_VALUES}</option>
                  {(state.filterable[column.id] ?? []).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </fieldset>
      )}
      {spec.records.length > 0 && (
        <>
          <p class="muted inv-shown" aria-live="polite">
            {shownLine(shown.length, spec.records.length)}
          </p>
          {/* biome-ignore lint/a11y/noNoninteractiveTabindex: the records scroll sideways on a phone, so the keyboard must reach them (WCAG 2.1.1) */}
          <section class="inv-records" aria-label={spec.source} tabIndex={0}>
            {shown.length === 0 ? (
              <p class="muted inv-none">{NO_RECORDS}</p>
            ) : (
              <table>
                <caption>{spec.source}</caption>
                <thead>
                  <tr>
                    {spec.columns.map((column) => (
                      <th key={column.id} scope="col">
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shown.map((record) => (
                    <tr key={record.id}>
                      {spec.columns.map((column) => (
                        <td key={column.id}>{own(record.cells, column.id)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
      <fieldset class="inv-questions">
        <legend>{QUESTIONS_LEGEND}</legend>
        {spec.questions.map((question) => {
          const id = `inv-question-${question.id}`;
          const chosen = own(state.answers, question.id);
          return (
            <div key={question.id} class="inv-field">
              <label for={id}>{question.prompt}</label>
              <select
                id={id}
                value={chosen ?? ''}
                onChange={(event) => {
                  const option = event.currentTarget.value;
                  if (option !== '') onAction({ t: 'answer', question: question.id, option });
                }}
              >
                <option value="" disabled hidden={chosen !== undefined}>
                  {CHOOSE_ANSWER}
                </option>
                {question.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
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
