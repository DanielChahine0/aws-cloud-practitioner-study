import type { ContentIndex } from '../../../schemas/chunks.ts';
import { useTitle } from '../../ui/useTitle.ts';
import { type Route, toHash } from '../router.ts';

/** Interim screen until Task 22: names the route and the loaded content, so the shell can be checked by hand. */
export function Screen({ route, idx }: { route: Route; idx: ContentIndex }) {
  useTitle(toHash(route));
  return (
    <>
      <h1>{toHash(route)}</h1>
      <p class="muted">
        {idx.modules.length} modules loaded, content version {idx.contentVersion}
      </p>
    </>
  );
}
