/**
 * The service worker (spec 1.4 and 9 e2e 6): precaches the whole build on install, so every lesson and every
 * module's questions work offline after one visit. Navigations go to the network first and fall back to the
 * cached `index.html`; every path is relative to the worker, so the site runs under any sub-path; everything else, all of it content-hashed, comes from the cache first. A new version
 * waits for the next launch (no `skipWaiting`), so an open page never mixes two builds.
 * The file imports nothing, so the build emits it as one classic script; `scripts/sw-plugin.ts` writes the
 * manifest over the placeholder string below.
 * The empty export makes the file a module for TypeScript, so its names stay out of the DOM's global scope.
 */

export {};

interface Manifest {
  version: string;
  files: string[];
}

interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<unknown>): void;
}

interface FetchEvent extends ExtendableEvent {
  readonly request: Request;
  respondWith(response: Promise<Response>): void;
}

/** The parts of `ServiceWorkerGlobalScope` this file uses; the DOM lib the app compiles with has no worker types. */
interface WorkerScope {
  readonly location: { readonly origin: string };
  readonly clients: { claim(): Promise<void> };
  addEventListener(type: 'install' | 'activate', listener: (event: ExtendableEvent) => void): void;
  addEventListener(type: 'fetch', listener: (event: FetchEvent) => void): void;
}

// Read once, so no minifier can copy the placeholder.
const MANIFEST = '__SW_MANIFEST__' as unknown as Manifest;
const { version, files } = MANIFEST;
const PREFIX = 'ccp-';
const CACHE = `${PREFIX}${version}`;
const scope = self as unknown as WorkerScope;
/**
 * `ignoreVary`: servers may send `Vary: Origin`, and the page's module script and stylesheet requests carry an
 * Origin header that the precache requests lack, so a Vary-aware match would miss them offline.
 */
const MATCH = { cacheName: CACHE, ignoreVary: true };

async function precache(): Promise<void> {
  const cache = await caches.open(CACHE);
  await cache.addAll(files);
}

async function dropOldCaches(): Promise<void> {
  const names = await caches.keys();
  await Promise.all(
    names.filter((name) => name.startsWith(PREFIX) && name !== CACHE).map((name) => caches.delete(name)),
  );
  await scope.clients.claim();
}

async function networkFirst(request: Request): Promise<Response> {
  try {
    return await fetch(request);
  } catch {
    return (await caches.match('index.html', MATCH)) ?? Response.error();
  }
}

async function cacheFirst(request: Request): Promise<Response> {
  return (await caches.match(request, MATCH)) ?? fetch(request);
}

scope.addEventListener('install', (event) => {
  event.waitUntil(precache());
});

scope.addEventListener('activate', (event) => {
  event.waitUntil(dropOldCaches());
});

scope.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== scope.location.origin) return;
  event.respondWith(request.mode === 'navigate' ? networkFirst(request) : cacheFirst(request));
});
