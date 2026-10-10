import type { LabEngineId } from '../../../schemas/ids.ts';
import { ConfigureSpec, type LabFile, SimulateSpec, SortSpec } from '../../../schemas/lab.ts';
import { InvestigateSpec } from '../../../schemas/lab-investigate.ts';
import { PlaceSpec } from '../../../schemas/lab-place.ts';
import { TraceSpec } from '../../../schemas/lab-trace.ts';

/** Field labels, option labels and option details of a Configure spec, or nothing when it does not parse. */
export function configureTexts(spec: unknown): string[] {
  const parsed = ConfigureSpec.safeParse(spec);
  if (!parsed.success) return [];
  return parsed.data.fields
    .flatMap((f) =>
      f.kind === 'toggle' ? [f.label] : [f.label, ...f.options.flatMap((o) => [o.label, o.detail ?? ''])],
    )
    .filter((t) => t !== '');
}

/** Parameter, option and unit labels of a Simulate spec, and the labels inside its constants. */
export function simulateTexts(spec: unknown): string[] {
  const parsed = SimulateSpec.safeParse(spec);
  if (!parsed.success) return [];
  const { params, constants } = parsed.data;
  const named = Object.values(constants as Record<string, unknown>)
    .filter(Array.isArray)
    .flatMap((list: unknown[]) =>
      list.flatMap((x) =>
        typeof x === 'object' && x !== null && 'label' in x && typeof x.label === 'string' ? [x.label] : [],
      ),
    );
  return [
    ...params.flatMap((p) => [
      p.label,
      ...(p.kind === 'choice' ? p.options.map((o) => o.label) : []),
      ...(p.kind === 'int' && p.unit !== undefined ? [p.unit] : []),
    ]),
    ...named,
  ];
}

/** Drops the empty strings an optional detail leaves behind. */
const present = (texts: readonly (string | undefined)[]): string[] =>
  texts.filter((t): t is string => t !== undefined && t !== '');

/** Container labels and details, then piece labels and details, of a Place spec. */
export function placeTexts(spec: unknown): string[] {
  const parsed = PlaceSpec.safeParse(spec);
  if (!parsed.success) return [];
  return present([
    ...parsed.data.containers.flatMap((c) => [c.label, c.detail]),
    ...parsed.data.pieces.flatMap((p) => [p.label, p.detail]),
  ]);
}

/**
 * A network Trace spec's target, security group and network ACL labels and case labels; a policy Trace spec's policy,
 * principal, group and organization node labels and case labels.
 */
export function traceTexts(spec: unknown): string[] {
  const parsed = TraceSpec.safeParse(spec);
  if (!parsed.success) return [];
  const s = parsed.data;
  const cases = s.cases.map((c) => c.label);
  if (s.kind === 'network') return [s.target, s.sg.label, s.nacl.label, ...cases];
  return [
    ...s.policies.map((p) => p.label),
    ...s.principals.map((p) => p.label),
    ...s.groups.map((g) => g.label),
    ...s.org.map((n) => n.label),
    ...cases,
  ];
}

/** An Investigate spec's source, listing, column labels, every cell, question prompts and option labels. */
export function investigateTexts(spec: unknown): string[] {
  const parsed = InvestigateSpec.safeParse(spec);
  if (!parsed.success) return [];
  const { source, listing, columns, records, questions } = parsed.data;
  return present([
    source,
    listing?.label,
    ...(listing?.lines ?? []),
    ...columns.map((c) => c.label),
    ...records.flatMap((r) => columns.map((c) => r.cells[c.id])),
    ...questions.flatMap((q) => [q.prompt, ...q.options.map((o) => o.label)]),
  ]);
}

/** Each engine's visible spec strings, from a spec that parses; [] for one that does not (R11 reports that). */
export const SPEC_TEXTS: { readonly [E in LabEngineId]?: (spec: unknown) => string[] } = {
  sort(spec) {
    const parsed = SortSpec.safeParse(spec);
    if (!parsed.success) return [];
    return [
      ...parsed.data.buckets.flatMap((b) => [b.label, ...(b.detail === undefined ? [] : [b.detail])]),
      ...parsed.data.cards.map((c) => c.text),
    ];
  },
  configure: configureTexts,
  simulate: simulateTexts,
  place: placeTexts,
  trace: traceTexts,
  investigate: investigateTexts,
};

/** Every string of a lab that Dani reads or a writer wrote: R7 runs its course check on them and R11 its name check. */
export function labTexts(lab: LabFile): string[] {
  return [
    lab.title,
    lab.brief,
    ...lab.goals.flatMap((g) => [g.label, g.hint]),
    ...lab.wrongPaths.map((p) => p.mistake),
    ...lab.debrief.lines,
    ...(SPEC_TEXTS[lab.engine]?.(lab.spec) ?? []),
  ];
}
