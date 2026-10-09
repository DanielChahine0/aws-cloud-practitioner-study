import { useEffect, useRef } from 'preact/hooks';
import type { ContentIndex } from '../../../schemas/chunks.ts';
import { Breadcrumbs } from '../../ui/Breadcrumbs.tsx';
import { Html } from '../../ui/Html.tsx';
import { TermPopover } from '../../ui/TermPopover.tsx';
import { scrollableTables } from '../../ui/tables.ts';
import { useTitle } from '../../ui/useTitle.ts';
import { ensureModule, glossary, modules } from '../content.ts';
import { neighbors } from '../nav.ts';
import { pad2 } from '../router.ts';
import { openTerm } from '../state.ts';
import { NotFound } from './NotFound.tsx';

interface Props {
  idx: ContentIndex;
  module: number;
  slug: string;
  anchor: string | null;
}

/** Lesson `#/m/NN/l/<slug>[/<anchor>]`: the note, its glossary popovers and the pager. */
export function LessonPage({ idx, module, slug, anchor }: Props) {
  const body = useRef<HTMLDivElement>(null);
  const meta = idx.modules.find((m) => m.n === module);
  const lessonMeta = meta?.lessons.find((l) => l.slug === slug);
  const lesson = modules.value.get(module)?.lessons[slug];
  useTitle(lessonMeta?.title ?? 'Not found');
  useEffect(() => ensureModule(module), [module]);

  useEffect(() => {
    const root = body.current;
    if (root === null || lesson === undefined) return;
    scrollableTables(root);
    if (anchor !== null) root.querySelector(`[id="${anchor}"]`)?.scrollIntoView();
    const onClick = (event: MouseEvent): void => {
      const button = event.target instanceof Element ? event.target.closest('button.term') : null;
      if (!(button instanceof HTMLButtonElement) || button.dataset.term === undefined) return;
      openTerm.value = openTerm.value?.anchor === button ? null : { id: button.dataset.term, anchor: button };
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  }, [lesson, anchor]);

  if (meta === undefined || lessonMeta === undefined) {
    return <NotFound hash={`#/m/${pad2(module)}/l/${slug}`} />;
  }
  const { prev, next } = neighbors(idx.modules, module, slug);
  const term = openTerm.value;
  const item = term === null ? undefined : glossary.value.get(term.id);
  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Home', href: '#/' },
          { label: `Module ${module}: ${meta.short}`, href: `#/m/${pad2(module)}` },
          { label: lessonMeta.title, href: `#/m/${pad2(module)}/l/${slug}` },
        ]}
      />
      <div ref={body}>
        {lesson === undefined ? <p class="muted">Loading</p> : <Html className="prose" html={lesson.html} />}
      </div>
      {term !== null && item !== undefined && <TermPopover key={term.id} item={item} anchor={term.anchor} />}
      <nav class="pager" aria-label="Lessons">
        {prev !== null && (
          <a rel="prev" href={`#/m/${pad2(prev.module)}/l/${prev.slug}`}>
            <span class="pager-label">Previous</span>
            <span class="pager-title">{prev.title}</span>
          </a>
        )}
        {next !== null && (
          <a rel="next" href={`#/m/${pad2(next.module)}/l/${next.slug}`}>
            <span class="pager-label">Next</span>
            <span class="pager-title">{next.title}</span>
          </a>
        )}
      </nav>
    </>
  );
}
