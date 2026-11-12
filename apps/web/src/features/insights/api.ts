import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { invalidate, type Group } from '@/api/invalidate';
import type { Paginated } from '@/api/types';
import type { QType } from '@/features/questions/types';

export interface QStat { questionId: string; text: string; type: QType | null; subject: string; topic: string; attempts: number; successRate: number; avgTimeSec: number | null }
export type Trend = 'improving' | 'declining' | 'stable' | 'insufficient_data';
export interface TopicRow { topic: string; percentage: number; questions: number }
export interface SubjectPerf { subject: string; percentage: number; topics: TopicRow[] }
export interface HistoryItem { attemptId: string; examId: string; examTitle: string; attemptNumber: number; status: string; submittedAt: string; score: number | null; maxScore: number; percentage: number | null; passed: boolean | null; timeTakenSec: number | null }
export interface Perf {
  overview: { assignedExams: number; completedExams: number; attempts: number; averagePercentage: number | null; highestPercentage: number | null; lowestPercentage: number | null; trend: Trend; pendingReview: number };
  history: HistoryItem[]; performanceOverTime: { date: string; percentage: number; examTitle: string }[]; subjects: SubjectPerf[];
  strengths: (TopicRow & { subject: string })[]; weaknesses: (TopicRow & { subject: string })[];
}
export interface AdminDashboard {
  cards: { totalStudents: number; activeStudents: number; totalExams: number; publishedExams: number; completedAttempts: number; averageScore: number | null; pendingReviews: number };
  performanceOverTime: { weekOf: string; averagePercentage: number; attempts: number }[]; completionRate: { assigned: number; completed: number; rate: number | null };
  distribution: { range: string; count: number }[]; hardestQuestions: QStat[]; easiestQuestions: QStat[];
}
export interface StudentProfileDetail extends Perf {
  student: { id: string; name: string; email: string; createdAt: string; profile: { phone?: string; level?: string; notes?: string; status: string; lastActiveAt?: string } | null };
  assignedExams: { accessId: string; examTitle: string; status: string; expiresAt: string | null; maxAttempts: number }[];
}
export interface ExamAnalytics {
  exam: { id: string; title: string; passingScore: number };
  summary: { assigned: number; gradedAttempts: number; pendingReview: number; averagePercentage: number | null; highest: number | null; lowest: number | null; passRate: number | null; averageTimeSec: number | null };
  distribution: { range: string; count: number }[]; questions: { hardest: QStat[]; easiest: QStat[]; averageTimePerQuestionSec: number | null }; subjects: SubjectPerf[];
}
export interface ResultRow { id: string; status: 'graded' | 'pending_review'; attemptNumber: number; student: { id: string; name: string; email: string } | null; exam: { id: string; title: string } | null; score: number | null; maxScore: number; percentage: number | null; passed: boolean | null; submittedAt: string | null; timeTakenSec: number | null; released: boolean }
export interface ResultQuestion { questionId: string; type: QType; text: string; options: { id: string; text: string }[]; response: string | string[] | null; correctOptionIds: string[]; acceptedAnswers: string[]; explanation: string | null; subject?: string; topic?: string; isCorrect: boolean | null; pointsAwarded: number; maxPoints: number; needsReview: boolean; feedback: string | null; timeSpentSec: number }
export interface ResultDetail { id: string; status: 'graded' | 'pending_review'; attemptNumber: number; released: boolean; student: { id: string; name: string; email: string } | null; exam: { id: string; title: string; passingScore: number } | null; startedAt: string; submittedAt: string | null; timeTakenSec: number | null; score: number | null; maxScore: number; percentage: number | null; passed: boolean | null; questions: ResultQuestion[] }
export interface Notice { id: string; type: string; title: string; body: string | null; entityType: string | null; entityId: string | null; read: boolean; createdAt: string }
export interface AcademySettings { academyName: string; contactEmail?: string; defaultPassingScore: number; defaultMaxAttempts: number }

export const useAdminDashboard = () => useQuery({ queryKey: ['admin-dashboard'], queryFn: async () => (await api.get<AdminDashboard>('/dashboard/admin')).data });
export const useStudentProfile = (id: string) => useQuery({ queryKey: ['student-profile', id], queryFn: async () => (await api.get<StudentProfileDetail>(`/analytics/students/${id}`)).data });
export const useExamAnalytics = (id?: string) => useQuery({ queryKey: ['exam-analytics', id], enabled: !!id, queryFn: async () => (await api.get<ExamAnalytics>(`/analytics/exams/${id}`)).data });
export const useGlobalQuestions = (enabled: boolean) => useQuery({ queryKey: ['global-questions'], enabled, queryFn: async () => (await api.get<ExamAnalytics['questions']>('/analytics/questions')).data });
export const useGlobalTopics = (enabled: boolean) => useQuery({ queryKey: ['global-topics'], enabled, queryFn: async () => (await api.get<{ subjects: SubjectPerf[] }>('/analytics/topics')).data });
export const useResults = (p: { page: number; limit: number; examId?: string; status?: string }) => useQuery({ queryKey: ['results', p], placeholderData: keepPreviousData, queryFn: async () => (await api.get<Paginated<ResultRow>>('/results', { params: p })).data });
export const useResult = (id: string) => useQuery({ queryKey: ['result-detail', id], queryFn: async () => (await api.get<{ result: ResultDetail }>(`/results/${id}`)).data.result });
export const useSettings = () => useQuery({ queryKey: ['settings'], queryFn: async () => (await api.get<{ settings: AcademySettings }>('/settings')).data.settings });
export const useNotifications = () => useQuery({ queryKey: ['notifications'], refetchInterval: 60_000, queryFn: async () => (await api.get<{ items: Notice[]; unreadCount: number }>('/notifications', { params: { page: 1, limit: 15 } })).data });

function useGroupMutation<V, R>(fn: (v: V) => Promise<R>, group: Group) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => invalidate(qc, group) });
}
export const useGrade = () => useGroupMutation(async ({ id, grades }: { id: string; grades: { questionId: string; points: number; feedback?: string }[] }) => (await api.patch(`/results/${id}/grade`, { grades })).data, 'results');
export const useRelease = () => useGroupMutation(async (id: string) => (await api.post(`/results/${id}/release`)).data, 'results');
export const useReleaseExam = () => useGroupMutation(async (examId: string) => (await api.post<{ released: number }>('/results/release', { examId })).data, 'results');
export const useSaveSettings = () => useGroupMutation(async (b: Partial<AcademySettings>) => (await api.put('/settings', b)).data, 'settings');
export const useMarkRead = () => useGroupMutation(async (id: string) => { await api.post(`/notifications/${id}/read`); }, 'notifications');
export const useMarkAllRead = () => useGroupMutation(async () => { await api.post('/notifications/read-all'); }, 'notifications');
