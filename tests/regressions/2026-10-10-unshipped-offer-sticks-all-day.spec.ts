import { expect, test } from '@playwright/test';
import { ENGINE_VERSION } from '../../src/engine/replay.ts';
import { KV_KEYS } from '../../src/store/kv.ts';
import { HOME_TITLE } from '../e2e/exam-helpers.ts';
import { failOnPageProblems, h1, seedEvents, seedKv } from '../e2e/helpers.ts';
import { at, DAY1, expectedOn, useSyntheticIncidents } from '../e2e/incident-helpers.ts';
import { lessonsOf } from '../e2e/questions.ts';
import { timelineOf } from '../fixtures/events.ts';

/**
 * An offer whose incident no longer ships, after a deploy demoted one of its steps or a backup import, stayed today's
 * incident: the incident screen said Loading all day and Home never offered a shipped one instead (spec 4.5, 8.4).
 */
failOnPageProblems();
test.use({ timezoneId: 'UTC' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: at(DAY1) });
  await useSyntheticIncidents(page);
});

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: 'ignoreErrors' });
});

test('an offer that no longer ships gives way to a shipped one the same day', async ({ page }) => {
  await page.goto('/');
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  const lessons = await lessonsOf(page, 2);
  await seedKv(page, { [KV_KEYS.engineVersion]: ENGINE_VERSION });
  await seedEvents(
    page,
    timelineOf([
      ...lessons.map(
        (slug, i) =>
          [at('2026-10-19', 9 + i).toISOString(), { t: 'lesson.done', note: `m02/${slug}` }] as const,
      ),
      [at(DAY1, 9).toISOString(), { t: 'incident.offered', incident: 'inc-900' }] as const,
    ]),
  );
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  await page.evaluate(() => {
    location.hash = '#/s/incident';
  });
  await expect(h1(page, expectedOn(DAY1).title)).toBeVisible();
  await expect(page.locator('section.runner')).toBeVisible();
});
