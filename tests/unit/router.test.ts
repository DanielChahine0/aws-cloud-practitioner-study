import { describe, expect, it } from 'vitest';
import { pad2, parseHash, type Route, toHash } from '../../src/app/router.ts';

describe('parseHash', () => {
  it('reads every route the site has', () => {
    expect(parseHash('')).toEqual({ kind: 'home' });
    expect(parseHash('#/')).toEqual({ kind: 'home' });
    expect(parseHash('#/missions')).toEqual({ kind: 'missions' });
    expect(parseHash('#/m/03')).toEqual({ kind: 'module', module: 3 });
    expect(parseHash('#/m/03/l/aws-lambda')).toEqual({
      kind: 'lesson',
      module: 3,
      slug: 'aws-lambda',
      anchor: null,
    });
    expect(parseHash('#/m/11/l/aws-support-plans/end-of-support-notice')).toEqual({
      kind: 'lesson',
      module: 11,
      slug: 'aws-support-plans',
      anchor: 'end-of-support-notice',
    });
    expect(parseHash('#/missions/mission-00')).toEqual({ kind: 'mission', id: 'mission-00' });
    expect(parseHash('#/s/check/m03/aws-lambda')).toEqual({ kind: 'check', module: 3, slug: 'aws-lambda' });
    expect(parseHash('#/s/quiz/m13')).toEqual({ kind: 'quiz', module: 13 });
    expect(parseHash('#/s/review')).toEqual({ kind: 'review' });
  });

  it('sends anything else to not-found with the hash it got', () => {
    for (const hash of [
      '#/m/00',
      '#/m/14',
      '#/m/3',
      '#/m/03/l/',
      '#/m/03/l/Bad_Slug',
      '#/missions/m-1',
      '#/x',
      '#m/03',
      '#/s/check/m14/x',
      '#/s/check/m03',
      '#/s/quiz/m00',
      '#/s/quiz/03',
      '#/s/lightning/m03',
      '#/s/review/m03',
      '#/s/reviews',
    ]) {
      expect(parseHash(hash)).toEqual({ kind: 'not-found', hash });
    }
  });
});

describe('toHash', () => {
  const routes: Route[] = [
    { kind: 'home' },
    { kind: 'module', module: 5 },
    { kind: 'lesson', module: 3, slug: 'aws-lambda', anchor: null },
    { kind: 'lesson', module: 11, slug: 'aws-support-plans', anchor: 'plan-comparison' },
    { kind: 'missions' },
    { kind: 'mission', id: 'mission-01' },
    { kind: 'check', module: 3, slug: 'aws-lambda' },
    { kind: 'quiz', module: 3 },
    { kind: 'review' },
    { kind: 'not-found', hash: '#/nowhere' },
  ];

  it.each(routes)('round-trips $kind through parseHash', (route) => {
    expect(parseHash(toHash(route))).toEqual(route);
  });

  it('writes the practice routes with the module as mNN', () => {
    expect(toHash({ kind: 'check', module: 3, slug: 'aws-lambda' })).toBe('#/s/check/m03/aws-lambda');
    expect(toHash({ kind: 'quiz', module: 3 })).toBe('#/s/quiz/m03');
    expect(toHash({ kind: 'review' })).toBe('#/s/review');
  });

  it('pads module numbers to two digits', () => {
    expect(toHash({ kind: 'module', module: 5 })).toBe('#/m/05');
    expect(pad2(13)).toBe('13');
  });
});
