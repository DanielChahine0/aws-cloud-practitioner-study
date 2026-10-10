import { expect, test } from '@playwright/test';
import { failOnPageProblems, seedEvents } from '../e2e/helpers.ts';
import { eventsOf } from '../fixtures/events.ts';

failOnPageProblems();

test('the rank button name starts with the plan name the bar shows at each width (WCAG 2.5.3)', async ({
  page,
}) => {
  await page.goto('/');
  await seedEvents(page, eventsOf({ t: 'rank', rank: 'business-support-plus' }));
  // Under 480 px the bar shows the short name, so a voice command for `Business+` must match the button.
  const visible = test.info().project.name === 'webkit-mobile' ? 'Business+' : 'Business Support+';
  const button = page.locator('button.topbar-rank');
  await expect(button.getByText(visible, { exact: true })).toBeVisible();
  await expect(button).toHaveAccessibleName(`${visible} rank, open Progress`);
});
