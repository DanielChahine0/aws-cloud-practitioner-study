import { describe, expect, it } from 'vitest';
import { type GlossaryEntry, termMatcher } from '../../scripts/content/lib/glossary.ts';
import { renderDoc, renderInline } from '../../scripts/content/lib/render.ts';

const PATH = 'resources/01-baking-basics/01-what-a-bakery-cloud-is.md';
const ROUTES = new Map([
  [PATH, '#/m/01/l/what-a-bakery-cloud-is'],
  ['resources/01-baking-basics/02-ovens.md', '#/m/01/l/ovens'],
  ['resources/01-baking-basics/README.md', '#/m/01'],
]);
const entry = (term: string, id: string): GlossaryEntry => ({
  id,
  term,
  definition: `Fixture definition of ${term}.`,
  refs: [{ label: 'Module 1, What a Bakery Cloud Is', path: PATH }],
});
const TERMS = termMatcher([entry('Amazon S3', 'amazon-s3'), entry('Shared kitchen', 'shared-kitchen')]);
const BUTTON_S3 = '<button type="button" class="term" data-term="amazon-s3">Amazon S3</button>';

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
        '<span class="update-text">The guide calls the <button type="button" class="term" data-term="shared-kitchen">shared kitchen</button> a commissary.</span></li>',
    );
  });

  it('escapes text and matches terms before escaping', () => {
    const terms = termMatcher([entry('AWS Cost & Usage Report', 'aws-cost-usage-report')]);
    const out = renderDoc('Read the AWS Cost & Usage Report <3 times.', { path: PATH, routes: ROUTES, terms })
      .sections[0]?.html;
    expect(out).toBe(
      '<p>Read the <button type="button" class="term" data-term="aws-cost-usage-report">AWS Cost &amp; Usage Report</button> &lt;3 times.</p>\n',
    );
  });

  it('refuses raw HTML and links to pages the site does not have', () => {
    expect(() => render('Text with <b>bold</b>.')).toThrow(`${PATH}: raw HTML is not allowed in Markdown`);
    expect(() => render('See [gone](03-gone.md).')).toThrow(
      `${PATH}: link to 03-gone.md has no page on the site`,
    );
  });
});

describe('termMatcher', () => {
  const matcher = termMatcher([
    entry('Amazon Elastic Compute Cloud (Amazon EC2)', 'amazon-elastic-compute-cloud-amazon-ec2'),
    entry('Amazon EC2 Auto Scaling', 'amazon-ec2-auto-scaling'),
    entry('Availability Zone (AZ)', 'availability-zone-az'),
  ]);
  const ids = (text: string): (string | undefined)[] =>
    [...text.matchAll(matcher.pattern)].map((m) => matcher.idByForm.get(m[0].toLowerCase()));

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
