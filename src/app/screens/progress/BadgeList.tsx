import type { ContentIndex } from '../../../../schemas/chunks.ts';
import { memory } from '../../memory.ts';
import { badgeLine } from '../../progress-lines.ts';

/** The 12 badges (spec 3.10): earned ones with their day, the rest with their rule or the phase that brings them. */
export function BadgeList({ idx }: { idx: ContentIndex }) {
  const earned = memory.value?.badges;
  if (earned === undefined) return null;
  return (
    <>
      <h3>Badges</h3>
      <ul class="badges">
        {idx.badges.map((b) => {
          const got = earned.get(b.id as Parameters<typeof earned.get>[0]);
          return (
            <li key={b.id} class={got === undefined ? 'badge' : 'badge badge-earned'}>
              {got !== undefined && (
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
                  <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2" />
                </svg>
              )}
              {badgeLine(b, got)}
            </li>
          );
        })}
      </ul>
    </>
  );
}
