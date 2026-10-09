/**
 * The Content-Security-Policy of the site (spec 1.4): CloudFront sends it from infra/site.yaml,
 * and `vite preview` sends it too, so the end-to-end tests run under the production policy.
 */
export const CSP = "default-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'";
