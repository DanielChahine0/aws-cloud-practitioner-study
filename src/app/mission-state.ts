import { signal } from '@preact/signals';

/**
 * The mission state of `missions.ts`, which `import()` loads as the app starts, so the mission stages stay out of the
 * initial bundle (the 50 KB budget of spec 2.10).
 * The top bar's live chip and Next's safety entry read it; undefined while it loads, null when the load failed.
 */
export const missionState = signal<typeof import('./missions.ts') | null | undefined>(undefined);

void import('./missions.ts').then(
  (m) => {
    missionState.value = m;
  },
  () => {
    missionState.value = null;
  },
);
