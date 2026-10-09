import type { ContentIndex } from '../../../schemas/chunks.ts';
import type { Route } from '../router.ts';
import { Home } from './Home.tsx';
import { LessonPage } from './LessonPage.tsx';
import { MissionPage } from './MissionPage.tsx';
import { MissionsPage } from './MissionsPage.tsx';
import { ModulePage } from './ModulePage.tsx';
import { NotFound } from './NotFound.tsx';

/** The screen for a route; the content index is always loaded by the time this renders. */
export function Screen({ route, idx }: { route: Route; idx: ContentIndex }) {
  switch (route.kind) {
    case 'home':
      return <Home idx={idx} />;
    case 'module':
      return <ModulePage idx={idx} module={route.module} />;
    case 'lesson':
      return <LessonPage idx={idx} module={route.module} slug={route.slug} anchor={route.anchor} />;
    case 'missions':
      return <MissionsPage idx={idx} />;
    case 'mission':
      return <MissionPage idx={idx} id={route.id} />;
    case 'not-found':
      return <NotFound hash={route.hash} />;
  }
}
