/** Renders HTML that the content build produced; the only place the app injects HTML. */
export function Html({ html, className }: { html: string; className?: string }) {
  // biome-ignore lint/security/noDangerouslySetInnerHtml: the content build escapes text and rejects raw HTML in notes
  return <div class={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
