import { useEffect } from 'preact/hooks';
import type { QuestionView } from '../../../../schemas/chunks.ts';
import { resolveConcept } from '../../../engine/memory.ts';
import type { AnswerRecord } from '../../../engine/replay.ts';
import { ensureExamForm, ensureModule, examForms, index, modules } from '../../content.ts';
import { memoryContent } from '../../memory.ts';
import { progress } from '../../progress.ts';
import { causeLine, changeCounts, changeVerdict } from '../../progress-lines.ts';

/** Error-cause counts and whether changing answers has helped so far (spec 4.4). */
export function Causes() {
  const p = progress.value;
  const counts = { unknown: 0, confused: 0, misread: 0 };
  for (const cause of p.causes.values()) counts[cause] += 1;
  const changed: AnswerRecord[] = [...p.answers.values()]
    .flat()
    .filter((r) => (r.mode === 'boss' || r.mode === 'mock') && r.changes.length > 0);
  const items = index.value?.exam.items ?? {};
  const content = memoryContent.value;
  const forms = [
    ...new Set(changed.flatMap((r) => (items[r.qid] === undefined ? [] : [items[r.qid]?.form ?? '']))),
  ];
  const wanted = [
    ...new Set(
      changed.flatMap((r) => {
        if (items[r.qid] !== undefined || content === null) return [];
        const concept = resolveConcept(content, r.concept);
        const module = concept === null ? undefined : content.concepts.get(concept)?.module;
        return module === undefined ? [] : [module];
      }),
    ),
  ];
  const key = `${forms.join(',')}|${wanted.join(',')}`;
  // biome-ignore lint/correctness/useExhaustiveDependencies: the key names every form and module the effect loads
  useEffect(() => {
    for (const f of forms) void ensureExamForm(f);
    for (const n of wanted) ensureModule(n);
  }, [key]);
  const questions = new Map<string, QuestionView>();
  for (const n of wanted) for (const q of modules.value.get(n)?.questions ?? []) questions.set(q.id, q);
  for (const f of forms) for (const q of examForms.value.get(f)?.questions ?? []) questions.set(q.id, q);
  const loaded = changed.every((r) => questions.has(r.qid));
  const { wrongToRight, rightToWrong } = changeCounts(changed, questions);
  return (
    <>
      <h3>Error causes</h3>
      <p class="progress-line">{causeLine(counts)}</p>
      <p class="muted">{loaded ? changeVerdict(wrongToRight, rightToWrong) : 'Loading'}</p>
    </>
  );
}
