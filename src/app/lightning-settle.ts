/**
 * Settling lightning rounds left open past their deadline (spec 4.1): a tab closed mid-round still closes its
 * session and sends its misses back into today's review. Home loads it through import() when it finds such a round,
 * and the lightning screen calls it on arrival, so it stays out of the initial bundle (spec 2.10).
 */
import { overdueLightning } from './home.ts';
import { roundEndEvents } from './lightning.ts';
import { progress, recordAll, storeReady } from './progress.ts';

let inFlight: Promise<void> | null = null;

/** Records, in one write, the submit and the `review.now` events of every lightning round past its deadline at `at`. */
export function settleLightning(at: Date): Promise<void> {
  inFlight ??= (async () => {
    if (!storeReady.peek()) return;
    const events = overdueLightning(progress.peek(), at).flatMap(roundEndEvents);
    if (events.length > 0) await recordAll(events);
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
