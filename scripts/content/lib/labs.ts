import type { LabEngineId } from '../../../schemas/ids.ts';
import { ConfigureSpec, type LabFile, SimulateSpec, SortSpec } from '../../../schemas/lab.ts';

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
