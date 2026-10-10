import { studyDay } from '../../../engine/day.ts';
import { now } from '../../clock.ts';
import { shortDate } from '../../dates.ts';
import { memory } from '../../memory.ts';
import { dayStrip } from '../../progress-lines.ts';

const BAR = 16;
const GAP = 4;
const HEIGHT = 48;

/** XP per study day for the last 14 days (spec 7.3): an SVG for sight and a hidden table for everyone else. */
export function DayStrip() {
  const m = memory.value;
  if (m === null) return null;
  const days = dayStrip(m.xpByDay, studyDay(now.value));
  const top = Math.max(1, ...days.map((d) => d.xp));
  const total = days.reduce((sum, d) => sum + d.xp, 0);
  return (
    <>
      <h3>Last 14 days</h3>
      <svg
        class="day-strip"
        viewBox={`0 0 ${days.length * (BAR + GAP) - GAP} ${HEIGHT}`}
        role="img"
        aria-label={`XP per day for the last 14 days, ${total} XP in all`}
      >
        {days.map((d, i) => {
          const h = d.xp === 0 ? 1 : Math.max(2, Math.round((HEIGHT * d.xp) / top));
          return <rect key={d.day} x={i * (BAR + GAP)} y={HEIGHT - h} width={BAR} height={h} />;
        })}
      </svg>
      <table class="visually-hidden">
        <caption>XP per day</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">XP</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.day}>
              <td>{shortDate(d.day)}</td>
              <td>{d.xp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
