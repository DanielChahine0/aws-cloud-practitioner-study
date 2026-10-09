import { unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { FIXTURE_TODAY, makeFixtureRoot } from '../fixtures/content-root.ts';

describe('loadContext', () => {
  it('loads the fixture tree with no errors', () => {
    const ctx = loadContext(makeFixtureRoot(), { today: FIXTURE_TODAY });
    expect(ctx.loadErrors).toEqual([]);
    expect(ctx.notes.map((n) => n.id)).toEqual(['m01', 'm01/what-a-bakery-cloud-is']);
    expect(ctx.concepts.map((c) => c.id)).toEqual(['shared-kitchen', 'per-minute-rental']);
    expect(ctx.blueprint?.tasks).toHaveLength(19);
    expect(ctx.missions.map((m) => m.id)).toEqual(['mission-00']);
    expect([...(ctx.fingerprints.get(1)?.items.keys() ?? [])]).toEqual(['kc-01', 'quiz-01']);
    expect(ctx.allow.length).toBeGreaterThan(0);
    expect(ctx.shared.map((s) => s.path)).toEqual([
      'resources/README.md',
      'resources/concepts.md',
      'resources/glossary.md',
    ]);
    expect(ctx.head('content/concepts.yaml')).toBeNull();
  });

  it('reports a missing required file as an R1 finding', () => {
    const root = makeFixtureRoot();
    unlinkSync(join(root, 'content', 'concepts.yaml'));
    expect(loadContext(root, { today: FIXTURE_TODAY }).loadErrors).toEqual([
      { rule: 'R1', file: 'content/concepts.yaml', message: 'required file is missing' },
    ]);
  });

  it('names the concept in schema errors and keeps the valid entries', () => {
    const root = makeFixtureRoot();
    writeFileSync(
      join(root, 'content', 'concepts.yaml'),
      '- id: half-done\n  name: Half done\n  home: m01/what-a-bakery-cloud-is\n  anchor: ""\n- id: shared-kitchen\n  name: Shared kitchen\n  home: m01/what-a-bakery-cloud-is\n  anchor: shared-kitchen\n  tasks: ["1.1"]\n',
    );
    const ctx = loadContext(root, { today: FIXTURE_TODAY });
    expect(ctx.loadErrors.map((f) => f.message.split(':')[0])).toEqual([
      '[half-done].anchor',
      '[half-done].tasks',
    ]);
    expect(ctx.concepts.map((c) => c.id)).toEqual(['shared-kitchen']);
  });
});
