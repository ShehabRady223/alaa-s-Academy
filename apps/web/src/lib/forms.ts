import { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '@/api/client';

/** Puts server-side validation errors next to the right inputs; returns a message for anything else. */
export function applyServerErrors<T extends FieldValues>(err: unknown, setError: UseFormSetError<T>, fields: string[]): string | null {
  if (!(err instanceof ApiError)) return 'Something went wrong. Please try again.';
  const rest: string[] = [];
  for (const d of err.details ?? []) {
    if (fields.includes(d.path)) setError(d.path as Path<T>, { message: d.message });
    else rest.push(d.message);
  }
  if (rest.length) return rest.join('. ');
  return err.details?.length ? null : err.message;
}
