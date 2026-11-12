import { cn } from '@/lib/cn';
import type { QType } from './types';

/** A teacher's or a graded student's view of one answer: what was chosen next to what was correct. */
export function ReviewBody({ q }: { q: { type: QType; options: { id: string; text: string }[]; response: string | string[] | null; correctOptionIds?: string[]; acceptedAnswers?: string[] } }) {
  const chosen = new Set(Array.isArray(q.response) ? q.response : typeof q.response === 'string' ? [q.response] : []);
  const correct = new Set(q.correctOptionIds ?? []); const known = q.correctOptionIds !== undefined;
  if (q.options.length) return (
    <ul className="mt-2 space-y-1">{q.options.map((o) => { const mine = chosen.has(o.id); const ok = correct.has(o.id);
      return <li key={o.id} className={cn('flex justify-between gap-2 rounded px-2 py-1 text-[13px]', mine && known && ok && 'bg-green-50', mine && known && !ok && 'bg-red-50', mine && !known && 'bg-neutral-100')}>
        <span>{o.text}</span><span className="shrink-0 text-xs text-neutral-600">{[mine && 'Student answer', known && ok && 'Correct'].filter(Boolean).join(' · ')}</span></li>; })}
      {chosen.size === 0 && <li className="px-2 text-[13px] italic text-neutral-500">Not answered</li>}</ul>);
  return (
    <div className="mt-2 space-y-1.5 text-[13px]"><p className="whitespace-pre-line rounded border border-neutral-200 bg-neutral-50 px-3 py-2">{typeof q.response === 'string' && q.response ? q.response : <em className="text-neutral-500">Not answered</em>}</p>
      {!!q.acceptedAnswers?.length && <p className="text-neutral-600">Accepted: {q.acceptedAnswers.join(', ')}</p>}</div>);
}
