import type { QueryClient } from '@tanstack/react-query';

/**
 * Which cached views depend on which kind of change. Each mutation names the group it affects, so a change can never
 * leave a derived screen (dashboard counts, student profile, exam detail...) showing stale data.
 */
const GROUPS = {
  students: ['students', 'student-profile', 'admin-dashboard', 'exam-access', 'hw', 'hw-list'],
  bank: ['subjects', 'questions', 'exam', 'global-questions', 'global-topics'],
  exams: ['exams', 'exam', 'exam-access', 'admin-dashboard'],
  access: ['exam-access', 'access-pin', 'admin-dashboard', 'student-profile', 'students', 'student-dashboard'],
  results: ['results', 'result-detail', 'admin-dashboard', 'student-profile', 'students', 'exam-analytics', 'global-questions', 'global-topics', 'notifications', 'student-dashboard'],
  homework: ['hw-list', 'hw', 'hw-submissions', 'hw-submission', 'hw-mine', 'hw-mine-one', 'notifications'],
  settings: ['settings'],
  notifications: ['notifications'],
} as const;
export type Group = keyof typeof GROUPS;

/**
 * Marks dependent queries stale (mounted ones refetch in the background). Deliberately NOT awaited by callers:
 * returning this promise from a mutation's onSuccess would hold back navigation, toasts and dialog closing until every
 * refetch finished, which is what made some actions look like "nothing happened".
 */
export function invalidate(qc: QueryClient, ...groups: Group[]): void {
  new Set(groups.flatMap((g) => GROUPS[g])).forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));
}
