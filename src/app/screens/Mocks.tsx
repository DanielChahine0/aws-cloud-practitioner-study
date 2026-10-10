import type { ContentIndex } from '../../../schemas/chunks.ts';
import { FORM_IDS } from '../../../schemas/ids.ts';
import { useTitle } from '../../ui/useTitle.ts';
import { openExam } from '../exam-settle.ts';
import { attempts, taken } from '../memory.ts';
import { progress, storeReady } from '../progress.ts';
import { MOCKS_EMPTY, takenLine } from '../results.ts';
import { type MockRoute, toHash } from '../router.ts';

/** The mock list `#/s/mock` (spec 7.3): one row per form, then the remix once all four are taken. */
export function Mocks({ idx }: { idx: ContentIndex }) {
  useTitle('Mock exams');
  const firsts = attempts.value;
  const started = taken.value;
  const open = storeReady.value ? openExam(progress.value) : null;
  const rows = FORM_IDS.filter((f) => idx.exam.forms.some((m) => m.id === f)).map((form) => {
    const route = toHash({ kind: 'mock', form: form.toLowerCase() as MockRoute });
    const first = firsts.find((a) => a.form === form);
    if (first !== undefined)
      return { form, href: toHash({ kind: 'results', sid: first.sid }), meta: takenLine(first) };
    const running = open !== null && open.mode === 'mock' && open.form === form;
    return { form, href: route, meta: running ? 'In progress' : 'Not taken' };
  });
  const remix = firsts.length === FORM_IDS.length;
  return (
    <>
      <h1>Mock exams</h1>
      <p class="lede">65 questions in 90 minutes, scored like the real exam.</p>
      {started.size === 0 && <p class="muted">{MOCKS_EMPTY}</p>}
      {(rows.length > 0 || remix) && (
        <ul class="rows">
          {rows.map((r) => (
            <li key={r.form}>
              <a class="row" href={r.href} data-nav-item>
                <span class="row-title">Mock {r.form}</span>
                <span class="row-meta">{r.meta}</span>
              </a>
            </li>
          ))}
          {remix && (
            <li>
              <a class="row" href={toHash({ kind: 'mock', form: 'remix' })} data-nav-item>
                <span class="row-title">Remix mock</span>
                <span class="row-meta">Practice only</span>
              </a>
            </li>
          )}
        </ul>
      )}
    </>
  );
}
