export type Role = 'admin' | 'student';
export interface User { id: string; name: string; email: string; role: Role; avatar: string | null }
export interface Paginated<T> { items: T[]; page: number; limit: number; total: number; totalPages: number }
