import { useEffect } from 'preact/hooks';
import type { ContentIndex } from '../../../schemas/chunks.ts';
import { Breadcrumbs } from '../../ui/Breadcrumbs.tsx';
import { Html } from '../../ui/Html.tsx';
import { useTitle } from '../../ui/useTitle.ts';
import { ensureModule, modules } from '../content.ts';
import { pad2 } from '../router.ts';
import { NotFound } from './NotFound.tsx';

/** Module `#/m/NN`: the lesson list, then the module README without its title and lesson list. */
export function ModulePage({ idx, module }: { idx: ContentIndex; module: number }) {
  const meta = idx.modules.find((m) => m.n === module);
  useTitle(meta === undefined ? 'Not found' : `Module ${module}: ${meta.short}`);
  useEffect(() => ensureModule(module), [module]);
  if (meta === undefined) return <NotFound hash={`#/m/${pad2(module)}`} />;
  const chunk = modules.value.get(module);
  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Home', href: '#/' },
          { label: `Module ${module}: ${meta.short}`, href: `#/m/${pad2(module)}` },
        ]}
      />
      <h1>{meta.short}</h1>
      <p class="muted lede">
        Module {module}, {meta.lessons.length === 1 ? '1 lesson' : `${meta.lessons.length} lessons`}
      </p>
      <h2>Lessons</h2>
      <ul class="rows">
        {meta.lessons.map((l) => (
          <li key={l.slug}>
            <a class="row" href={`#/m/${pad2(module)}/l/${l.slug}`}>
              <span class="row-n">{l.n}</span>
              <span class="row-title">{l.title}</span>
            </a>
          </li>
        ))}
      </ul>
      {chunk === undefined ? (
        <p class="muted">Loading</p>
      ) : (
        chunk.readme
          .filter((s) => s.id !== '' && s.id !== 'lessons')
          .map((s) => <Html key={s.id} className="prose" html={s.html} />)
      )}
    </>
  );
}
