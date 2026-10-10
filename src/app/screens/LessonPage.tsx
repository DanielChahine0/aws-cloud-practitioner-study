import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';
import type { ContentIndex, ModuleChunk } from '../../../schemas/chunks.ts';
import { recall } from '../../engine/srs.ts';
import { KV_KEYS } from '../../store/kv.ts';
import { Breadcrumbs } from '../../ui/Breadcrumbs.tsx';
import { Html } from '../../ui/Html.tsx';
import { showTermPopover } from '../../ui/TermPopover.tsx';
import { useTitle } from '../../ui/useTitle.ts';
import { now } from '../clock.ts';
import { ensureModule, glossary, modules } from '../content.ts';
import { findEvidence } from '../evidence.ts';
import { memory } from '../memory.ts';
import { RECALL_LABEL, recallBand } from '../module.ts';
import { neighbors } from '../nav.ts';
import { progress, record, storeReady, writeKv } from '../progress.ts';
import { pad2 } from '../router.ts';
import { homedConcepts } from '../runner.ts';
import { highlight, openTerm } from '../state.ts';
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
  const chunk = modules.value.get(module);
  const lesson = chunk?.lessons[slug];
  useTitle(lessonMeta?.title ?? 'Not found');
  useEffect(() => ensureModule(module), [module]);

  // The lesson being read, for Next's "Continue" (spec 4.6): reading writes no event, so kv keeps it, once per open.
  const known = lessonMeta !== undefined;
  const ready = storeReady.value;
  // biome-ignore lint/correctness/useExhaustiveDependencies: Biome takes a signal's value for a constant import; it changes, so it is a dependency
  useEffect(() => {
    if (ready && known) void writeKv(KV_KEYS.currentLesson, `m${pad2(module)}/${slug}`);
  }, [ready, known, module, slug]);

  // A layout effect, so the note opens at its anchor and its terms answer clicks from the first frame it shows.
  useLayoutEffect(() => {
    const root = body.current;
    if (root === null || lesson === undefined) return;
    if (anchor !== null) root.querySelector(`[id="${anchor}"]`)?.scrollIntoView();
    const onClick = (event: MouseEvent): void => {
      const button = event.target instanceof Element ? event.target.closest('button.term') : null;
      if (!(button instanceof HTMLButtonElement) || button.dataset.term === undefined) return;
      openTerm.value = openTerm.value?.anchor === button ? null : { id: button.dataset.term, anchor: button };
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  }, [lesson, anchor]);

  // "Read in notes": mark the first block whose text is the evidence line, bring it into view, and clear the request.
  const wanted = highlight.value;
  // biome-ignore lint/correctness/useExhaustiveDependencies: Biome takes a signal's value for a constant import; it changes, so it is a dependency
  useLayoutEffect(() => {
    const root = body.current;
    if (root === null || lesson === undefined || wanted === null) return;
    const found = findEvidence(root, wanted)[0];
    if (found !== undefined) {
      found.classList.add('evidence');
      found.scrollIntoView({ block: 'center' });
    }
    highlight.value = null;
  }, [lesson, wanted]);

  // Recall dots (spec 7.3): one right after each H3 that anchors a tested concept homed in this note, by band.
  const noteId = `m${pad2(module)}/${slug}`;
  const memoryNow = storeReady.value ? memory.value : null;
  const at = now.value;
  // biome-ignore lint/correctness/useExhaustiveDependencies: Biome takes a signal's value for a constant import; it changes, so it is a dependency
  useLayoutEffect(() => {
    const root = body.current;
    if (root === null || lesson === undefined || memoryNow === null) return;
    const dots: HTMLElement[] = [];
    for (const c of idx.concepts) {
      if (!c.tested || c.home !== noteId) continue;
      const heading = root.querySelector(`h3[id="${c.anchor}"]`);
      if (heading === null) continue;
      const card = memoryNow.concepts.get(c.id)?.card ?? null;
      const band = recallBand(card === null ? null : recall(card, at));
      const dot = document.createElement('span');
      dot.className = `recall-dot recall-${band}`;
      dot.setAttribute('role', 'img');
      dot.setAttribute('aria-label', `Recall: ${RECALL_LABEL[band]}`);
      heading.after(dot);
      dots.push(dot);
    }
    return () => {
      for (const dot of dots) dot.remove();
    };
  }, [lesson, memoryNow, at, idx, noteId]);

  const term = openTerm.value;
  const item = term === null ? undefined : glossary.value.get(term.id);
  const termButton = term?.anchor;
  useLayoutEffect(
    () => (termButton === undefined || item === undefined ? undefined : showTermPopover(item, termButton)),
    [termButton, item],
  );

  if (meta === undefined || lessonMeta === undefined) {
    return <NotFound hash={`#/m/${pad2(module)}/l/${slug}`} />;
  }
  const { prev, next } = neighbors(idx.modules, module, slug);
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
      {lesson !== undefined && chunk !== undefined && (
        <CheckYourself idx={idx} chunk={chunk} module={module} slug={slug} />
      )}
      {/* The pager waits for the note, so it never shows under "Loading" and then jumps down. */}
      {lesson !== undefined && (
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
      )}
    </>
  );
}

/** The end of a note (spec 2.8): the link to its lesson check, or, without questions, the sentinel that marks it read. */
function CheckYourself({
  idx,
  chunk,
  module,
  slug,
}: {
  idx: ContentIndex;
  chunk: ModuleChunk;
  module: number;
  slug: string;
}) {
  const noteId = `m${pad2(module)}/${slug}`;
  const asked = new Set(chunk.questions.map((q) => q.concept));
  const count = homedConcepts(idx, chunk, noteId, slug).filter((c) => asked.has(c)).length;
  const last = progress.value.checkScores.get(noteId);
  const done = progress.value.lessonsDone.has(noteId);
  const ready = storeReady.value;
  const sentinel = useRef<HTMLDivElement>(null);

  // Without a check, reaching the end of the note is what marks it read (spec 3.2).
  // biome-ignore lint/correctness/useExhaustiveDependencies: Biome takes a signal's value for a constant import; it changes, so it is a dependency
  useEffect(() => {
    const el = sentinel.current;
    if (el === null || count > 0 || done || !ready) return;
    let recorded = false;
    const observer = new IntersectionObserver((entries) => {
      if (recorded || !entries.some((e) => e.isIntersecting)) return;
      recorded = true;
      observer.disconnect();
      void record({ t: 'lesson.done', note: noteId });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [count, done, ready, noteId]);

  return (
    <section class="check" aria-labelledby="check-yourself">
      <h2 id="check-yourself">Check yourself</h2>
      {count > 0 ? (
        <p>
          <a class="button-link" href={`#/s/check/m${pad2(module)}/${slug}`}>
            Check yourself ({count})
          </a>
          {last !== undefined && (
            <span class="muted check-last">
              Last check {last.correct}/{last.total}
            </span>
          )}
        </p>
      ) : (
        <>
          <p class="muted">No questions for this lesson yet.</p>
          <div ref={sentinel} class="check-sentinel" />
        </>
      )}
    </section>
  );
}
