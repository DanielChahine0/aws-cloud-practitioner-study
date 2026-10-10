import type { LabFile } from '../../schemas/lab.ts';

/** Made-up bakery Trace labs, one per kind, the worked examples of the Trace engine; no course text. */

/** A lab file of the Trace engine; `LabFile` itself admits `trace` only once Task 4 registers the engine. */
export type TraceLabFile = Omit<LabFile, 'engine'> & { readonly engine: 'trace' };

const DEBRIEF: LabFile['debrief'] = {
  lines: [
    'A guard at the door remembers who came in, so the answer goes back out without a rule of its own.',
    'A gate list checks every crossing both ways, so the answer needs a rule of its own on the way out.',
  ],
  questions: ['q-b4k7m2', 'q-d9p4r6'],
};

/**
 * The order window of the bakery: one security group and one network ACL around one shop front. Customers must
 * reach the order page over HTTPS with the replies getting back out, a blocked range stays out, the office alone
 * logs in over SSH, and the window still fetches its daily menu.
 */
export const TRACE_NETWORK_SPEC = {
  kind: 'network',
  target: 'Order window',
  sg: {
    label: 'window-sg',
    rules: [
      { id: 'sg-https-all', dir: 'in', proto: 'tcp', from: 443, to: 443, cidr: '0.0.0.0/0', on: false },
      { id: 'sg-ssh-all', dir: 'in', proto: 'tcp', from: 22, to: 22, cidr: '0.0.0.0/0', on: false },
      { id: 'sg-ssh-office', dir: 'in', proto: 'tcp', from: 22, to: 22, cidr: '192.0.2.0/24', on: false },
      { id: 'sg-out-https', dir: 'out', proto: 'tcp', from: 443, to: 443, cidr: '0.0.0.0/0', on: true },
      { id: 'sg-out-replies', dir: 'out', proto: 'tcp', from: 1024, to: 65535, cidr: '0.0.0.0/0', on: false },
    ],
  },
  nacl: {
    label: 'front-acl',
    rules: [
      {
        id: 'acl-deny-blocked',
        n: 90,
        dir: 'in',
        proto: 'all',
        from: 0,
        to: 65535,
        cidr: '198.51.100.0/24',
        action: 'deny',
        on: true,
      },
      {
        id: 'acl-https-in',
        n: 100,
        dir: 'in',
        proto: 'tcp',
        from: 443,
        to: 443,
        cidr: '0.0.0.0/0',
        action: 'allow',
        on: true,
      },
      {
        id: 'acl-ssh-in',
        n: 110,
        dir: 'in',
        proto: 'tcp',
        from: 22,
        to: 22,
        cidr: '0.0.0.0/0',
        action: 'allow',
        on: true,
      },
      {
        id: 'acl-replies-in',
        n: 120,
        dir: 'in',
        proto: 'tcp',
        from: 1024,
        to: 65535,
        cidr: '0.0.0.0/0',
        action: 'allow',
        on: true,
      },
      {
        id: 'acl-replies-out',
        n: 100,
        dir: 'out',
        proto: 'tcp',
        from: 1024,
        to: 65535,
        cidr: '0.0.0.0/0',
        action: 'allow',
        on: false,
      },
      {
        id: 'acl-https-out',
        n: 110,
        dir: 'out',
        proto: 'tcp',
        from: 443,
        to: 443,
        cidr: '0.0.0.0/0',
        action: 'allow',
        on: true,
      },
    ],
  },
  cases: [
    {
      id: 'customer-order',
      goal: 'g1',
      label: 'A customer opens the order page',
      dir: 'in',
      proto: 'tcp',
      ip: '203.0.113.10',
      port: 443,
      reply: 49152,
      expect: 'allow',
    },
    {
      id: 'blocked-order',
      goal: 'g1',
      label: 'A blocked address opens the order page',
      dir: 'in',
      proto: 'tcp',
      ip: '198.51.100.7',
      port: 443,
      reply: 49152,
      expect: 'deny',
    },
    {
      id: 'daily-menu',
      goal: 'g1',
      label: 'The window fetches the daily menu',
      dir: 'out',
      proto: 'tcp',
      ip: '203.0.113.50',
      port: 443,
      reply: 51000,
      expect: 'allow',
    },
    {
      id: 'stranger-ssh',
      goal: 'g2',
      label: 'A stranger tries to log in over SSH',
      dir: 'in',
      proto: 'tcp',
      ip: '203.0.113.10',
      port: 22,
      reply: 50000,
      expect: 'deny',
    },
    {
      id: 'office-ssh',
      goal: 'g2',
      label: 'The bakery office logs in over SSH',
      dir: 'in',
      proto: 'tcp',
      ip: '192.0.2.15',
      port: 22,
      reply: 50000,
      expect: 'allow',
    },
  ],
} as const;

/**
 * The bakery group's keys: an org root, a Shops OU and the East shop account, each with an allow-all SCP, a
 * switched-off SCP Deny on oven deletes at the OU, and candidate identity statements for the Bakers group, of which
 * Mo is a member and Lu is not.
 */
export const TRACE_POLICY_SPEC = {
  kind: 'policy',
  principals: [
    { id: 'baker-mo', label: 'Mo the baker', groups: ['bakers'], account: 'shop-east' },
    { id: 'cashier-lu', label: 'Lu at the till', groups: [], account: 'shop-east' },
  ],
  groups: [{ id: 'bakers', label: 'Bakers' }],
  org: [
    { id: 'bakery-org', label: 'Bakery group' },
    { id: 'shops', label: 'Shops', parent: 'bakery-org' },
    { id: 'shop-east', label: 'East shop', parent: 'shops' },
  ],
  policies: [
    {
      id: 'root-all',
      label: 'Full access',
      kind: 'scp',
      attach: 'bakery-org',
      statements: [{ id: 'root-allow-all', effect: 'allow', actions: ['*'], resources: ['*'], on: true }],
    },
    {
      id: 'shops-all',
      label: 'Full access',
      kind: 'scp',
      attach: 'shops',
      statements: [{ id: 'shops-allow-all', effect: 'allow', actions: ['*'], resources: ['*'], on: true }],
    },
    {
      id: 'shops-guard',
      label: 'No oven deletes',
      kind: 'scp',
      attach: 'shops',
      statements: [
        { id: 'deny-oven-delete', effect: 'deny', actions: ['oven:Delete*'], resources: ['*'], on: false },
      ],
    },
    {
      id: 'east-all',
      label: 'Full access',
      kind: 'scp',
      attach: 'shop-east',
      statements: [{ id: 'east-allow-all', effect: 'allow', actions: ['*'], resources: ['*'], on: true }],
    },
    {
      id: 'bakers-policy',
      label: 'Bakers policy',
      kind: 'iam',
      attach: 'bakers',
      statements: [
        {
          id: 'read-recipes',
          effect: 'allow',
          actions: ['recipes:Get*'],
          resources: ['recipes/*'],
          on: false,
        },
        {
          id: 'bake-ovens',
          effect: 'allow',
          actions: ['oven:StartBake', 'oven:StopBake'],
          resources: ['oven/*'],
          on: false,
        },
        { id: 'all-ovens', effect: 'allow', actions: ['oven:*'], resources: ['*'], on: false },
      ],
    },
    {
      id: 'till-policy',
      label: 'Till policy',
      kind: 'iam',
      attach: 'cashier-lu',
      statements: [
        { id: 'open-till', effect: 'allow', actions: ['till:Open'], resources: ['till/front'], on: true },
      ],
    },
  ],
  cases: [
    {
      id: 'mo-recipes',
      goal: 'g1',
      label: 'Mo reads the rye recipe',
      principal: 'baker-mo',
      action: 'recipes:GetRecipe',
      resource: 'recipes/rye.txt',
      expect: 'allow',
    },
    {
      id: 'mo-bakes',
      goal: 'g1',
      label: 'Mo starts a bake in the deck oven',
      principal: 'baker-mo',
      action: 'oven:StartBake',
      resource: 'oven/deck-1',
      expect: 'allow',
    },
    {
      id: 'mo-deletes',
      goal: 'g2',
      label: 'Mo deletes the deck oven',
      principal: 'baker-mo',
      action: 'oven:DeleteOven',
      resource: 'oven/deck-1',
      expect: 'deny',
    },
    {
      id: 'lu-recipes',
      goal: 'g2',
      label: 'Lu reads the rye recipe',
      principal: 'cashier-lu',
      action: 'recipes:GetRecipe',
      resource: 'recipes/rye.txt',
      expect: 'deny',
    },
  ],
} as const;

/** A complete network Trace lab: open the order window to customers and to the office alone. */
export function bakeryTraceLab(over: Partial<TraceLabFile> = {}): TraceLabFile {
  return {
    id: 'lab-m01-bakery-door',
    module: 1,
    title: 'Open the order window',
    engine: 'trace',
    tier: 'core',
    status: 'live',
    rev: 1,
    concepts: ['shared-kitchen', 'per-minute-rental'],
    notes: ['m01/what-a-bakery-cloud-is'],
    minutes: 6,
    brief:
      'Customers cannot reach the order window. Switch rules on and off until every test case gives its expected result. In this lab the network ACL checks its rules from the lowest number up, and a reply leaves on a port from 1024 to 65535.',
    spec: TRACE_NETWORK_SPEC,
    goals: [
      {
        id: 'g1',
        label: 'Customers can order through the window',
        hint: 'Follow the reply of an order on its way back out, past both the guard and the gate list.',
      },
      {
        id: 'g2',
        label: 'Only the office logs in',
        hint: 'SSH is for the bakery office, and the rest of the internet must stay out.',
      },
    ],
    solution: [
      { t: 'toggle', rule: 'sg-https-all', on: true },
      { t: 'toggle', rule: 'acl-replies-out', on: true },
      { t: 'toggle', rule: 'sg-ssh-office', on: true },
    ],
    wrongPaths: [
      {
        actions: [
          { t: 'toggle', rule: 'sg-https-all', on: true },
          { t: 'toggle', rule: 'sg-ssh-office', on: true },
        ],
        failsGoal: 'g1',
        mistake: 'Opened the window but left the replies no way out',
      },
      {
        actions: [
          { t: 'toggle', rule: 'sg-https-all', on: true },
          { t: 'toggle', rule: 'acl-replies-out', on: true },
          { t: 'toggle', rule: 'sg-ssh-all', on: true },
        ],
        failsGoal: 'g2',
        mistake: 'Opened SSH to the whole internet',
      },
    ],
    debrief: DEBRIEF,
    ...over,
  };
}

/** A complete policy Trace lab: give Mo the baker what a bake needs and nothing more. */
export function bakeryPolicyLab(over: Partial<TraceLabFile> = {}): TraceLabFile {
  return {
    id: 'lab-m01-bakery-keys',
    module: 1,
    title: 'Keys for the bakers',
    engine: 'trace',
    tier: 'core',
    status: 'live',
    rev: 1,
    concepts: ['shared-kitchen', 'per-minute-rental'],
    notes: ['m01/what-a-bakery-cloud-is'],
    minutes: 6,
    brief:
      'Mo joins the bakers. Switch statements on and off until every test case gives its expected result. In this lab a request passes only when every SCP from the root down and an identity policy allow it, and any Deny wins.',
    spec: TRACE_POLICY_SPEC,
    goals: [
      {
        id: 'g1',
        label: 'Mo can read recipes and bake',
        hint: 'A baker reads recipes and starts and stops bakes, through the group.',
      },
      {
        id: 'g2',
        label: 'Nothing more than the bake',
        hint: 'No oven is deleted, and the till staff never read the recipes.',
      },
    ],
    solution: [
      { t: 'toggle', rule: 'read-recipes', on: true },
      { t: 'toggle', rule: 'bake-ovens', on: true },
    ],
    wrongPaths: [
      {
        actions: [{ t: 'toggle', rule: 'read-recipes', on: true }],
        failsGoal: 'g1',
        mistake: 'Gave Mo the recipes but not the ovens',
      },
      {
        actions: [
          { t: 'toggle', rule: 'read-recipes', on: true },
          { t: 'toggle', rule: 'all-ovens', on: true },
        ],
        failsGoal: 'g2',
        mistake: 'Let Mo do anything to every oven',
      },
    ],
    debrief: DEBRIEF,
    ...over,
  };
}
