/**
 * The accessibility sweep (spec 7.5, 9): every route kind, in each state that changes its markup, scanned by axe
 * with zero violations and checked for sideways scroll in both projects, then the phone rules at 360 px.
 * `VIEWS` is keyed by `Route['kind']`, so a new route kind fails the typecheck until it has a view here.
 */
import { expect, type Locator, type Page, test } from '@playwright/test';
import type { NewEvent } from '../../schemas/events.ts';
import type { Route } from '../../src/app/router.ts';
import type { MissionStep } from '../../src/engine/missions.ts';
import { ENGINE_VERSION } from '../../src/engine/replay.ts';
import { adrKey, KV_KEYS } from '../../src/store/kv.ts';
import { timelineOf } from '../fixtures/events.ts';
import { E2E_NOW } from '../fixtures/ready-module.ts';
import { HOME_TITLE, readyModule, useSyntheticExam } from './exam-helpers.ts';
import {
  expectNoAxeViolations,
  expectNoSidewaysScroll,
  failOnPageProblems,
  h1,
  seedEvents,
  seedKv,
} from './helpers.ts';
import {
  SYNTHETIC_CONFIGURE_LAB_ID,
  SYNTHETIC_INVESTIGATE_LAB_ID,
  SYNTHETIC_PLACE_LAB_ID,
  SYNTHETIC_POLICY_LAB_ID,
  SYNTHETIC_SIMULATE_LAB_ID,
  SYNTHETIC_SORT_LAB_ID,
  SYNTHETIC_TRACE_LAB_ID,
  syntheticConfigureLab,
  syntheticInvestigateLab,
  syntheticPlaceLab,
  syntheticPolicyLab,
  syntheticSimulateLab,
  syntheticSortLab,
  syntheticTraceLab,
  useSyntheticLab,
} from './lab-helpers.ts';
import { useSyntheticProject } from './project-helpers.ts';

/** Exam screens show synthetic items only, and no trace, screenshot or video of them is kept. */
test.use({ timezoneId: 'UTC', trace: 'off', screenshot: 'off', video: 'off' });

failOnPageProblems();

interface View {
  name: string;
  /** Seeds what the view needs and opens it; the page clock is already installed. */
  open: (page: Page) => Promise<void>;
  /** A locator that shows once the view has settled. */
  ready: (page: Page) => Locator;
  /** The clock for this view, when it is not `E2E_NOW`. */
  now?: string;
  /** Exam screens: axe output names rules and node targets only, never node text. */
  redact?: true;
  /** Screens that announce grade saves or mission steps keep a polite live region in `main`. */
  live?: true;
}

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const NOW_MS = Date.parse(E2E_NOW);
/** The study day after the target exam date, when decisions open. */
const DECISION_DAY = '2026-11-15T09:00:00.000Z';
const DECISION_MS = Date.parse(DECISION_DAY);
const iso = (ms: number): string => new Date(ms).toISOString();

function missionAt(ms: number, mission: string, step: MissionStep): readonly [string, NewEvent] {
  return [iso(ms), { t: 'mission', mission, step }];
}

/** Mission 0 started and verified three days ago, so every other mission is past the gate. */
const GATE: readonly (readonly [string, NewEvent])[] = [
  missionAt(NOW_MS - 3 * DAY_MS, 'mission-00', 'start'),
  missionAt(NOW_MS - 3 * DAY_MS + HOUR_MS, 'mission-00', 'verified'),
];

/** A Module 3 draft with every heading filled and two concepts cited in Why, so it can be self-graded. */
const DRAFT = {
  v: 1,
  context: 'The cafe takes orders online from one shop today.',
  options: 'Functions that run per order, or servers that run all day.',
  decision: 'Run order handling on [[aws-lambda]].',
  why: 'Orders arrive in bursts, which [[aws-lambda]] absorbs, while [[amazon-ec2]] would sit idle between them.',
  tradeoffs: 'A cold start can add a short delay to the first order of the morning.',
  cost: 'The cafe pays per request, which stays low at its order volume.',
  ticks: [],
};

/** Opens Home, stamps the engine version, writes the kv records and the events, and waits for Home again. */
async function seed(
  page: Page,
  items: readonly (readonly [string, NewEvent])[],
  kv: Readonly<Record<string, unknown>> = {},
): Promise<void> {
  await page.goto('/');
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  await seedKv(page, { [KV_KEYS.engineVersion]: ENGINE_VERSION, ...kv });
  await seedEvents(page, timelineOf(items));
  await expect(h1(page, HOME_TITLE)).toBeVisible();
}

/** Opens a path. */
async function visit(page: Page, path: string): Promise<void> {
  await page.goto(path);
}

/** A plan record with every plan-fit service on except `off`, read from the index the page loaded. */
async function planRecord(page: Page, off: readonly string[]): Promise<Record<string, unknown>> {
  const services = await page.evaluate(async () => {
    const name = document.querySelector<HTMLMetaElement>('meta[name="ccp-content"]')?.content ?? '';
    const index = (await (await fetch(name)).json()) as { missions: { id: string; services: string[] }[] };
    return [...new Set(index.missions.filter((m) => m.id !== 'mission-00').flatMap((m) => m.services))];
  });
  return {
    plan: 'free',
    credits: 120,
    endsOn: '2027-04-01',
    services: Object.fromEntries(services.map((s) => [s, !off.includes(s)])),
    recordedAt: iso(NOW_MS - 3 * DAY_MS),
  };
}

/** Seeds Mission 0 as verified, a plan without the services in `off`, and the events in `items`. */
async function pastTheGate(
  page: Page,
  items: readonly (readonly [string, NewEvent])[],
  off: readonly string[] = [],
): Promise<void> {
  await page.goto('/');
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  await seed(page, [...GATE, ...items], { [KV_KEYS.plan]: await planRecord(page, off) });
}

/** Starts Mock A; the caller serves the synthetic exam first. */
async function startMock(page: Page): Promise<void> {
  await visit(page, '/#/s/mock/a');
  await page.getByRole('button', { name: 'Start Mock A', exact: true }).click();
  await expect(page.locator('section.exam #stem')).toBeFocused();
}

const VIEWS: Record<Route['kind'], readonly View[]> = {
  home: [
    { name: 'Home on the first run', open: (p) => visit(p, '/'), ready: (p) => h1(p, HOME_TITLE) },
    {
      name: 'Home with Module 3 ready for its boss',
      open: (p) => readyModule(p, 3),
      ready: (p) => p.locator('main a.hex .hex-dot').first(),
    },
  ],
  module: [
    {
      name: 'Module 5 before any lesson',
      open: (p) => visit(p, '/#/m/05'),
      ready: (p) => p.getByRole('heading', { level: 2, name: 'Key takeaways' }),
    },
    {
      name: 'Module 3 with its boss ready',
      open: async (p) => {
        await readyModule(p, 3);
        await visit(p, '/#/m/03');
      },
      ready: (p) => p.getByRole('link', { name: 'Start the boss (15 questions, 21 min)', exact: true }),
    },
  ],
  lesson: [
    {
      name: 'a lesson with an update line',
      open: (p) => visit(p, '/#/m/11/l/aws-support-plans'),
      ready: (p) => p.locator('li.update').first(),
    },
  ],
  missions: [
    {
      name: 'the missions list on the first run, with Already done',
      open: (p) => visit(p, '/#/missions'),
      ready: (p) => p.getByRole('heading', { name: 'Done some missions already?' }),
    },
    {
      name: 'the missions list past the gate, with Mission 3 overdue',
      open: async (p) => {
        await pastTheGate(p, [missionAt(NOW_MS - 3 * HOUR_MS, 'mission-03', 'start')]);
        await visit(p, '/#/missions');
      },
      ready: (p) =>
        p.getByText('Real AWS, done by hand in your own account, one mission at a time.', { exact: true }),
    },
  ],
  mission: [
    {
      name: 'Mission 0 before Start',
      open: (p) => visit(p, '/#/missions/mission-00'),
      ready: (p) => p.getByRole('button', { name: 'Start Mission 0', exact: true }),
    },
    {
      name: 'Mission 0 started, with its Plan status form',
      open: async (p) => {
        await visit(p, '/#/missions/mission-00');
        await p.getByRole('button', { name: 'Start Mission 0', exact: true }).click();
      },
      ready: (p) => p.getByRole('button', { name: 'Save plan status', exact: true }),
      live: true,
    },
    {
      name: 'Mission 1 verified, waiting for its usage check',
      open: async (p) => {
        await pastTheGate(p, [
          missionAt(NOW_MS - 2 * DAY_MS, 'mission-01', 'start'),
          missionAt(NOW_MS - 2 * DAY_MS + HOUR_MS, 'mission-01', 'verified'),
        ]);
        await visit(p, '/#/missions/mission-01');
      },
      ready: (p) => p.getByRole('button', { name: 'Cost stays within the expected credits', exact: true }),
    },
    {
      name: 'Mission 2 locked by the gate',
      open: (p) => visit(p, '/#/missions/mission-02'),
      ready: (p) => p.getByText('Locked until Mission 0 is verified.', { exact: true }),
    },
    {
      name: 'Mission 3 live, with the chip',
      open: async (p) => {
        await pastTheGate(p, [missionAt(NOW_MS - HOUR_MS / 2, 'mission-03', 'start')]);
        await visit(p, '/#/missions/mission-03');
      },
      ready: (p) => p.getByRole('button', { name: 'Cleaned up', exact: true }),
      live: true,
    },
    {
      name: 'Mission 3 cleaned up, waiting for its usage check',
      open: async (p) => {
        await pastTheGate(p, [
          missionAt(NOW_MS - DAY_MS - 2 * HOUR_MS, 'mission-03', 'start'),
          missionAt(NOW_MS - DAY_MS - HOUR_MS, 'mission-03', 'verified'),
          missionAt(NOW_MS - DAY_MS, 'mission-03', 'cleaned'),
        ]);
        await visit(p, '/#/missions/mission-03');
      },
      ready: (p) => p.getByRole('button', { name: 'Usage is back to baseline', exact: true }),
      live: true,
    },
    {
      name: 'Mission 4 not on the plan',
      open: async (p) => {
        await pastTheGate(p, [], ['Amazon DynamoDB']);
        await visit(p, '/#/missions/mission-04');
      },
      ready: (p) => p.getByText('Not on your plan: Amazon DynamoDB.', { exact: true }),
    },
  ],
  check: [
    {
      name: 'a lesson check',
      open: (p) => visit(p, '/#/s/check/m03/aws-lambda'),
      ready: (p) => p.locator('section.runner #stem'),
    },
  ],
  quiz: [
    {
      name: 'a module quiz',
      open: async (p) => {
        await readyModule(p, 3);
        await visit(p, '/#/s/quiz/m03');
      },
      ready: (p) => p.locator('section.runner #stem'),
    },
  ],
  review: [
    {
      name: 'the review with nothing due',
      open: (p) => visit(p, '/#/s/review'),
      ready: (p) => p.getByText('Nothing due.', { exact: true }),
    },
  ],
  boss: [
    {
      name: 'a boss start screen',
      open: async (p) => {
        await useSyntheticExam(p);
        await readyModule(p, 3);
        await visit(p, '/#/s/boss/m03');
      },
      ready: (p) => p.getByRole('button', { name: 'Start the boss', exact: true }),
      redact: true,
    },
    {
      name: 'a running boss',
      open: async (p) => {
        await useSyntheticExam(p);
        await readyModule(p, 3);
        await visit(p, '/#/s/boss/m03');
        await p.getByRole('button', { name: 'Start the boss', exact: true }).click();
      },
      ready: (p) => p.locator('section.exam #stem'),
      redact: true,
    },
  ],
  mocks: [{ name: 'the mock list', open: (p) => visit(p, '/#/s/mock'), ready: (p) => h1(p, 'Mock exams') }],
  mock: [
    {
      name: 'a mock start screen',
      open: async (p) => {
        await useSyntheticExam(p);
        await visit(p, '/#/s/mock/a');
      },
      ready: (p) => p.getByRole('button', { name: 'Start Mock A', exact: true }),
      redact: true,
    },
    {
      name: 'a running mock with the question grid open',
      open: async (p) => {
        await useSyntheticExam(p);
        await startMock(p);
        await p.keyboard.press('g');
      },
      ready: (p) => p.getByRole('navigation', { name: 'Questions' }),
      redact: true,
    },
    {
      name: 'a mock at its submit dialog',
      open: async (p) => {
        await useSyntheticExam(p);
        await startMock(p);
        await p.keyboard.press('Control+Enter');
      },
      ready: (p) => p.getByRole('heading', { name: 'Submit the exam?', exact: true }),
      redact: true,
    },
  ],
  focus: [
    {
      name: 'a focus quiz',
      open: async (p) => {
        await readyModule(p, 3);
        await visit(p, '/#/s/focus/m03');
      },
      ready: (p) => p.locator('section.runner #stem'),
    },
  ],
  results: [
    {
      name: 'mock results with the error review',
      open: async (p) => {
        await useSyntheticExam(p);
        await startMock(p);
        await p.keyboard.press('Control+Enter');
        await p.locator('dialog.confirm').getByRole('button', { name: 'Submit', exact: true }).click();
      },
      ready: (p) => p.locator('p.score-line'),
      redact: true,
    },
  ],
  lab: [
    {
      name: 'a Sort lab',
      open: async (p) => {
        await useSyntheticLab(p, syntheticSortLab);
        await visit(p, `/#/m/01/lab/${SYNTHETIC_SORT_LAB_ID}`);
      },
      ready: (p) => p.getByRole('region', { name: 'Workspace' }),
    },
    {
      name: 'a Sort lab after a failed Check',
      open: async (p) => {
        await useSyntheticLab(p, syntheticSortLab);
        await visit(p, `/#/m/01/lab/${SYNTHETIC_SORT_LAB_ID}`);
        await p.getByRole('button', { name: /^Check/ }).click();
      },
      ready: (p) => p.getByRole('region', { name: 'Workspace' }),
    },
    {
      name: 'a Configure lab',
      open: async (p) => {
        await useSyntheticLab(p, syntheticConfigureLab);
        await visit(p, `/#/m/01/lab/${SYNTHETIC_CONFIGURE_LAB_ID}`);
      },
      ready: (p) => p.getByRole('region', { name: 'Workspace' }),
    },
    {
      name: 'a Simulate lab',
      open: async (p) => {
        await useSyntheticLab(p, syntheticSimulateLab);
        await visit(p, `/#/m/01/lab/${SYNTHETIC_SIMULATE_LAB_ID}`);
      },
      ready: (p) => p.getByRole('region', { name: 'Workspace' }),
    },
    {
      name: 'a Place lab',
      open: async (p) => {
        await useSyntheticLab(p, syntheticPlaceLab);
        await visit(p, `/#/m/01/lab/${SYNTHETIC_PLACE_LAB_ID}`);
      },
      ready: (p) => p.getByRole('region', { name: 'Workspace' }),
    },
    {
      name: 'a network Trace lab',
      open: async (p) => {
        await useSyntheticLab(p, syntheticTraceLab);
        await visit(p, `/#/m/01/lab/${SYNTHETIC_TRACE_LAB_ID}`);
      },
      ready: (p) => p.getByRole('region', { name: 'Workspace' }),
    },
    {
      name: 'a policy Trace lab',
      open: async (p) => {
        await useSyntheticLab(p, syntheticPolicyLab);
        await visit(p, `/#/m/01/lab/${SYNTHETIC_POLICY_LAB_ID}`);
      },
      ready: (p) => p.getByRole('region', { name: 'Workspace' }),
    },
    {
      name: 'an Investigate lab',
      open: async (p) => {
        await useSyntheticLab(p, syntheticInvestigateLab);
        await visit(p, `/#/m/01/lab/${SYNTHETIC_INVESTIGATE_LAB_ID}`);
      },
      ready: (p) => p.getByRole('region', { name: 'Workspace' }),
    },
  ],
  incident: [
    {
      name: 'the incident before Module 2 is read',
      open: (p) => visit(p, '/#/s/incident'),
      ready: (p) => p.getByText('Starts after Module 2.', { exact: true }),
    },
  ],
  lightning: [
    {
      name: 'the lightning round before 20 concepts settle',
      open: (p) => visit(p, '/#/s/lightning'),
      ready: (p) => p.getByText('Opens after 20 concepts settle.', { exact: true }),
    },
  ],
  project: [
    {
      name: 'the capstone cards',
      open: async (p) => {
        await useSyntheticProject(p);
        await visit(p, '/#/project');
      },
      ready: (p) =>
        p.getByText('Thirteen decisions, one per module, each a short ADR graded against the rubric.', {
          exact: true,
        }),
    },
  ],
  decision: [
    {
      name: 'a decision waiting for the exam',
      open: async (p) => {
        await useSyntheticProject(p);
        await readyModule(p, 3);
        await visit(p, '/#/project/03');
      },
      ready: (p) => p.getByText('Opens after your exam, on Sun 15 Nov.', { exact: true }).first(),
    },
    {
      name: 'an open decision editor',
      now: DECISION_DAY,
      open: async (p) => {
        await useSyntheticProject(p);
        await readyModule(p, 3);
        await visit(p, '/#/project/03');
      },
      ready: (p) => p.getByRole('heading', { level: 2, name: 'Self-grade', exact: true }),
      live: true,
    },
    {
      name: 'an open decision editor with a complete draft',
      now: DECISION_DAY,
      open: async (p) => {
        await useSyntheticProject(p);
        await readyModule(p, 3);
        await seed(p, [], { [adrKey(3)]: DRAFT });
        await visit(p, '/#/project/03');
      },
      ready: (p) => p.getByRole('button', { name: 'Save self-grade', exact: true }),
      live: true,
    },
    {
      name: 'a self-graded decision with its key points revealed',
      now: DECISION_DAY,
      open: async (p) => {
        await useSyntheticProject(p);
        await seed(
          p,
          [[iso(DECISION_MS - HOUR_MS), { t: 'decision', module: 3, stage: 'self', scores: [2, 2, 1, 1] }]],
          { [adrKey(3)]: DRAFT },
        );
        await visit(p, '/#/project/03');
      },
      ready: (p) => p.getByRole('heading', { name: 'Reference key points' }),
      live: true,
    },
  ],
  'not-found': [
    {
      name: 'the not-found screen',
      open: (p) => visit(p, '/#/nowhere'),
      ready: (p) => h1(p, 'Page not found'),
    },
  ],
};

test.describe('every screen has no axe violations and no sideways scroll', () => {
  for (const [kind, views] of Object.entries(VIEWS)) {
    for (const view of views) {
      test(`${kind}: ${view.name}`, async ({ page }) => {
        await page.clock.install({ time: new Date(view.now ?? E2E_NOW) });
        await view.open(page);
        await expect(view.ready(page)).toBeVisible();
        if (view.live === true)
          await expect(page.locator('main [aria-live="polite"]').first()).toBeAttached();
        await expectNoAxeViolations(page, view.redact === true ? { redact: true } : {});
        await expectNoSidewaysScroll(page);
      });
    }
  }
});

test('Progress with the capstone drift line has no axe violations', async ({ page }) => {
  await page.clock.install({ time: new Date(DECISION_DAY) });
  await seed(page, [
    [iso(DECISION_MS - 2 * HOUR_MS), { t: 'decision', module: 3, stage: 'self', scores: [2, 2, 1, 1] }],
    [
      iso(DECISION_MS - HOUR_MS),
      { t: 'decision', module: 3, stage: 'final', scores: [2, 2, 2, 1], keyPoints: [] },
    ],
  ]);
  await page.keyboard.press('g');
  await page.keyboard.press('p');
  await expect(page.getByText(/^Capstone drift: \+1 over 1 decision/)).toBeVisible();
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);
});

test.describe('the phone layout at 360 px', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'webkit-mobile', 'the phone layout runs on webkit-mobile only');
    await page.setViewportSize({ width: 360, height: 740 });
    await page.clock.install({ time: new Date(E2E_NOW) });
  });

  test('the 4-5-4 hex map fits', async ({ page }) => {
    await visit(page, '/');
    const hexes = page.locator('main a.hex');
    await expect(hexes).toHaveCount(13);
    for (const hex of await hexes.all()) {
      const box = await hex.boundingBox();
      expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(360);
    }
    await expectNoSidewaysScroll(page);
  });

  test('runner options are full width and at least 44 px tall, with Check and Sure in a sticky bar', async ({
    page,
  }) => {
    await visit(page, '/#/s/check/m03/aws-lambda');
    const options = page.locator('section.runner fieldset.options').first();
    await expect(options).toBeVisible();
    const field = await options.boundingBox();
    for (const label of await options.locator('label.option').all()) {
      const box = await label.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual((field?.width ?? 0) - 2);
    }
    const bar = page.locator('.submit-bar');
    expect(await bar.evaluate((el) => getComputedStyle(el).position)).toMatch(/^(sticky|fixed)$/);
    await expect(bar.getByRole('button', { name: /^Check/ })).toBeInViewport();
    await expect(bar.getByRole('button', { name: /^Sure/ })).toBeInViewport();
    await expectNoSidewaysScroll(page);
  });

  for (const path of ['/#/missions/mission-00', '/#/missions/mission-03', '/#/s/mock']) {
    test(`${path} needs no sideways scroll`, async ({ page }) => {
      await visit(page, path);
      await expect(page.locator('main h1')).toBeVisible();
      await expectNoSidewaysScroll(page);
    });
  }
});
