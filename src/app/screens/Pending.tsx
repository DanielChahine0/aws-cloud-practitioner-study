import { useTitle } from '../../ui/useTitle.ts';

/** A placeholder for a Phase 3 screen until its own task replaces it. */
export function Pending({ title }: { title: string }) {
  useTitle(title);
  return (
    <>
      <h1>{title}</h1>
      <p class="muted">This screen is not built yet.</p>
    </>
  );
}
