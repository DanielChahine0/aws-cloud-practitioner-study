import { describe, expect, it } from 'vitest';
import { sourceProblem } from '../../scripts/content/rules/r13-sources.ts';

const DOCS = 'https://docs.aws.amazon.com/x.html';

describe('sourceProblem', () => {
  it('accepts an AWS source checked 180 days ago or less', () => {
    expect(sourceProblem(DOCS, '2026-04-13', '2026-10-10')).toBeNull();
    expect(
      sourceProblem('https://aws.amazon.com/premiumsupport/plans/', '2026-10-10', '2026-10-10'),
    ).toBeNull();
  });

  it('rejects other hosts, stale or future dates, and non-URLs', () => {
    expect(sourceProblem('https://repost.aws/x', '2026-10-01', '2026-10-10')).toMatch(
      /not on aws.amazon.com/,
    );
    expect(sourceProblem(DOCS, '2026-04-12', '2026-10-10')).toMatch(/181 days old/);
    expect(sourceProblem(DOCS, '2026-10-11', '2026-10-10')).toMatch(/in the future/);
    expect(sourceProblem('not a url', '2026-10-01', '2026-10-10')).toMatch(/is not a URL/);
  });
});
