import type { TraceAction, TraceSpec } from '../../../schemas/lab-trace.ts';
import {
  CASES_HEADING,
  caseLine,
  hopLine,
  naclRuleText,
  policyLegend,
  sgRuleText,
  statementText,
} from '../../app/lab.ts';
import { type TraceState, traceCase } from './model.ts';

/**
 * Fixed candidate rules as native checkboxes, then every test case with its live result; each case opens to step
 * through its hops (spec 5.1). Native controls keep the tab order, so Trace adds no keys of its own.
 */
export function TraceView(props: {
  spec: TraceSpec;
  state: TraceState;
  onAction(action: TraceAction): void;
}) {
  const { spec, state, onAction } = props;
  const rule = (id: string, text: string) => {
    const on = state.on[id] === true;
    return (
      <label key={id} class={`option trace-rule${on ? ' chosen' : ''}`}>
        <input
          type="checkbox"
          checked={on}
          onChange={(event) => onAction({ t: 'toggle', rule: id, on: event.currentTarget.checked })}
        />
        <span class="option-text">{text}</span>
      </label>
    );
  };
  return (
    <div class="trace">
      {spec.kind === 'network' ? (
        <>
          <fieldset class="trace-rules">
            <legend>{spec.sg.label}</legend>
            {spec.sg.rules.map((r) => rule(r.id, sgRuleText(r)))}
          </fieldset>
          <fieldset class="trace-rules">
            <legend>{spec.nacl.label}</legend>
            {[...spec.nacl.rules]
              .sort((a, b) => (a.dir === b.dir ? a.n - b.n : a.dir === 'in' ? -1 : 1))
              .map((r) => rule(r.id, naclRuleText(r)))}
          </fieldset>
        </>
      ) : (
        spec.policies.map((p) => (
          <fieldset key={p.id} class="trace-rules">
            <legend>{policyLegend(spec, p)}</legend>
            {p.statements.map((s) => rule(s.id, statementText(s)))}
          </fieldset>
        ))
      )}
      <h2 class="trace-cases-title">{CASES_HEADING}</h2>
      <ol class="trace-cases">
        {spec.cases.map((c) => {
          const run = traceCase(spec, state, c.id);
          if (run === null) return null;
          return (
            <li key={c.id} class={run.result === c.expect ? 'trace-case' : 'trace-case is-off'}>
              <details>
                <summary>
                  <span class="trace-case-label">{c.label}</span>{' '}
                  <span class="trace-case-result">{caseLine(run.result, c.expect)}</span>
                </summary>
                <ol class="trace-hops">
                  {run.hops.map((hop) => (
                    <li key={`${hop.at}-${hop.node ?? ''}-${hop.reply}`}>{hopLine(spec, hop)}</li>
                  ))}
                </ol>
              </details>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
