import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import type { ContentIndex, ModuleChunk } from '../../schemas/chunks.ts';
import { buildContent } from '../../scripts/content/build.ts';
import { loadContext } from '../../scripts/content/lib/context.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CHUNK_BUDGET = 120 * 1024;
const built = buildContent(loadContext(ROOT));
const read = <T>(name: string): T => JSON.parse(built.files.get(name) ?? 'null') as T;
const index = read<ContentIndex>(built.indexFile);
const chunks = new Map(index.modules.map((m) => [m.n, read<ModuleChunk>(m.chunk)] as const));

describe('buildContent on the real notes', () => {
  it('builds all 13 modules and 87 lessons', () => {
    expect(index.modules.map((m) => m.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    expect(index.modules.reduce((total, m) => total + m.lessons.length, 0)).toBe(87);
  });

  it('routes every glossary term to at least one lesson', () => {
    expect(index.glossary.length).toBeGreaterThan(0);
    for (const item of index.glossary) {
      expect(item.refs.length, item.term).toBeGreaterThan(0);
      for (const ref of item.refs) expect(ref.route, item.term).toMatch(/^#\/m\/\d{2}\/l\/[a-z0-9-]+$/);
    }
  });

  it('renders every concept anchor as a heading id in its home lesson', () => {
    expect(index.concepts.length).toBeGreaterThan(0);
    for (const concept of index.concepts) {
      const [m = '', slug = ''] = concept.home.split('/');
      const lesson = chunks.get(Number(m.slice(1)))?.lessons[slug];
      expect(
        lesson?.headings.map((h) => h.id),
        concept.id,
      ).toContain(concept.anchor);
    }
  });

  it('labels the Exam guide update lines of the Support plans lesson', () => {
    const html = chunks.get(11)?.lessons['aws-support-plans']?.html ?? '';
    expect(html.split('<li class="update">').length - 1).toBeGreaterThanOrEqual(7);
  });

  it('ships exactly the questions that questionVersions lists', () => {
    const shipped = [...chunks.values()].flatMap((chunk) =>
      chunk.questions.map((q) => [q.id, q.version] as const),
    );
    expect(Object.fromEntries(shipped)).toEqual(index.questionVersions);
    expect(new Set(shipped.map(([id]) => id)).size).toBe(shipped.length);
  });

  it('keeps every module chunk, questions included, within 120 KB gzipped', () => {
    for (const m of index.modules) {
      const size = gzipSync(built.files.get(m.chunk) ?? '', { level: 9 }).length;
      expect(size, m.chunk).toBeLessThanOrEqual(CHUNK_BUDGET);
    }
  });

  it('ships no form or exactly forms A to D, each within 120 KB gzipped', () => {
    expect([[], ['A', 'B', 'C', 'D']]).toContainEqual(index.exam.forms.map((f) => f.id));
    for (const form of index.exam.forms) {
      const size = gzipSync(built.files.get(form.chunk) ?? '', { level: 9 }).length;
      expect(size, form.chunk).toBeLessThanOrEqual(CHUNK_BUDGET);
    }
  });

  it('keeps questionVersions to practice items, never a form item', () => {
    for (const qid of Object.keys(index.exam.items)) expect(qid in index.questionVersions, qid).toBe(false);
  });
});
