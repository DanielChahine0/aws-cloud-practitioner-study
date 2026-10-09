/** "Exam guide update" lines: the one sourced exception to course-only notes (spec 2.3). */
export const UPDATE_PREFIX = '- **Exam guide update**';
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
