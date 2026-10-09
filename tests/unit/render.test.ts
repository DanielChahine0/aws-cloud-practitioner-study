import { describe, expect, it } from 'vitest';
import { type GlossaryEntry, termAt, termMatcher } from '../../scripts/content/lib/glossary.ts';
import { renderDoc, renderInline } from '../../scripts/content/lib/render.ts';

const PATH = 'resources/01-baking-basics/01-what-a-bakery-cloud-is.md';
const OVENS = 'resources/01-baking-basics/02-ovens.md';
const ROUTES = new Map([
  [PATH, '#/m/01/l/what-a-bakery-cloud-is'],
  [OVENS, '#/m/01/l/ovens'],
  ['resources/01-baking-basics/README.md', '#/m/01'],
]);
const entry = (term: string, id: string, path = PATH): GlossaryEntry => ({
  id,
  term,
  definition: `Fixture definition of ${term}.`,
  refs: [{ label: 'Module 1, a lesson', path }],
});
const TERMS = termMatcher([entry('Amazon S3', 'amazon-s3'), entry('Shared kitchen', 'shared-kitchen')]);
const button = (id: string, text: string): string =>
  `<button type="button" class="term" data-term="${id}" aria-haspopup="dialog" aria-expanded="false">${text}</button>`;
const BUTTON_S3 = button('amazon-s3', 'Amazon S3');
const UPDATE_LINE =
  '- **Exam guide update** (verified_on 2026-10-01, [CLF-C02 Domain 1](https://docs.aws.amazon.com/d1.html)): The guide says so.';

const BODY = [
  '# What a Bakery Cloud Is',
  '',
  '## Notes',
  '',
  '### Amazon S3 basics',
  '',
  '- Amazon S3 stores the recipes, and Amazon S3 keeps every version.',
  '- Read [the oven lesson](02-ovens.md) and [the guide](https://docs.aws.amazon.com/x.html).',
  '- **Exam guide update** (verified_on 2026-10-01, [CLF-C02 Domain 1](https://docs.aws.amazon.com/d1.html)): The guide calls the shared kitchen a commissary.',
  '',
  '## Terms',
  '',
  '- **Amazon S3**: object storage for recipes.',
].join('\n');

const render = (body: string) => renderDoc(body, { path: PATH, routes: ROUTES, terms: TERMS });
const count = (html: string, needle: string): number => html.split(needle).length - 1;

describe('renderDoc', () => {
  const { sections, headings } = render(BODY);
  const html = sections.map((s) => s.html).join('');

  it('splits sections at each H2 and gives H2 and H3 slug ids, but not the H1', () => {
    expect(sections.map((s) => s.id)).toEqual(['', 'notes', 'terms']);
    expect(headings).toEqual([
      { depth: 2, id: 'notes', text: 'Notes' },
      { depth: 3, id: 'amazon-s3-basics', text: 'Amazon S3 basics' },
      { depth: 2, id: 'terms', text: 'Terms' },
    ]);
    expect(html).toContain('<h1>What a Bakery Cloud Is</h1>');
    expect(html).toContain('<h3 id="amazon-s3-basics">Amazon S3 basics</h3>');
  });

  it('turns only the first use of a term into a button, never in a heading or the Terms section', () => {
    expect(count(html, 'data-term="amazon-s3"')).toBe(1);
    expect(html).toContain(`<li>${BUTTON_S3} stores the recipes, and Amazon S3 keeps every version.</li>`);
    expect(sections[2]?.html).not.toContain('<button');
    expect(render('## Terms\n\n- **Amazon S3**: object storage.\n').sections[0]?.html).not.toContain(
      '<button',
    );
  });

  it('never puts a term button inside a link', () => {
    const linked =
      render('[Amazon S3 docs](https://aws.amazon.com/s3/) then Amazon S3 again.').sections[0]?.html ?? '';
    expect(linked).toBe(
      `<p><a href="https://aws.amazon.com/s3/" rel="noopener noreferrer" target="_blank">Amazon S3 docs</a> then ${BUTTON_S3} again.</p>\n`,
    );
  });

  it('resolves relative links to routes and opens external links in a new tab', () => {
    expect(html).toContain(
      '<li>Read <a href="#/m/01/l/ovens">the oven lesson</a> and <a href="https://docs.aws.amazon.com/x.html" rel="noopener noreferrer" target="_blank">the guide</a>.</li>',
    );
    expect(render('See [the module](README.md).').sections[0]?.html).toContain(
      '<a href="#/m/01">the module</a>',
    );
    expect(render('See [a topic](02-ovens.md#hot-ovens).').sections[0]?.html).toContain(
      '<a href="#/m/01/l/ovens/hot-ovens">',
    );
  });

  it('labels an Exam guide update line with its date and source', () => {
    expect(html).toContain(
      '<li class="update"><span class="update-label">Exam guide update</span> ' +
        '<span class="update-meta">verified 2026-10-01, <a href="https://docs.aws.amazon.com/d1.html" rel="noopener noreferrer" target="_blank">CLF-C02 Domain 1</a></span> ' +
        `<span class="update-text">The guide calls the ${button('shared-kitchen', 'shared kitchen')} a commissary.</span></li>`,
    );
  });

  it('refuses an Exam guide update line that goes on in a nested list or a continuation line', () => {
    const message = `${PATH}: an Exam guide update line must stand alone, with no nested list or continuation line`;
    expect(() => render(`${UPDATE_LINE}\n  - A detail.\n`)).toThrow(message);
    expect(() => render(`${UPDATE_LINE}\nAnd it goes on.\n`)).toThrow(message);
    expect(() => render(`${UPDATE_LINE}\n\n  A second paragraph.\n`)).toThrow(message);
    for (const list of [`${UPDATE_LINE}\n- Next item.\n`, `${UPDATE_LINE}\n\n- Next item.\n`]) {
      expect(render(list).sections[0]?.html).toContain('<li class="update"><span class="update-label">');
    }
  });

  it('refuses two headings with the same id', () => {
    expect(() => render('## Notes\n\n### Same\n\nText.\n\n### Same\n')).toThrow(
      `${PATH}: two headings share the id same`,
    );
    expect(() => render('## Key takeaways\n\n### Key takeaways\n')).toThrow(
      `${PATH}: two headings share the id key-takeaways`,
    );
  });

  it('wraps each table and code block in a focusable region that scrolls sideways', () => {
    const out =
      render(
        '## Notes\n\n### Plans compared\n\n| Plan | Price |\n| --- | --- |\n| Basic | Free |\n\n```bash\naws s3 ls --profile ccp-admin\n```\n',
      ).sections[0]?.html ?? '';
    expect(out).toContain(
      '<div class="table-scroll" tabindex="0" role="region" aria-label="Plans compared, scrolls sideways"><table>',
    );
    expect(out).toContain('</table>\n</div>');
    expect(out).toContain(
      '<pre tabindex="0" role="region" aria-label="Plans compared, code"><code class="language-bash">aws s3 ls --profile ccp-admin\n</code></pre>',
    );
    expect(render('```\nls\n```\n').sections[0]?.html).toBe(
      '<pre tabindex="0" role="region" aria-label="Code"><code>ls\n</code></pre>\n',
    );
  });

  it('escapes text and matches terms before escaping', () => {
    const terms = termMatcher([entry('AWS Cost & Usage Report', 'aws-cost-usage-report')]);
    const out = renderDoc('Read the AWS Cost & Usage Report <3 times.', { path: PATH, routes: ROUTES, terms })
      .sections[0]?.html;
    expect(out).toBe(
      `<p>Read the ${button('aws-cost-usage-report', 'AWS Cost &amp; Usage Report')} &lt;3 times.</p>\n`,
    );
  });

  it('keeps the character references that marked passes through, as its own renderer does', () => {
    expect(render('Show the &lt;bucket&gt; placeholder, &#169; &amp; R&D.').sections[0]?.html).toBe(
      '<p>Show the &lt;bucket&gt; placeholder, \u00a9 &amp; R&amp;D.</p>\n',
    );
  });

  it('refuses raw HTML and links to pages the site does not have', () => {
    expect(() => render('Text with <b>bold</b>.')).toThrow(`${PATH}: raw HTML is not allowed in Markdown`);
    expect(() => render('See [gone](03-gone.md).')).toThrow(
      `${PATH}: link to 03-gone.md has no page on the site`,
    );
  });
});

describe('renderDoc with one-word terms', () => {
  // One-word glossary terms as the real glossary has them, each defined in the Ovens lesson.
  const terms = termMatcher([
    entry('Route', 'route', OVENS),
    entry('Root', 'root', OVENS),
    entry('Tier', 'tier', OVENS),
    entry('Node', 'node', OVENS),
    entry('Amazon Machine Image (AMI)', 'amazon-machine-image-ami', OVENS),
  ]);
  const html = (body: string, path: string): string =>
    renderDoc(body, { path, routes: ROUTES, terms }).sections[0]?.html ?? '';

  it('links an ordinary word only in the lessons that define it, so another sense of it gets no popover', () => {
    const body = 'Route 53 answers. Secure the root user. The Free Tier covers it. Node.js runs.';
    expect(html(body, PATH)).toBe(`<p>${body}</p>\n`);
  });

  it('links an ordinary word in its own lesson in either initial case, but never as part of a dotted name', () => {
    expect(html('Node.js apps run. Add a route, and each node reports.', OVENS)).toBe(
      `<p>Node.js apps run. Add a ${button('route', 'route')}, and each ${button('node', 'node')} reports.</p>\n`,
    );
    expect(html('Tier one. ROOT stays plain.', OVENS)).toBe(
      `<p>${button('tier', 'Tier')} one. ROOT stays plain.</p>\n`,
    );
  });

  it('links acronyms and phrases in every lesson, an acronym only as the glossary writes it', () => {
    expect(html('Pick an ami, then an AMI.', PATH)).toBe(
      `<p>Pick an ami, then an ${button('amazon-machine-image-ami', 'AMI')}.</p>\n`,
    );
    expect(html('An amazon machine image.', PATH)).toBe(
      `<p>An ${button('amazon-machine-image-ami', 'amazon machine image')}.</p>\n`,
    );
  });
});

describe('termMatcher', () => {
  const matcher = termMatcher([
    entry('Amazon Elastic Compute Cloud (Amazon EC2)', 'amazon-elastic-compute-cloud-amazon-ec2'),
    entry('Amazon EC2 Auto Scaling', 'amazon-ec2-auto-scaling'),
    entry('Availability Zone (AZ)', 'availability-zone-az'),
  ]);
  const ids = (text: string): (string | null)[] =>
    [...text.matchAll(matcher.pattern)].map((m) => termAt(matcher, m[0], PATH));

  it('matches the full term, its short forms of 3 or more characters, and the longest form first', () => {
    expect(ids('Amazon EC2 Auto Scaling grows Amazon EC2 fleets; see Amazon Elastic Compute Cloud.')).toEqual(
      [
        'amazon-ec2-auto-scaling',
        'amazon-elastic-compute-cloud-amazon-ec2',
        'amazon-elastic-compute-cloud-amazon-ec2',
      ],
    );
    expect(ids('one availability zone, one AZ')).toEqual(['availability-zone-az']);
  });

  it('stops at word and hyphen boundaries', () => {
    expect(ids('Amazon EC2-based and xAmazon EC2')).toEqual([]);
  });

  it('never matches with no entries', () => {
    expect('anything at all'.match(termMatcher([]).pattern)).toBeNull();
  });
});

describe('renderInline', () => {
  it('renders inline Markdown and refuses raw HTML', () => {
    expect(renderInline('A **pool** of ovens.', 'resources/glossary.md')).toBe(
      'A <strong>pool</strong> of ovens.',
    );
    expect(() => renderInline('A <i>pool</i>.', 'resources/glossary.md')).toThrow('raw HTML is not allowed');
  });
});
