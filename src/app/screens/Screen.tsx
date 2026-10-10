import type { ContentIndex } from '../../../schemas/chunks.ts';
import { pad2, type Route } from '../router.ts';
import { Home } from './Home.tsx';
import { lazyScreen } from './Lazy.tsx';
import { LessonPage } from './LessonPage.tsx';
import { MissionPage } from './MissionPage.tsx';
import { MissionsPage } from './MissionsPage.tsx';
import { ModulePage } from './ModulePage.tsx';
import { NotFound } from './NotFound.tsx';
import { Runner } from './Runner.tsx';

// Exam screens load on first use; Tasks 18, 19 and 21 replace these placeholders with the real screens.
const BossScreen = lazyScreen(() => import('./Pending.tsx').then((m) => m.Pending));
const MockScreen = lazyScreen(() => import('./Pending.tsx').then((m) => m.Pending));
const MocksScreen = lazyScreen(() => import('./Pending.tsx').then((m) => m.Pending));
const ResultsScreen = lazyScreen(() => import('./Pending.tsx').then((m) => m.Pending));
const FocusScreen = lazyScreen(() => import('./Pending.tsx').then((m) => m.Pending));

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
    // Keyed by the route object, which every arrival replaces, so "Another quiz" on the quiz route starts afresh.
    case 'check':
      return <Runner key={route} idx={idx} mode="check" scope={`m${pad2(route.module)}/${route.slug}`} />;
    case 'quiz':
      return <Runner key={route} idx={idx} mode="quiz" scope={`m${pad2(route.module)}`} />;
    case 'review':
      return <Runner key={route} idx={idx} mode="review" scope="review" />;
    case 'boss':
      return <BossScreen key={route} title={`Boss: Module ${route.module}`} />;
    case 'mocks':
      return <MocksScreen title="Mock exams" />;
    case 'mock':
      return <MockScreen key={route} title={`Mock ${route.form.toUpperCase()}`} />;
    case 'focus':
      return <FocusScreen key={route} title="Focus quiz" />;
    case 'results':
      return <ResultsScreen key={route} title="Results" />;
    case 'not-found':
      return <NotFound hash={route.hash} />;
  }
}
