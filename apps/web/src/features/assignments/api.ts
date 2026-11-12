import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { invalidate } from '@/api/invalidate';
import type { Paginated } from '@/api/types';
import type { Tone } from '@/components/ui/Badge';
import type { QuestionData } from '@/features/questions/types';

// Assignments = homework. Nothing in this file refers to exams or PINs.
export type HwStatus = 'draft' | 'published' | 'closed';
export const HW_STATUS: Record<HwStatus, { label: string; tone: Tone }> = { draft: { label: 'Draft', tone: 'neutral' }, published: { label: 'Published', tone: 'success' }, closed: { label: 'Closed', tone: 'warning' } };
export interface HwSummary {
  id: string; title: string; subject: string; description: string | null; instructions: string | null; status: HwStatus; dueDate: string | null; allowLate: boolean; questionCount: number; totalPoints: number;
  recipientCount: number; submittedCount: number; gradedCount: number; publishedAt: string | null; createdAt: string; updatedAt: string;
}
export interface HwDetail extends HwSummary { questions: QuestionData[]; students: { id: string; name: string; email: string }[] }
export interface HwInput { title: string; subject: string; description?: string; instructions?: string; questions: Record<string, unknown>[]; studentIds: string[]; dueDate: string | null; allowLate: boolean }
export interface SubmissionRow { student: { id: string; name: string; email: string }; submission: { id: string; status: 'submitted' | 'graded'; submittedAt: string | null; late: boolean; score: number | null; maxScore: number | null } | null }
export interface SubmissionQuestion extends QuestionData { response: string | string[] | null; pointsAwarded: number | null; isCorrect: boolean | null; needsReview: boolean; feedback: string | null }
export interface SubmissionDetail {
  id: string; status: 'submitted' | 'graded'; submittedAt: string | null; late: boolean; score: number | null; maxScore: number; feedback: string | null;
  student: { id: string; name: string; email: string } | null; assignment: { id: string; title: string }; questions: SubmissionQuestion[];
}

export const useHwList = (p: { page: number; limit: number; status?: HwStatus; search?: string }) =>
  useQuery({ queryKey: ['hw-list', p], placeholderData: keepPreviousData, queryFn: async () => (await api.get<Paginated<HwSummary>>('/assignments', { params: p })).data });
export const useHw = (id: string) => useQuery({ queryKey: ['hw', id], enabled: !!id, queryFn: async () => (await api.get<{ assignment: HwDetail }>(`/assignments/${id}`)).data.assignment });
export const useHwSubmissions = (id: string) => useQuery({ queryKey: ['hw-submissions', id], queryFn: async () => (await api.get<{ items: SubmissionRow[] }>(`/assignments/${id}/submissions`)).data.items });
export const useHwSubmission = (id: string, sid: string) => useQuery({ queryKey: ['hw-submission', id, sid], queryFn: async () => (await api.get<{ submission: SubmissionDetail }>(`/assignments/${id}/submissions/${sid}`)).data.submission });

function useHwMutation<V, R extends HwDetail | HwSummary | void>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (d) => { invalidate(qc, 'homework'); if (d && 'students' in d) qc.setQueryData(['hw', d.id], d); }, // PATCH/publish/close return the full detail
  });
}
export const useCreateHw = () => useHwMutation(async (b: HwInput & { publish: boolean }) => (await api.post<{ assignment: HwSummary }>('/assignments', b)).data.assignment);
export const useUpdateHw = () => useHwMutation(async ({ id, body }: { id: string; body: Partial<HwInput> }) => (await api.patch<{ assignment: HwDetail }>(`/assignments/${id}`, body)).data.assignment);
export const usePublishHw = () => useHwMutation(async (id: string) => (await api.post<{ assignment: HwDetail }>(`/assignments/${id}/publish`)).data.assignment);
export const useCloseHw = () => useHwMutation(async (id: string) => (await api.post<{ assignment: HwDetail }>(`/assignments/${id}/close`)).data.assignment);
export const useDeleteHw = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (id: string) => { await api.delete(`/assignments/${id}`); return id; }, onSuccess: (id) => { qc.removeQueries({ queryKey: ['hw', id] }); invalidate(qc, 'homework'); } });
};
export const useGradeHw = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, sid, ...body }: { id: string; sid: string; grades: { questionId: string; points: number; feedback?: string }[]; feedback?: string }) => (await api.patch<{ submission: SubmissionDetail }>(`/assignments/${id}/submissions/${sid}/grade`, body)).data.submission,
    onSuccess: (d, v) => { invalidate(qc, 'homework'); qc.setQueryData(['hw-submission', v.id, v.sid], d); },
  });
};

// ---- student side ----
export interface MineRow { id: string; title: string; dueDate: string | null; status: HwStatus; questionCount: number; totalPoints: number; overdue: boolean; submission: { status: 'draft' | 'submitted' | 'graded'; submittedAt: string | null; late: boolean; score: number | null; maxScore: number | null } | null }
export interface MineQuestion { questionId: string; type: QuestionData['type']; text: string; options: { id: string; text: string }[]; points: number; image: string | null }
export interface MineResult { questionId: string; points: number; isCorrect: boolean | null; feedback: string | null; correctOptionIds: string[]; acceptedAnswers: string[]; explanation: string | null }
export type Answer = string | string[] | null;
export interface MineDetail {
  id: string; title: string; description: string | null; instructions: string | null; dueDate: string | null; allowLate: boolean; status: HwStatus; questions: MineQuestion[]; totalPoints: number;
  submission: null | { status: 'draft' | 'submitted' | 'graded'; answers: { questionId: string; response: Answer }[]; submittedAt: string | null; late: boolean; score?: number | null; maxScore?: number | null; feedback?: string | null; results?: MineResult[] };
}
export const useMyHw = () => useQuery({ queryKey: ['hw-mine'], queryFn: async () => (await api.get<{ items: MineRow[] }>('/student/assignments')).data.items });
export const useMyHwOne = (id: string) => useQuery({ queryKey: ['hw-mine-one', id], queryFn: async () => (await api.get<{ assignment: MineDetail }>(`/student/assignments/${id}`)).data.assignment });
export const useSaveDraft = () => useMutation({ mutationFn: async ({ id, answers }: { id: string; answers: { questionId: string; response: Answer }[] }) => (await api.put<{ savedAt: string }>(`/student/assignments/${id}/submission`, { answers })).data });
export const useSubmitHw = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, answers }: { id: string; answers: { questionId: string; response: Answer }[] }) => (await api.post<{ assignment: MineDetail }>(`/student/assignments/${id}/submission/submit`, { answers })).data.assignment,
    onSuccess: (d) => { invalidate(qc, 'homework'); qc.setQueryData(['hw-mine-one', d.id], d); },
  });
};
