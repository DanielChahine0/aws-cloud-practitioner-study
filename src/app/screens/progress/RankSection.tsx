import { nextRankLine } from '../../../engine/ranks.ts';
import { rank, rankFacts, ranks, readinessNow } from '../../memory.ts';
import { storeReady } from '../../progress.ts';
import { rankLine } from '../../progress-lines.ts';

/** The shown rank and what the next one needs (spec 3.4). */
export function RankSection() {
  const shown = rank.value;
  if (!storeReady.value || shown === null) return null;
  const r = readinessNow.value;
  const label = r === null || r.value === null ? '-' : r.label;
  const next = nextRankLine(ranks.value, shown, rankFacts.value, label);
  return (
    <>
      <h3>Rank</h3>
      <p class="progress-line">{rankLine(shown.name)}</p>
      {next !== null && <p class="muted">{next}</p>}
    </>
  );
}
