import { describe, expect, it, vi } from 'vitest';
import { lazyLoader } from '../../src/app/screens/Lazy.tsx';

const flush = () => new Promise((done) => setTimeout(done, 0));

describe('lazyLoader', () => {
  it('runs one load that every attached instance joins', async () => {
    const load = vi.fn(async () => 'screen');
    const loader = lazyLoader(load);
    const first = vi.fn();
    const second = vi.fn();
    loader.attach(null, first);
    loader.attach(null, second);
    await flush();
    expect(load).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledWith(false);
    expect(second).toHaveBeenCalledWith(false);
    expect(loader.current()).toBe('screen');
  });

  it('never calls a detached instance', async () => {
    const loader = lazyLoader(async () => 'screen');
    const settled = vi.fn();
    loader.attach(null, settled)();
    await flush();
    expect(settled).not.toHaveBeenCalled();
  });

  it('leaves an instance that already showed the loaded screen alone', async () => {
    const loader = lazyLoader(async () => 'screen');
    loader.attach(null, vi.fn());
    await flush();
    const settled = vi.fn();
    loader.attach(loader.current(), settled);
    expect(settled).not.toHaveBeenCalled();
  });

  it('reports a failed load and retries it on the next attach', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce('screen');
    const loader = lazyLoader<string>(load);
    const failed = vi.fn();
    loader.attach(null, failed);
    await flush();
    expect(failed).toHaveBeenCalledWith(true);
    expect(loader.current()).toBeNull();
    const retried = vi.fn();
    loader.attach(null, retried);
    await flush();
    expect(load).toHaveBeenCalledTimes(2);
    expect(retried).toHaveBeenCalledWith(false);
  });

  it('preloads once, so a later attach shows the screen without another load', async () => {
    const load = vi.fn(async () => 'screen');
    const loader = lazyLoader(load);
    loader.preload();
    loader.preload();
    await flush();
    expect(loader.current()).toBe('screen');
    const settled = vi.fn();
    loader.attach(loader.current(), settled);
    expect(load).toHaveBeenCalledTimes(1);
    expect(settled).not.toHaveBeenCalled();
  });

  it('lets an attach join a preload still in flight', async () => {
    const load = vi.fn(async () => 'screen');
    const loader = lazyLoader(load);
    loader.preload();
    const settled = vi.fn();
    loader.attach(null, settled);
    await flush();
    expect(load).toHaveBeenCalledTimes(1);
    expect(settled).toHaveBeenCalledWith(false);
  });

  it('keeps a failed preload silent and retries it on the next attach', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce('screen');
    const loader = lazyLoader<string>(load);
    loader.preload();
    await flush();
    expect(loader.current()).toBeNull();
    const settled = vi.fn();
    loader.attach(null, settled);
    await flush();
    expect(load).toHaveBeenCalledTimes(2);
    expect(settled).toHaveBeenCalledWith(false);
  });
});
