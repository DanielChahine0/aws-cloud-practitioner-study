import { describe, expect, it } from 'vitest';
import type { SearchEntry } from '../../schemas/chunks.ts';
import { normalize, rank } from '../../src/app/search.ts';

const entry = (
  kind: SearchEntry['kind'],
  title: string,
  route: string,
  text = normalize(title),
): SearchEntry => ({
  kind,
  title,
  detail: '',
  route,
  text,
});

const ENTRIES: SearchEntry[] = [
  entry('term', 'AWS Lambda', '#/m/03/l/aws-lambda'),
  entry('concept', 'AWS Lambda', '#/m/03/l/aws-lambda/how-lambda-works'),
  entry('module', 'Exploring Compute Services', '#/m/03'),
  entry('lesson', 'AWS Lambda', '#/m/03/l/aws-lambda'),
  entry('module', 'Introduction to the Cloud', '#/m/01'),
  entry('term', 'S3 Glacier', '#/m/06/l/amazon-s3'),
  entry('module', 'Amazon S3 storage', '#/m/06'),
  entry(
    'lesson',
    'Serverless computing',
    '#/m/03/l/serverless',
    'serverless computing run code without managing servers',
  ),
];

describe('rank', () => {
  it('ranks the lesson above the concept and the term of the same name', () => {
    expect(rank(ENTRIES, 'lambda').map((e) => e.kind)).toEqual(['lesson', 'concept', 'term']);
  });

  it('lists the modules in course order for an empty query', () => {
    expect(rank(ENTRIES, '  ').map((e) => e.route)).toEqual(['#/m/03', '#/m/01', '#/m/06']);
  });

  it('puts a title prefix above a word match, whatever the kinds', () => {
    expect(rank(ENTRIES, 's3').map((e) => e.title)).toEqual(['S3 Glacier', 'Amazon S3 storage']);
  });

  it('matches every query word as a word prefix in the text, and nothing else', () => {
    expect(rank(ENTRIES, 'manag serv').map((e) => e.title)).toEqual(['Serverless computing']);
    expect(rank(ENTRIES, 'ambda')).toEqual([]);
  });

  it('finds a lab by its title or by a word of its brief and concepts (spec 7.3)', () => {
    const lab = entry(
      'lab',
      'Pick the compute',
      '#/m/03/lab/lab-m03-pick-the-compute',
      'cafe jobs aws lambda',
    );
    expect(rank([...ENTRIES, lab], 'pick').map((e) => e.route)).toEqual([
      '#/m/03/lab/lab-m03-pick-the-compute',
    ]);
    expect(rank([...ENTRIES, lab], 'cafe jobs').map((e) => e.kind)).toEqual(['lab']);
  });
});
