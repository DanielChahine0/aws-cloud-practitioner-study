import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LABS_DIR, loadContext } from '../../scripts/content/lib/context.ts';
import { labProblems } from '../../scripts/content/rules/r11-labs.ts';

/** Every shipped lab replays its solution and wrong paths, one named test per lab (spec 9, the Phase 4 exit). */
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const ctx = loadContext(ROOT);

describe('the real labs', () => {
  it('finds every lab file', () => {
    const files = ctx.files.filter((path) => path.startsWith(`${LABS_DIR}/`) && path.endsWith('.yaml'));
    expect(ctx.labs.map((e) => e.path)).toEqual(files);
  });

  if (ctx.labs.length === 0) {
    it('has no labs yet', () => {
      expect(ctx.labs).toEqual([]);
    });
  } else {
    it.each(ctx.labs.map((e) => [e.lab.id, e] as const))(
      '%s replays its solution and wrong paths',
      (_, e) => {
        expect(labProblems(e)).toEqual([]);
      },
    );
  }
});
