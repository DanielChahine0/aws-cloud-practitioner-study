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
    { kind: 'not-found', hash: '#/nowhere' },
  ];

  it.each(routes)('round-trips $kind through parseHash', (route) => {
    expect(parseHash(toHash(route))).toEqual(route);
  });

  it('pads module numbers to two digits', () => {
    expect(toHash({ kind: 'module', module: 5 })).toBe('#/m/05');
    expect(pad2(13)).toBe('13');
  });
});
