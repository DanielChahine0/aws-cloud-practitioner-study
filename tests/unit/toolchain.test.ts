import { expect, test } from 'vitest';

test('runs on Node 24, the version pinned in .node-version', () => {
  expect(process.versions.node.split('.')[0]).toBe('24');
});
