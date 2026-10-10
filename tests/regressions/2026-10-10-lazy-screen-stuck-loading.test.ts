import { describe, expect, it, vi } from 'vitest';
import { lazyLoader } from '../../src/app/screens/Lazy.tsx';

describe('a lazy screen remounted while its code loads', () => {
  it('re-renders the new instance when the load resolves between its render and its effect', async () => {
    let resolve: (value: string) => void = () => {};
    const loader = lazyLoader(() => new Promise<string>((done) => (resolve = done)));
    // Instance A renders Loading, starts the load, then unmounts when the route changes.
    const detachA = loader.attach(loader.current(), vi.fn());
    detachA();
    // Instance B renders Loading before the load resolves.
    const shownByB = loader.current();
    expect(shownByB).toBeNull();
    // The load resolves before B's after-paint effect runs.
    resolve('BossScreen');
    await Promise.resolve();
    expect(loader.current()).toBe('BossScreen');
    const settledB = vi.fn();
    loader.attach(shownByB, settledB);
    expect(settledB).toHaveBeenCalledWith(false);
  });
});
