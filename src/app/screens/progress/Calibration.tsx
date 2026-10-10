import { memory } from '../../memory.ts';
import { calibrationLine } from '../../progress-lines.ts';

/** Sure and Not sure accuracy over the last 150 counted answers (spec 3.10). */
export function Calibration() {
  const m = memory.value;
  if (m === null) return null;
  return (
    <>
      <h3>Calibration</h3>
      <p class="progress-line">{calibrationLine(m.calibration)}</p>
    </>
  );
}
