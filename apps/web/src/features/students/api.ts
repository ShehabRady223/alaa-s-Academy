import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { invalidate } from '@/api/invalidate';
import type { Paginated } from '@/api/types';

export type StudentStatus = 'invited' | 'active' | 'disabled';
export interface StudentRow {
  id: string; name: string; email: string; createdAt: string;
  profile: { phone?: string; level?: string; notes?: string; dateOfBirth?: string; status: StudentStatus; lastActiveAt?: string };
  examsTaken: number; averageScore: number | null;
}
export interface StudentListParams { page: number; limit: number; search?: string; status?: StudentStatus; sortBy: 'name' | 'email' | 'createdAt'; order: 'asc' | 'desc' }
export interface InviteResult { inviteLink: string; emailed: boolean }
export interface StudentInput { name: string; email: string; phone?: string; level?: string; dateOfBirth?: string; notes?: string }

export const useStudents = (params: StudentListParams) =>
  useQuery({ queryKey: ['students', params], queryFn: async () => (await api.get<Paginated<StudentRow>>('/students', { params })).data, placeholderData: keepPreviousData });

function useStudentMutation<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => invalidate(qc, 'students') });
}

export const useCreateStudent = () => useStudentMutation(async (v: StudentInput) => (await api.post<InviteResult & { student: StudentRow }>('/students', v)).data);
export const useUpdateStudent = () => useStudentMutation(async ({ id, ...v }: Partial<StudentInput> & { id: string; status?: 'active' | 'disabled' }) => (await api.patch(`/students/${id}`, v)).data);
export const useResendInvite = () => useStudentMutation(async (id: string) => (await api.post<InviteResult>(`/students/${id}/resend-invite`)).data);
export const useDeleteStudent = () => useStudentMutation(async (id: string) => { await api.delete(`/students/${id}`); });
