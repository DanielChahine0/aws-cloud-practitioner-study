import { posix } from 'node:path';
import { Marked, type Parser, type Token } from 'marked';
import type { HeadingMeta, Section } from '../../../schemas/chunks.ts';
import type { Note } from './context.ts';
import type { TermMatcher } from './glossary.ts';
import { slugify } from './markdown.ts';
import { parseUpdateLine } from './update-line.ts';

const EXTERNAL = /^(?:https?:|mailto:)/;
const ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}

/** The hash route of a note: #/m/NN for a module README, #/m/NN/l/<slug> for a lesson. */
export function routeOf(note: Note): string {
  const nn = String(note.module).padStart(2, '0');
  return note.kind === 'module' ? `#/m/${nn}` : `#/m/${nn}/l/${note.slugFromPath}`;
}

export interface RenderOptions {
  /** Repo path of the Markdown file, used to resolve its relative links and to name it in errors. */
  path: string;
  /** Repo path of every note to its hash route. */
  routes: ReadonlyMap<string, string>;
  /** Glossary terms to turn into popover buttons, or null for none. */
  terms: TermMatcher | null;
}

export interface RenderedDoc {
  sections: Section[];
  headings: HeadingMeta[];
}

const externalLink = (href: string, inner: string): string =>
  `<a href="${escapeHtml(href)}" rel="noopener noreferrer" target="_blank">${inner}</a>`;
const plainText = (markdown: string): string => markdown.replace(/[*`_]/g, '').trim();

/**
 * Renders a note body to HTML sections, one per H2, with the site's rules: H2 and H3 ids from slugify,
 * links resolved to hash routes, "Exam guide update" lines labelled, the first use of each glossary
 * term outside headings, links and the Terms section turned into a button, and raw HTML refused.
 */
export function renderDoc(body: string, { path, routes, terms }: RenderOptions): RenderedDoc {
  const headings: HeadingMeta[] = [];
  const usedTerms = new Set<string>();
  let section = '';
  let inlineDepth = 0;

  const nested = (parser: Parser, tokens: Token[]): string => {
    inlineDepth += 1;
    try {
      return parser.parseInline(tokens);
    } finally {
      inlineDepth -= 1;
    }
  };

  const wrapTerms = (raw: string): string => {
    if (terms === null || inlineDepth > 0 || section === 'Terms') return escapeHtml(raw);
    let html = '';
    let last = 0;
    for (const match of raw.matchAll(terms.pattern)) {
      const id = terms.idByForm.get(match[0].toLowerCase());
      if (id === undefined || usedTerms.has(id)) continue;
      usedTerms.add(id);
      html += escapeHtml(raw.slice(last, match.index));
      html += `<button type="button" class="term" data-term="${id}">${escapeHtml(match[0])}</button>`;
      last = match.index + match[0].length;
    }
    return html + escapeHtml(raw.slice(last));
  };

  const routeFor = (href: string): string => {
    const hash = href.indexOf('#');
    const target = hash === -1 ? href : href.slice(0, hash);
    const fragment = hash === -1 ? '' : href.slice(hash + 1);
    const file = target === '' ? path : posix.normalize(posix.join(posix.dirname(path), target));
    const route = routes.get(file);
    if (route === undefined) throw new Error(`${path}: link to ${href} has no page on the site`);
    if (fragment === '') return route;
    if (!route.includes('/l/')) {
      throw new Error(`${path}: link to ${href} points into a module page, which has no anchors`);
    }
    return `${route}/${fragment}`;
  };

  const md: Marked = new Marked<string, string>({
    gfm: true,
    async: false,
    renderer: {
      heading({ tokens, depth, text }) {
        // Use the token's Markdown text for the section name and the id, never the rendered inner HTML.
        if (depth === 2) section = text.trim();
        const inner = nested(this.parser, tokens);
        if (depth !== 2 && depth !== 3) return `<h${depth}>${inner}</h${depth}>\n`;
        const id = slugify(text);
        headings.push({ depth, id, text: plainText(text) });
        return `<h${depth} id="${id}">${inner}</h${depth}>\n`;
      },
      link({ href, tokens }) {
        const inner = nested(this.parser, tokens);
        return EXTERNAL.test(href)
          ? externalLink(href, inner)
          : `<a href="${escapeHtml(routeFor(href))}">${inner}</a>`;
      },
      listitem(item) {
        const update = parseUpdateLine(`- ${item.text}`);
        if (update === null) return false;
        const meta = `verified ${update.verifiedOn}, ${externalLink(update.url, escapeHtml(update.title))}`;
        const sentence = md.parseInline(update.sentence, { async: false });
        return `<li class="update"><span class="update-label">Exam guide update</span> <span class="update-meta">${meta}</span> <span class="update-text">${sentence}</span></li>\n`;
      },
      text(token) {
        if ('tokens' in token && token.tokens) return this.parser.parseInline(token.tokens);
        if ('escaped' in token && token.escaped) return token.text;
        return wrapTerms(token.text);
      },
      html() {
        throw new Error(`${path}: raw HTML is not allowed in Markdown`);
      },
    },
  });

  let current: { title: string; tokens: Token[] } = { title: '', tokens: [] };
  const groups = [current];
  for (const token of md.lexer(body)) {
    if (token.type === 'heading' && token.depth === 2) {
      current = { title: plainText(token.text), tokens: [] };
      groups.push(current);
    }
    current.tokens.push(token);
  }
  const sections = groups
    .filter((group, i) => i > 0 || group.tokens.some((token) => token.type !== 'space'))
    .map((group) => ({ id: slugify(group.title), title: group.title, html: md.parser(group.tokens) }));
  return { sections, headings };
}

/** Renders one line of Markdown, such as a glossary definition; raw HTML and links into the notes are refused. */
export function renderInline(src: string, path: string): string {
  const md = new Marked<string, string>({
    gfm: true,
    async: false,
    renderer: {
      link({ href, tokens }) {
        if (!EXTERNAL.test(href)) throw new Error(`${path}: link to ${href} has no page on the site`);
        return externalLink(href, this.parser.parseInline(tokens));
      },
      html() {
        throw new Error(`${path}: raw HTML is not allowed in Markdown`);
      },
    },
  });
  return md.parseInline(src, { async: false });
}
