/** "Exam guide update" lines: the one sourced exception to course-only notes (spec 2.3). */
/** A list item that opens with "Exam guide update" in any case or emphasis: a line R13 must either parse or report. */
const UPDATE_CANDIDATE = /^\s*(?:[-*+]|\d+[.)])\s+[*_]*exam guide update/i;
const UPDATE_LINE =
  /^- \*\*Exam guide update\*\* \(verified_on (\d{4}-\d{2}-\d{2}), \[([^\]]+)\]\((https:\/\/[^)\s]+)\)\): (\S.*)$/;

export interface UpdateLine {
  verifiedOn: string;
  title: string;
  url: string;
  sentence: string;
}

export function parseUpdateLine(line: string): UpdateLine | null {
  const match = UPDATE_LINE.exec(line.trim());
  if (!match) return null;
  return { verifiedOn: match[1] ?? '', title: match[2] ?? '', url: match[3] ?? '', sentence: match[4] ?? '' };
}

export function looksLikeUpdateLine(line: string): boolean {
  return UPDATE_CANDIDATE.test(line);
}
