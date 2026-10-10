import { expect, type Page } from '@playwright/test';
import type { ContentIndex, IncidentView, ModuleChunk, QuestionView } from '../../schemas/chunks.ts';
import { ENGINE_VERSION } from '../../src/engine/replay.ts';
import { fnv1a } from '../../src/engine/rng.ts';
import { KV_KEYS } from '../../src/store/kv.ts';
import { timelineOf } from '../fixtures/events.ts';
import { HOME_TITLE } from './exam-helpers.ts';
import { h1, seedEvents, seedKv } from './helpers.ts';
import { chunkFor, lessonsOf, pickRight, shown } from './questions.ts';

/** Two study days whose `fnv1a` parities differ (tests/unit/incident-app.test.ts pins it), at 10:00 UTC. */
export const DAY1 = '2026-10-20';
export const DAY2 = '2026-10-21';
export const at = (day: string, hour = 10): Date =>
  new Date(`${day}T${String(hour).padStart(2, '0')}:00:00.000Z`);

/** Two made-up incidents of equal score on Module 2, so the day alone decides between them. */
export const SYNTHETIC = [
  { id: 'inc-901', title: 'The ovens went cold', modules: [2] },
  { id: 'inc-902', title: 'The till slowed down', modules: [2] },
] as const;
export const expectedOn = (day: string) => SYNTHETIC[fnv1a(day) % 2] ?? SYNTHETIC[0];

/**
 * Serves the two synthetic incidents in place of any shipped one: the index lists exactly them, every module chunk
 * loses its incidents, and Module 2's chunk carries the two, each with two of its live single practice items.
 */
export async function useSyntheticIncidents(page: Page): Promise<void> {
  await page.route('**/content/index.*.json', async (route) => {
    const response = await route.fetch();
    const index = (await response.json()) as ContentIndex;
    await route.fulfill({ response, json: { ...index, incidents: SYNTHETIC } });
  });
  await page.route('**/content/m*.json', async (route) => {
    const response = await route.fetch();
    const chunk = (await response.json()) as ModuleChunk;
    const singles = chunk.questions.filter((q) => q.type === 'single');
    const incidents: IncidentView[] =
      chunk.module === 2
        ? SYNTHETIC.map((s, i) => ({
            ...s,
            modules: [...s.modules],
            brief: `A made-up incident ${i + 1} for the end-to-end test, told over two steps at the cafe.`,
            steps: singles.slice(2 * i, 2 * i + 2),
          }))
        : [];
    await route.fulfill({ response, json: { ...chunk, incidents } });
  });
}

/** Seeds every Module 2 lesson as read the day before `DAY1`, with the engine version stamped. */
export async function readModule2(page: Page): Promise<void> {
  await page.goto('/');
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  const lessons = await lessonsOf(page, 2);
  await seedKv(page, { [KV_KEYS.engineVersion]: ENGINE_VERSION });
  await seedEvents(
    page,
    timelineOf(
      lessons.map((slug, i) => [
        at('2026-10-19', 9 + i).toISOString(),
        { t: 'lesson.done', note: `m02/${slug}` },
      ]),
    ),
  );
  await expect(h1(page, HOME_TITLE)).toBeVisible();
}

/** Loads Home, which records the day's offer, then moves to the incident screen in the page; returns its heading. */
export async function incidentTitle(page: Page): Promise<string> {
  await page.goto('/');
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  await page.evaluate(() => {
    location.hash = '#/s/incident';
  });
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).not.toHaveText(HOME_TITLE);
  await expect(heading).not.toHaveText('Incident');
  return (await heading.textContent()) ?? '';
}

/** The live single practice items of Module 2 that the two synthetic incidents use as steps. */
export async function incidentSteps(page: Page): Promise<QuestionView[]> {
  return (await chunkFor(page, 2)).filter((q) => q.type === 'single').slice(0, 4);
}

/** Answers the step on screen right, bets Sure and moves on. */
export async function answerStep(page: Page, steps: readonly QuestionView[]): Promise<void> {
  await pickRight(page, await shown(page, steps));
  await page.getByRole('button', { name: /^Sure/ }).click();
  await expect(page.locator('.verdict')).toHaveText(/Correct/);
  await page.getByRole('button', { name: /^Next/ }).click();
}
