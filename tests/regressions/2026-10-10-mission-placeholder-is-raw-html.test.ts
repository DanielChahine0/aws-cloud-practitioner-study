import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { renderDoc } from '../../scripts/content/lib/render.ts';

// Mission 3's Cleanup named its log group leftover as a bare /aws/lambda/<function>, which marked reads as an
// inline HTML tag, so content:validate passed while the build threw "raw HTML is not allowed in Markdown".
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const missions = loadContext(ROOT).missions;

describe('mission pages render without raw HTML', () => {
  for (const mission of missions) {
    it(`${mission.id} renders`, () => {
      expect(() =>
        renderDoc(mission.body, { path: mission.path, routes: new Map(), terms: null }),
      ).not.toThrow();
    });
  }
});
