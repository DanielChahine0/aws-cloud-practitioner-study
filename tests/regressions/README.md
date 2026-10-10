# Regression tests

Every bug gets one test here before its fix (spec 9).
Name it `YYYY-MM-DD-<slug>.test.ts`, with the day the bug was found and a short slug of what went wrong.
A bug only a browser shows (layout, accessible names) gets `YYYY-MM-DD-<slug>.spec.ts` instead, which Playwright runs with the end-to-end tests against the production build.
Write the test first, run it and watch it fail for the reason the bug report gives, then fix the code and watch it pass.
Keep the test after the fix; it is the proof the bug stays fixed.
