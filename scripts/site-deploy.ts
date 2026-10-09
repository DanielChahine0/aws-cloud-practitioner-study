/** pnpm site:deploy: runs the full gate, then publishes dist/ to the Mission 1 stack (spec 1.4). */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  distFiles,
  ENTRY_FILES,
  LOG_FILE,
  nextLog,
  parseKeys,
  parseLog,
  prunable,
  stackOutputs,
} from './lib/deploy.ts';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const stack = process.env.CCP_STACK ?? 'ccp-study-site';
const profile = process.env.AWS_PROFILE ?? 'ccp-admin';
const IMMUTABLE = ['--cache-control', 'public, max-age=31536000, immutable'];
const NO_CACHE = ['--cache-control', 'no-cache'];
const QUIET = ['--only-show-errors'];
/** The most keys one s3api delete-objects call accepts. */
const DELETE_BATCH = 1000;

/** Runs the AWS CLI with the deploy profile and returns its stdout; stderr goes straight to the terminal. */
function aws(args: readonly string[], input?: string): string {
  return execFileSync('aws', args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, AWS_PROFILE: profile, AWS_PAGER: '' },
    stdio: ['pipe', 'pipe', 'inherit'],
    maxBuffer: 64 * 1024 * 1024,
    ...(input === undefined ? {} : { input }),
  });
}

const query = (expression: string, output = 'json'): string[] => ['--query', expression, '--output', output];

function main(): void {
  const changes = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' });
  if (changes.trim() !== '') {
    throw new Error('uncommitted changes; commit them first so the site matches a commit');
  }
  execFileSync('pnpm', ['verify'], { cwd: root, stdio: 'inherit' });

  const outputs = aws([
    'cloudformation',
    'describe-stacks',
    '--stack-name',
    stack,
    ...query('Stacks[0].Outputs'),
  ]);
  const { bucket, distributionId, siteUrl } = stackOutputs(outputs);
  const target = `s3://${bucket}`;
  const current = distFiles(dist);

  // 1. Hashed files, never overwritten in place, so no --delete (pruning below removes old ones).
  const excludes = ENTRY_FILES.flatMap((file) => ['--exclude', file]);
  aws(['s3', 'sync', dist, target, ...excludes, ...IMMUTABLE, ...QUIET]);
  console.log(`site:deploy: synced the hashed files to ${target}`);

  // 2. Entry files that this build has, with no-cache.
  for (const file of ENTRY_FILES) {
    if (!existsSync(join(dist, file))) continue;
    aws(['s3', 'cp', join(dist, file), `${target}/${file}`, ...NO_CACHE, ...QUIET]);
    console.log(`site:deploy: uploaded ${file} with no-cache`);
  }

  // 3. Invalidation of the entry paths.
  const paths = ['/', ...ENTRY_FILES.map((file) => `/${file}`)];
  const invalidation = aws([
    'cloudfront',
    'create-invalidation',
    '--distribution-id',
    distributionId,
    '--paths',
    ...paths,
    ...query('Invalidation.Id', 'text'),
  ]);
  console.log(`site:deploy: invalidation ${invalidation.trim()} for ${paths.join(', ')}`);

  // 4. Prune what neither this build nor the previous deploy uses, then log this deploy.
  const existing = parseKeys(
    aws(['s3api', 'list-objects-v2', '--bucket', bucket, ...query('Contents[].Key')]),
  );
  const log = parseLog(existing.includes(LOG_FILE) ? aws(['s3', 'cp', `${target}/${LOG_FILE}`, '-']) : null);
  const stale = prunable(existing, log, current);
  for (let i = 0; i < stale.length; i += DELETE_BATCH) {
    const batch = { Objects: stale.slice(i, i + DELETE_BATCH).map((key) => ({ Key: key })), Quiet: true };
    aws(['s3api', 'delete-objects', '--bucket', bucket, '--delete', JSON.stringify(batch)]);
  }
  const noun = stale.length === 1 ? 'file' : 'files';
  console.log(`site:deploy: pruned ${stale.length} ${noun} that only older deploys used`);

  const next = nextLog(log, { at: new Date().toISOString(), files: current });
  const logArgs = [
    's3',
    'cp',
    '-',
    `${target}/${LOG_FILE}`,
    ...NO_CACHE,
    '--content-type',
    'application/json',
  ];
  aws(logArgs, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`site:deploy: done, ${siteUrl}`);
}

try {
  main();
} catch (error) {
  console.error(`site:deploy: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
