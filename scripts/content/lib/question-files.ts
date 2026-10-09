import { Document, isMap, isScalar, isSeq, type Pair, parseDocument, YAMLMap, YAMLSeq } from 'yaml';
import type { Review, Verified } from '../../../schemas/question.ts';

/** The fields only the tools write; `null` removes the key. */
export interface QuestionEdit {
  status?: 'draft' | 'live';
  verified?: Verified | null;
  review?: Review | null;
}

const KEYS = ['status', 'verified', 'review'] as const;

function parse(text: string): Document.Parsed {
  const doc = parseDocument(text);
  if (doc.errors.length > 0) throw new Error(`YAML: ${doc.errors[0]?.message ?? 'parse error'}`);
  return doc;
}

/** The question maps of a parsed file by id. */
function itemsById(doc: Document.Parsed): Map<string, YAMLMap> {
  const seq = doc.get('questions');
  const out = new Map<string, YAMLMap>();
  for (const item of isSeq(seq) ? seq.items : []) {
    const id = isMap(item) ? item.get('id') : undefined;
    if (typeof id === 'string' && item instanceof YAMLMap) out.set(id, item);
  }
  return out;
}

/** The offset just past the line that holds `pos - 1`, so a splice always covers whole lines. */
function lineEnd(text: string, pos: number): number {
  if (pos > 0 && text[pos - 1] === '\n') return pos;
  const nl = text.indexOf('\n', pos);
  return nl === -1 ? text.length : nl + 1;
}

const lineStart = (text: string, pos: number): number => text.lastIndexOf('\n', pos - 1) + 1;

/** One `key: value` entry in block style at the given indent, ending in a newline. */
function render(key: string, value: unknown, indent: number): string {
  const doc = new Document({ [key]: value });
  if (key === 'verified') {
    const checks = doc.getIn([key, 'checks'], true);
    if (checks instanceof YAMLSeq) checks.flow = true;
  }
  return doc
    .toString({ lineWidth: 0 })
    .split('\n')
    .map((line) => (line === '' ? line : `${' '.repeat(indent)}${line}`))
    .join('\n');
}

/** The source span of a pair, from the start of its key's line to the end of its value's last line. */
function span(text: string, pair: Pair): [number, number] {
  const key = pair.key as { range?: [number, number, number] } | null;
  const value = pair.value as { range?: [number, number, number] } | null;
  const start = key?.range?.[0];
  const end = value?.range?.[1] ?? key?.range?.[1];
  if (start === undefined || end === undefined) throw new Error('YAML: a key without a source range');
  return [lineStart(text, start), lineEnd(text, end)];
}

/** Applies one key edit to one question by splicing only that key's lines, so every other byte keeps its source. */
function editKey(text: string, id: string, key: (typeof KEYS)[number], value: unknown): string {
  const item = itemsById(parse(text)).get(id);
  if (item === undefined) throw new Error(`${id} is not in this file`);
  const pair = item.items.find((p) => isScalar(p.key) && p.key.value === key);
  const first = item.items[0];
  if (first === undefined) throw new Error(`${id} has no keys`);
  const firstKey = first.key as { range?: [number, number, number] } | null;
  const keyStart = firstKey?.range?.[0] ?? 0;
  const indent = keyStart - lineStart(text, keyStart);
  if (pair !== undefined) {
    const [start, end] = span(text, pair);
    const next = value === null ? '' : render(key, value, indent);
    return text.slice(0, start) + next + text.slice(end);
  }
  if (value === null) return text;
  const last = item.items[item.items.length - 1] as Pair;
  const at = span(text, last)[1];
  const lead = at > 0 && text[at - 1] !== '\n' ? '\n' : '';
  return text.slice(0, at) + lead + render(key, value, indent) + text.slice(at);
}

/**
 * Applies edits to the questions of one file by id, splicing only the edited keys so comments, key order and the
 * source text of every other line (folded stems included) stay byte for byte; a `verified` block's `checks` list is
 * written in flow style. Throws on an id that is not in the file.
 */
export function editQuestionFile(text: string, edits: ReadonlyMap<string, QuestionEdit>): string {
  const ids = itemsById(parse(text));
  for (const id of edits.keys()) if (!ids.has(id)) throw new Error(`${id} is not in this file`);
  let out = text;
  for (const [id, edit] of edits) {
    for (const key of KEYS) {
      const value = edit[key];
      if (value !== undefined) out = editKey(out, id, key, value);
    }
  }
  parse(out);
  return out;
}
