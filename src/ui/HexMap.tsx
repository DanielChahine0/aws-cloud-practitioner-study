import { hexLabel } from '../app/home.ts';
import { pad2 } from '../app/router.ts';
import type { HexBand } from '../engine/mastery.ts';

export interface Hex {
  module: number;
  short: string;
  mastery: number;
  band: HexBand;
}

/** A pointy-top hexagon in a 100 by 115.47 box, inset by half its stroke. */
const HEXAGON = '50,2 98,29.7 98,85.8 50,113.5 2,85.8 2,29.7';
/** The honeycomb of spec 7.3: rows of 4, 5 and 4 modules. */
const ROWS = [4, 5, 4] as const;

/** The 13 module hexes (spec 3.8 and 7.3), filled in graphite by mastery band; each opens its module. */
export function HexMap({ hexes }: { hexes: readonly Hex[] }) {
  const rows: Hex[][] = [];
  let start = 0;
  for (const size of ROWS) {
    rows.push(hexes.slice(start, start + size));
    start += size;
  }
  return (
    <nav class="hexes" aria-label="Modules">
      {rows.map((row) => (
        <div key={row[0]?.module ?? 0} class="hex-row">
          {row.map((h) => (
            <a
              key={h.module}
              class={`hex hex-${h.band}`}
              href={`#/m/${pad2(h.module)}`}
              data-nav-item
              aria-label={hexLabel(h.module, h.short, h.mastery, h.band)}
            >
              <svg viewBox="0 0 100 115.47" aria-hidden="true" focusable="false">
                <polygon points={HEXAGON} />
              </svg>
              <span class="hex-n">{h.module}</span>
            </a>
          ))}
        </div>
      ))}
    </nav>
  );
}
