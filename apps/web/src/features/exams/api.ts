import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { invalidate } from '@/api/invalidate';
import type { Paginated } from '@/api/types';
import type { Tone } from '@/components/ui/Badge';
import type { QuestionData } from '@/features/questions/types';

export type EffStatus = 'draft' | 'scheduled' | 'active' | 'expired' | 'archived';
export const EXAM_STATUS: Record<EffStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Draft', tone: 'neutral' }, scheduled: { label: 'Scheduled', tone: 'warning' }, active: { label: 'Active', tone: 'success' },
  expired: { label: 'Expired', tone: 'danger' }, archived: { label: 'Archived', tone: 'neutral' },
};
export interface ExamSettings { shuffleQuestions: boolean; shuffleOptions: boolean; resultRelease: 'instant' | 'manual'; showCorrectAnswers: boolean }
export interface ExamSummary {
  id: string; title: string; subject: string; description: string | null; instructions: string | null; status: 'draft' | 'published' | 'archived'; effectiveStatus: EffStatus;
  durationMinutes: number | null; passingScore: number; maxAttempts: number; startDate: string | null; expiresAt: string | null; settings: ExamSettings;
  questionCount: number; totalPoints: number; publishedAt: string | null; createdAt: string; updatedAt: string;
}
export interface ExamDetail extends ExamSummary { questions: QuestionData[] }
export interface ExamParams { page: number; limit: number; search?: string; status?: string }

export const useExams = (params: ExamParams) => useQuery({ queryKey: ['exams', params], placeholderData: keepPreviousData, queryFn: async () => (await api.get<Paginated<ExamSummary>>('/exams', { params })).data });
export const useExam = (id: string) => useQuery({ queryKey: ['exam', id], enabled: !!id, queryFn: async () => (await api.get<{ exam: ExamDetail }>(`/exams/${id}`)).data.exam });

export type ExamInput = Partial<{
  title: string; subject: string; description: string; instructions: string; durationMinutes: number | null; passingScore: number; maxAttempts: number;
  startDate: string | null; expiresAt: string | null; settings: Partial<ExamSettings>; questions: Record<string, unknown>[];
}>;
const detail = (r: { data: { exam: ExamDetail } }) => r.data.exam;

/**
 * The server's response IS the new state of that exam, so it is written straight into the cache: the editor/detail screen
 * shows it instantly and does not need a second GET. Only the *other* views derived from exams are marked stale.
 */
function useExamMutation<V>(fn: (v: V) => Promise<ExamDetail>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: (d) => { invalidate(qc, 'exams'); qc.setQueryData(['exam', d.id], d); } });
}
export const useCreateExam = () => useExamMutation(async (body: ExamInput & { title: string }) => detail(await api.post('/exams', body)));
export const useUpdateExam = () => useExamMutation(async ({ id, body }: { id: string; body: ExamInput }) => detail(await api.patch(`/exams/${id}`, body)));
export const usePublishExam = () => useExamMutation(async (id: string) => detail(await api.post(`/exams/${id}/publish`)));
export const useArchiveExam = () => useExamMutation(async (id: string) => detail(await api.post(`/exams/${id}/archive`)));
export const useDuplicateExam = () => useExamMutation(async (id: string) => detail(await api.post(`/exams/${id}/duplicate`)));
export const useDeleteExam = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (id: string) => { await api.delete(`/exams/${id}`); return id; }, onSuccess: (id) => { qc.removeQueries({ queryKey: ['exam', id] }); invalidate(qc, 'exams'); } });
};
