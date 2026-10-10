import { mockHistory } from '../../../engine/mock.ts';
import { progress } from '../../progress.ts';
import { mockLine } from '../../progress-lines.ts';

/** Every submitted mock, newest first, each linking to its results (spec 7.3). */
export function MockHistory() {
  const history = mockHistory(progress.value);
  return (
    <>
      <h3>Mock exams</h3>
      {history.length === 0 ? (
        <p class="muted">No mocks yet.</p>
      ) : (
        <ul class="mock-history">
          {history.map((a) => (
            <li key={a.sid} class="mock-row">
              <a href={`#/r/${a.sid}`}>{mockLine(a)}</a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
