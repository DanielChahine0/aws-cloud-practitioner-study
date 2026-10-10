import type { ContentIndex } from '../../../schemas/chunks.ts';
import { Breadcrumbs } from '../../ui/Breadcrumbs.tsx';
import { useTitle } from '../../ui/useTitle.ts';
import { pad2, type Route } from '../router.ts';

/** A lab `#/m/NN/lab/<id>` (spec 7.2); until Task 7 fills it in, it shows the trail and the heading from the route. */
export function Lab({ idx, route }: { idx: ContentIndex; route: Extract<Route, { kind: 'lab' }> }) {
  useTitle('Lab');
  const meta = idx.modules.find((m) => m.n === route.module);
  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Home', href: '#/' },
          { label: `Module ${route.module}: ${meta?.short ?? ''}`, href: `#/m/${pad2(route.module)}` },
          { label: 'Lab', href: `#/m/${pad2(route.module)}/lab/${route.id}` },
        ]}
      />
      <h1>Lab</h1>
    </>
  );
}
