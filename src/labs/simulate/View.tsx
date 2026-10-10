import type { SimulateAction, SimulateSpec } from '../../../schemas/lab.ts';
import { SIM_IDLE, SIM_RESULTS, simChartLabel, tickPoints } from '../../app/lab.ts';
import type { SimulateState } from './model.ts';
import { fmt, metricInfo, type SimSeries } from './models.ts';

const W = 480;
const H = 160;
/** Room under the baseline for the tick marks. */
const TICK = 4;
/** Space between the bars of one point, so each bar only has to stand out from the surface (WCAG 1.4.11). */
const GAP = 2;
const FILLS = ['var(--active)', 'var(--muted)'];

/** Bars for one or two series on a shared scale, with a visually hidden table of the same numbers. */
function SimChart(props: { label: string; xs: string[]; series: SimSeries[] }) {
  const { label, xs, series } = props;
  const top = Math.max(1, ...series.flatMap((s) => s.values));
  const slot = W / Math.max(1, xs.length);
  const count = Math.max(1, series.length);
  const bar = (slot * 0.8 - GAP * (count - 1)) / count;
  const ticks = tickPoints(xs.length);
  const pct = (x: number) => `${(100 * x) / W}%`;
  return (
    <figure class="sim-chart">
      {/* The sighted copy of the scale: the dashed top line stands for this value, the baseline for 0. */}
      <p class="muted sim-scale" aria-hidden="true">
        {fmt(top, series[0]?.unit ?? '')}
      </p>
      <svg
        class="sim-plot"
        viewBox={`0 0 ${W} ${H + TICK + 1}`}
        role="img"
        aria-label={label}
        focusable="false"
      >
        <line x1="0" y1="0.5" x2={W} y2="0.5" stroke="var(--line)" stroke-dasharray="4 4" />
        {series.map((s, k) =>
          s.values.map((v, i) => {
            const h = (Math.max(0, v) / top) * H;
            return (
              <rect
                key={`${s.label}-${xs[i] ?? i}`}
                x={i * slot + slot * 0.1 + k * (bar + GAP)}
                y={H - h}
                width={bar}
                height={h}
                fill={FILLS[k] ?? 'var(--muted)'}
              />
            );
          }),
        )}
        <line x1="0" y1={H + 0.5} x2={W} y2={H + 0.5} stroke="var(--line)" />
        {ticks.map((i) => (
          <line
            key={i}
            x1={(i + 0.5) * slot}
            y1={H + 1}
            x2={(i + 0.5) * slot}
            y2={H + TICK + 1}
            stroke="var(--muted)"
          />
        ))}
      </svg>
      {/* HTML, not SVG text, so the labels keep their size on a phone; the hidden table reads them out. */}
      <div class="muted sim-ticks" aria-hidden="true">
        {ticks.map((i, j) => {
          const edge = j === 0 ? ' sim-tick-start' : j === ticks.length - 1 ? ' sim-tick-end' : '';
          // The end labels line up with the edge of their slot, so they never leave the chart.
          const x = j === 0 ? i * slot : j === ticks.length - 1 ? (i + 1) * slot : (i + 0.5) * slot;
          return (
            <span key={i} class={`sim-tick${edge}`} style={{ left: pct(x) }}>
              {xs[i]}
            </span>
          );
        })}
      </div>
      <figcaption class="muted sim-legend">
        {series.map((s, k) => (
          <span key={s.label} class="sim-key">
            <span class={`sim-swatch sim-swatch-${k + 1}`} aria-hidden="true" />
            {s.label}
          </span>
        ))}
      </figcaption>
      {/* A table sizes to its content, so the hidden copy sits in a 1 px box that clips it rather than widening the page. */}
      <div class="visually-hidden">
        <table>
          <caption>{label}</caption>
          <thead>
            <tr>
              <th scope="col">Point</th>
              {series.map((s) => (
                <th key={s.label} scope="col">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {xs.map((x, i) => (
              <tr key={x}>
                <th scope="row">{x}</th>
                {series.map((s) => (
                  <td key={s.label}>{fmt(s.values[i] ?? 0, s.unit)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

/** Parameters, then the metrics of the last run and, for two models, its chart (spec 5.1). */
export function SimulateView(props: {
  spec: SimulateSpec;
  state: SimulateState;
  onAction(a: SimulateAction): void;
}) {
  const { spec, state, onAction } = props;
  const result = state.result;
  const xs =
    spec.model === 'scaling'
      ? (result?.series[0]?.values ?? []).map((_, i) => `${i}:00`)
      : (result?.series[0]?.values ?? []).map((_, i) => `Day ${30 * i + 29}`);
  return (
    <div class="sim">
      <fieldset class="sim-params">
        <legend class="visually-hidden">Parameters</legend>
        {spec.params.map((p) => {
          const id = `sim-${p.id}`;
          const value = state.values[p.id];
          if (p.kind === 'toggle') {
            const checked = value === true;
            return (
              <label key={p.id} class={`option sim-toggle${checked ? ' chosen' : ''}`}>
                <input
                  id={id}
                  type="checkbox"
                  checked={checked}
                  onChange={(event) =>
                    onAction({ t: 'set', param: p.id, value: event.currentTarget.checked })
                  }
                />
                <span class="option-text">{p.label}</span>
              </label>
            );
          }
          if (p.kind === 'choice') {
            return (
              <div key={p.id} class="sim-field">
                <label for={id}>{p.label}</label>
                <select
                  id={id}
                  value={typeof value === 'string' ? value : p.initial}
                  onChange={(event) => onAction({ t: 'set', param: p.id, value: event.currentTarget.value })}
                >
                  {p.options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          }
          const shown = typeof value === 'number' ? value : p.initial;
          return (
            <div key={p.id} class="sim-field">
              <label for={id}>
                {p.label}
                {p.unit !== undefined && <span class="muted"> ({p.unit})</span>}
              </label>
              <input
                id={id}
                type="number"
                inputMode="numeric"
                min={p.min}
                max={p.max}
                step={p.step}
                value={shown}
                onInput={(event) => {
                  const n = event.currentTarget.valueAsNumber;
                  if (Number.isFinite(n)) onAction({ t: 'set', param: p.id, value: n });
                }}
                onBlur={(event) => {
                  event.currentTarget.value = String(shown);
                }}
              />
            </div>
          );
        })}
      </fieldset>
      {result === null ? (
        <p class="muted sim-idle">{SIM_IDLE}</p>
      ) : (
        <>
          <table class="sim-metrics">
            <caption>{SIM_RESULTS}</caption>
            <tbody>
              {Object.entries(result.metrics).map(([metric, value]) => {
                const info = metricInfo(spec.model, metric, spec.constants) ?? { label: metric, unit: '' };
                return (
                  <tr key={metric}>
                    <th scope="row">{info.label}</th>
                    <td>{fmt(value, info.unit)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {(spec.model === 'scaling' || spec.model === 's3-lifecycle') && result.series.length > 0 && (
            <SimChart
              label={simChartLabel(
                spec.model,
                result.series.map((s) => s.label),
              )}
              xs={xs}
              series={result.series}
            />
          )}
        </>
      )}
    </div>
  );
}
