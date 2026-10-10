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
    expect(parseHash('#/s/lightning')).toEqual({ kind: 'lightning' });
  });

  it('reads the daily incident route, and nothing under it', () => {
    expect(parseHash('#/s/incident')).toEqual({ kind: 'incident' });
    expect(toHash({ kind: 'incident' })).toBe('#/s/incident');
    expect(parseHash('#/s/incident/inc-001')).toEqual({ kind: 'not-found', hash: '#/s/incident/inc-001' });
  });

  it('reads the boss, mock, focus and results routes', () => {
    expect(parseHash('#/s/boss/m05')).toEqual({ kind: 'boss', module: 5 });
    expect(parseHash('#/s/mock')).toEqual({ kind: 'mocks' });
    expect(parseHash('#/s/mock/a')).toEqual({ kind: 'mock', form: 'a' });
    expect(parseHash('#/s/mock/d')).toEqual({ kind: 'mock', form: 'd' });
    expect(parseHash('#/s/mock/remix')).toEqual({ kind: 'mock', form: 'remix' });
    expect(parseHash('#/s/focus/2.3')).toEqual({ kind: 'focus', scope: '2.3' });
    expect(parseHash('#/s/focus/3.8')).toEqual({ kind: 'focus', scope: '3.8' });
    expect(parseHash('#/s/focus/m05')).toEqual({ kind: 'focus', scope: 'm05' });
    expect(parseHash('#/r/01JA0000000000000000000000')).toEqual({
      kind: 'results',
      sid: '01JA0000000000000000000000',
    });
  });

  it('reads a lab route only when its module matches the module in the lab id', () => {
    expect(parseHash('#/m/03/lab/lab-m03-pick-the-compute')).toEqual({
      kind: 'lab',
      module: 3,
      id: 'lab-m03-pick-the-compute',
    });
    expect(toHash({ kind: 'lab', module: 3, id: 'lab-m03-pick-the-compute' })).toBe(
      '#/m/03/lab/lab-m03-pick-the-compute',
    );
    for (const hash of [
      '#/m/04/lab/lab-m03-pick-the-compute',
      '#/m/03/lab/lab-m3-pick-the-compute',
      '#/m/03/lab/pick-the-compute',
      '#/m/03/lab/lab-m03-',
      '#/m/14/lab/lab-m14-x',
      '#/m/03/lab/',
    ]) {
      expect(parseHash(hash)).toEqual({ kind: 'not-found', hash });
    }
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
      '#/s/mock/e',
      '#/s/mock/A',
      '#/s/mock/',
      '#/s/boss/m14',
      '#/s/boss/05',
      '#/s/focus/4.4',
      '#/s/focus/m14',
      '#/s/focus/',
      '#/r/not-a-ulid',
      '#/r/01JA000000000000000000000U',
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
    { kind: 'lightning' },
    { kind: 'boss', module: 5 },
    { kind: 'mocks' },
    { kind: 'mock', form: 'b' },
    { kind: 'mock', form: 'remix' },
    { kind: 'focus', scope: '2.3' },
    { kind: 'focus', scope: 'm05' },
    { kind: 'results', sid: '01JA0000000000000000000000' },
    { kind: 'incident' },
    { kind: 'not-found', hash: '#/nowhere' },
  ];

  it.each(routes)('round-trips $kind through parseHash', (route) => {
    expect(parseHash(toHash(route))).toEqual(route);
  });

  it('writes the practice routes with the module as mNN', () => {
    expect(toHash({ kind: 'check', module: 3, slug: 'aws-lambda' })).toBe('#/s/check/m03/aws-lambda');
    expect(toHash({ kind: 'quiz', module: 3 })).toBe('#/s/quiz/m03');
    expect(toHash({ kind: 'review' })).toBe('#/s/review');
    expect(toHash({ kind: 'lightning' })).toBe('#/s/lightning');
    expect(toHash({ kind: 'boss', module: 5 })).toBe('#/s/boss/m05');
    expect(toHash({ kind: 'mocks' })).toBe('#/s/mock');
    expect(toHash({ kind: 'mock', form: 'a' })).toBe('#/s/mock/a');
    expect(toHash({ kind: 'focus', scope: '2.3' })).toBe('#/s/focus/2.3');
    expect(toHash({ kind: 'results', sid: '01JA0000000000000000000000' })).toBe(
      '#/r/01JA0000000000000000000000',
    );
  });

  it('pads module numbers to two digits', () => {
    expect(toHash({ kind: 'module', module: 5 })).toBe('#/m/05');
    expect(pad2(13)).toBe('13');
  });
});
