/** Reads the course source text format that render_source.py writes outside the repo. */

const BLOCK_START =
  /^(?:\[(?:TEXT|INTERACTIVE|HEADING|SUBHEADING|ASSESSMENT Q\d+|KNOWLEDGE CHECK|IMAGE|VIDEO|TRANSCRIPT|CALLOUT|TABLE|NOTE|LIST|BUTTON)\b|#{1,3} )/;
const KNOWLEDGE_CHECK = /^\[KNOWLEDGE CHECK\b/;
const ASSESSMENT = /^\[ASSESSMENT Q(\d+)\b/;

export interface SourceItem {
  id: string;
  text: string;
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Knowledge checks (kc-01, kc-02, ...) and assessment items (quiz-NN, by question number), each cut at the next block or heading. */
export function splitItems(source: string): SourceItem[] {
  const items: SourceItem[] = [];
  let id: string | null = null;
  let lines: string[] = [];
  let checks = 0;
  const flush = (): void => {
    if (id !== null) items.push({ id, text: lines.join('\n').trim() });
    id = null;
    lines = [];
  };
  for (const line of source.split('\n')) {
    const quiz = ASSESSMENT.exec(line);
    if (KNOWLEDGE_CHECK.test(line)) {
      flush();
      checks += 1;
      id = `kc-${pad2(checks)}`;
    } else if (quiz) {
      flush();
      id = `quiz-${pad2(Number(quiz[1]))}`;
    } else if (BLOCK_START.test(line)) {
      flush();
    } else if (id !== null) {
      lines.push(line);
    }
  }
  flush();
  return items;
}

/** Lesson titles, then each module title in full and without its "Module N: " prefix, as overlap_check.py masks them. */
export function sourceTitles(source: string): string[] {
  const lessons = [...source.matchAll(/^### LESSON \d+: (.+) \((?:blocks|quiz)\)$/gm)].map((m) => m[1] ?? '');
  const modules = [...source.matchAll(/^# (Module \d+: (.+))$/gm)].flatMap((m) => [m[1] ?? '', m[2] ?? '']);
  return [...lessons, ...modules].filter((title) => title !== '');
}
