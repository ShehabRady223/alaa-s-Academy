import { cn } from '@/lib/cn';
import type { QType } from './types';

export type Response = string | string[] | null;
export interface AskedQuestion { questionId: string; type: QType; options: { id: string; text: string }[] }
export const hasAnswer = (r: Response | undefined) => (Array.isArray(r) ? r.length > 0 : !!r && r.trim() !== '');

/** How a student answers a question. Used by the exam runner and by homework, so both behave identically. */
export function AnswerInput({ q, value, onChange, disabled }: { q: AskedQuestion; value: Response; onChange: (v: Response) => void; disabled?: boolean }) {
  const card = cn('flex items-start gap-3 rounded-md border border-neutral-300 bg-white p-3 text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50', disabled ? 'cursor-default opacity-90' : 'cursor-pointer hover:bg-neutral-50');
  if (q.type === 'multiple_choice' || q.type === 'true_false') return (
    <div role="radiogroup" aria-label="Answer choices" className="space-y-2">{q.options.map((o) => (
      <label key={o.id} className={card}><input type="radio" name={q.questionId} disabled={disabled} className="mt-0.5 size-4 accent-brand-600" checked={value === o.id} onChange={() => onChange(o.id)} /><span>{o.text}</span></label>))}</div>);
  if (q.type === 'multiple_select') { const sel = Array.isArray(value) ? value : []; return (
    <fieldset className="space-y-2"><legend className="mb-2 text-xs text-neutral-500">Select all that apply.</legend>{q.options.map((o) => (
      <label key={o.id} className={card}><input type="checkbox" disabled={disabled} className="mt-0.5 size-4 accent-brand-600" checked={sel.includes(o.id)} onChange={(e) => onChange(e.target.checked ? [...sel, o.id] : sel.filter((x) => x !== o.id))} /><span>{o.text}</span></label>))}</fieldset>); }
  if (q.type === 'short_answer') return <input type="text" aria-label="Your answer" maxLength={500} autoComplete="off" readOnly={disabled} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} placeholder="Type your answer" className="h-10 w-full max-w-md rounded-md border border-neutral-300 px-3 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600 read-only:bg-neutral-50" />;
  const text = typeof value === 'string' ? value : '';
  return (<div><textarea aria-label="Your answer" rows={9} maxLength={20000} readOnly={disabled} value={text} onChange={(e) => onChange(e.target.value)} placeholder="Write your answer here" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm leading-relaxed focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600 read-only:bg-neutral-50" /><p className="tabular mt-1 text-right text-xs text-neutral-500">{text.length.toLocaleString()} characters</p></div>);
}
