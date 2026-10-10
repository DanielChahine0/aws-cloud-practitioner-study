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

// Exam screens load on first use through import(), so their code stays out of the initial bundle.
const ExamScreen = lazyScreen(() => import('./Exam.tsx').then((m) => m.Exam));
const MocksScreen = lazyScreen(() => import('./Mocks.tsx').then((m) => m.Mocks));
const ResultsScreen = lazyScreen(() => import('./Results.tsx').then((m) => m.Results));
// The lab screen, its engine views and their copy load on first use too.
const LabScreen = lazyScreen(() => import('./Lab.tsx').then((m) => m.Lab));

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
      return <ExamScreen key={route} idx={idx} route={route} />;
    case 'mocks':
      return <MocksScreen idx={idx} />;
    case 'mock':
      return <ExamScreen key={route} idx={idx} route={route} />;
    case 'focus':
      return <Runner key={route} idx={idx} mode="focus" scope={route.scope} />;
    case 'results':
      return <ResultsScreen key={route} idx={idx} sid={route.sid} />;
    case 'lab':
      return <LabScreen key={route} idx={idx} route={route} />;
    case 'not-found':
      return <NotFound hash={route.hash} />;
  }
}
