import type { Plugin } from 'vite';

/**
 * The Content-Security-Policy of the site (spec 1.4): CloudFront sends it from infra/site.yaml,
 * and `vite preview` sends it too, so the end-to-end tests run under the production policy.
 */
export const CSP = "default-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'";

/**
 * The same policy for a `<meta>` tag, for hosts that cannot send headers (GitHub Pages).
 * Browsers ignore `frame-ancestors` in a meta policy and log an error for it, so it is left out.
 */
export const META_CSP = CSP.split(';')
  .map((directive) => directive.trim())
  .filter((directive) => !directive.startsWith('frame-ancestors'))
  .join('; ');

/** The charset tag of `index.html`, which the policy goes right after. */
const CHARSET = '<meta charset="utf-8" />';

/**
 * Writes META_CSP into the built `index.html` right after the charset, ahead of every script and stylesheet,
 * so the policy holds on any host.
 * Build only: Vite's dev server injects inline styles that the policy would block.
 */
export function cspMetaPlugin(): Plugin {
  return {
    name: 'ccp-csp-meta',
    apply: 'build',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (html.split(CHARSET).length !== 2) throw new Error(`index.html must hold ${CHARSET} exactly once`);
        return html.replace(
          CHARSET,
          `${CHARSET}\n    <meta http-equiv="Content-Security-Policy" content="${META_CSP}" />`,
        );
      },
    },
  };
}
