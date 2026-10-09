import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

/** The only unhashed files the site serves: uploaded with no-cache, invalidated on every deploy, never pruned (spec 1.4). */
export const ENTRY_FILES = ['index.html', 'sw.js'] as const;
/** The manifest in the bucket that remembers the files of the last two deploys. */
export const LOG_FILE = 'deploys.json';

export const DeployLog = z.strictObject({
  deploys: z.array(z.strictObject({ at: z.string(), files: z.array(z.string()) })),
});
export type DeployLog = z.infer<typeof DeployLog>;
export type Deploy = DeployLog['deploys'][number];

export interface StackOutputs {
  bucket: string;
  distributionId: string;
  siteUrl: string;
}

const Outputs = z.array(z.object({ OutputKey: z.string(), OutputValue: z.string() }));
const Keys = z.array(z.string()).nullable();

/**
 * Bucket keys to delete: those in neither this build nor the last logged deploy, so a browser that still
 * holds the previous index.html can load its chunks; entry files and the log are never pruned.
 */
export function prunable(existing: readonly string[], log: DeployLog, current: readonly string[]): string[] {
  const keep = new Set<string>([...current, ...(log.deploys.at(-1)?.files ?? []), ...ENTRY_FILES, LOG_FILE]);
  return existing.filter((key) => !keep.has(key));
}

/** The log to write after a deploy: the previous deploy and this one. */
export function nextLog(log: DeployLog, deploy: Deploy): DeployLog {
  const previous = log.deploys.at(-1);
  return { deploys: previous === undefined ? [deploy] : [previous, deploy] };
}

/** Reads deploys.json; a missing log (null) means nothing was deployed yet. */
export function parseLog(text: string | null): DeployLog {
  return text === null ? { deploys: [] } : DeployLog.parse(JSON.parse(text));
}

/** Reads `aws s3api list-objects-v2 --query 'Contents[].Key'` output, which is null for an empty bucket. */
export function parseKeys(text: string): string[] {
  return Keys.parse(JSON.parse(text)) ?? [];
}

/** Reads `aws cloudformation describe-stacks --query 'Stacks[0].Outputs'` output for the three outputs of infra/site.yaml. */
export function stackOutputs(text: string): StackOutputs {
  const outputs = new Map(Outputs.parse(JSON.parse(text)).map((o) => [o.OutputKey, o.OutputValue] as const));
  const get = (key: string): string => {
    const value = outputs.get(key);
    if (value === undefined) throw new Error(`stack output ${key} is missing`);
    return value;
  };
  return { bucket: get('BucketName'), distributionId: get('DistributionId'), siteUrl: get('SiteUrl') };
}

/** Every file below dir, as sorted posix paths relative to it. */
export function distFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (rel: string): void => {
    for (const entry of readdirSync(join(dir, rel), { withFileTypes: true })) {
      const path = rel === '' ? entry.name : `${rel}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) out.push(path);
    }
  };
  walk('');
  return out.sort();
}
