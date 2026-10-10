import type { ContentIndex } from '../../../../schemas/chunks.ts';
import { studyDay } from '../../../engine/day.ts';
import { goNoGo } from '../../../engine/readiness.ts';
import { now } from '../../clock.ts';
import { goNoGoLine, readinessLine } from '../../home.ts';
import { memory, readinessNow } from '../../memory.ts';
import { domainValue, memoryMockLine } from '../../progress-lines.ts';

/**
 * Readiness with its parts, one bar per exam domain, and the go/no-go line in its window (spec 3.9). Each domain's
 * name and number share a line above its full-width bar, so the number never wraps away from the name.
 */
export function ReadinessSection({ idx }: { idx: ContentIndex }) {
  const r = readinessNow.value;
  if (r === null) return null;
  const examDate = memory.value?.examDate ?? null;
  const due = examDate !== null && goNoGo({ examDate, today: studyDay(now.value), readiness: r });
  return (
    <>
      <h3>Readiness</h3>
      <p class="progress-line readiness-line">{readinessLine(r)}</p>
      <p class="muted">{memoryMockLine(r.memory, r.mock)}</p>
      <ul class="readiness-bars">
        {idx.blueprint.domains.map((d) => {
          const value = r.domains[d.id as '1' | '2' | '3' | '4'] ?? 0;
          return (
            <li key={d.id} class="bar-row">
              <span class="bar-label">{d.name}</span> <span class="bar-value">{domainValue(value)}</span>
              <span class="bar-track" aria-hidden="true">
                <span
                  class="bar-fill"
                  style={{ width: `${Math.floor(100 * value)}%`, background: `var(--d${d.id})` }}
                />
              </span>
            </li>
          );
        })}
      </ul>
      {due && examDate !== null && <p class="go-no-go">{goNoGoLine(examDate, r.label)}</p>}
    </>
  );
}
