import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { invalidate } from '@/api/invalidate';
import type { Paginated } from '@/api/types';

export type AccessStatus = 'active' | 'completed' | 'revoked';
export interface AccessRow {
  id: string; status: AccessStatus; pin: string | null; maxAttempts: number; expiresAt: string | null; createdAt: string;
  student: { id: string; name: string; email: string }; exam: { id: string; title: string }; attemptsUsed: number; bestPercentage: number | null;
}
export interface AccessParams { page: number; limit: number; examId?: string; status?: AccessStatus; ids?: string }
export interface CreateResult { created: AccessRow[]; skipped: { studentId: string; reason: string }[] }

export const useExamAccess = (params: AccessParams) =>
  useQuery({ queryKey: ['exam-access', params], placeholderData: keepPreviousData, queryFn: async () => (await api.get<Paginated<AccessRow>>('/exam-access', { params })).data });
export const usePin = (id: string, enabled: boolean) => useQuery({ queryKey: ['access-pin', id], enabled, staleTime: 0, queryFn: async () => (await api.get<{ pin: string }>(`/exam-access/${id}/pin`)).data.pin });

function useAccessMutation<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => invalidate(qc, 'access') });
}
export const useShareExam = () => useAccessMutation(async (b: { examId: string; studentIds: string[]; expiresAt?: string; maxAttempts?: number }) => (await api.post<CreateResult>('/exam-access', b)).data);
export const useRevoke = () => useAccessMutation(async (id: string) => (await api.post(`/exam-access/${id}/revoke`)).data);
export const useRegeneratePin = () => useAccessMutation(async (id: string) => (await api.post(`/exam-access/${id}/pin/regenerate`)).data);

