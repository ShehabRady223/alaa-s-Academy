import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/States';
import { newKey, QTYPES, QuestionDraft, TYPE_LABEL } from './types';

const schema = z.object({
  type: z.enum(QTYPES as [string, ...string[]]),
  text: z.string().trim().min(1, 'Write the question').max(5000, 'At most 5000 characters'),
  points: z.number({ invalid_type_error: 'Enter points' }).min(0.25, 'At least 0.25').max(100, 'At most 100'),
  topic: z.string().trim().max(80, 'At most 80 characters'),
  explanation: z.string().max(3000, 'At most 3000 characters'),
  image: z.string().trim().max(500),
  options: z.array(z.object({ text: z.string(), isCorrect: z.boolean() })),
  trueFalse: z.enum(['true', 'false']),
  accepted: z.array(z.object({ value: z.string() })),
  caseSensitive: z.boolean(),
}).superRefine((v, ctx) => {
  const bad = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
  if (v.type === 'multiple_choice' || v.type === 'multiple_select') {
    if (v.options.length < 2) bad('options', 'Write at least two answer options');
    if (new Set(v.options.map((o) => o.text.trim().toLowerCase())).size !== v.options.length) bad('options', 'Answer options must be different from each other');
    const n = v.options.filter((o) => o.isCorrect).length;
    if (v.type === 'multiple_choice' && n !== 1) bad('options', 'Mark exactly one option as correct (use the circle on the left)');
    if (v.type === 'multiple_select' && n < 1) bad('options', 'Tick at least one correct option');
  }
  if (v.type === 'short_answer' && !v.accepted.some((a) => a.value.trim())) bad('accepted', 'Add at least one accepted answer');
  if (v.image && !/^https?:\/\//i.test(v.image)) bad('image', 'Use a full web address starting with https://');
});
type Values = z.infer<typeof schema>;

const blank = (): Values => ({ type: 'multiple_choice', text: '', points: 1, topic: '', explanation: '', image: '', options: [0, 1, 2, 3].map(() => ({ text: '', isCorrect: false })), trueFalse: 'true', accepted: [{ value: '' }], caseSensitive: false });
const fromDraft = (d: QuestionDraft): Values => ({
  ...blank(), type: d.type, text: d.text, points: d.points, topic: d.topic ?? '', explanation: d.explanation ?? '', image: d.image ?? '',
  options: d.options?.length ? d.options.map((o) => ({ ...o })) : blank().options, trueFalse: d.correctAnswer === false ? 'false' : 'true',
  accepted: d.acceptedAnswers?.length ? d.acceptedAnswers.map((value) => ({ value })) : [{ value: '' }], caseSensitive: !!d.caseSensitive,
});
function toDraft(v: Values, prev: QuestionDraft | null): QuestionDraft {
  const base: QuestionDraft = {
    key: prev?.key ?? newKey(), ...(prev?.id ? { id: prev.id } : {}), type: v.type as QuestionDraft['type'], text: v.text, points: v.points,
    ...(v.topic && { topic: v.topic }), ...(v.explanation && { explanation: v.explanation }), ...(v.image && { image: v.image }),
  };
  if (v.type === 'multiple_choice' || v.type === 'multiple_select') return { ...base, options: v.options.map((o) => ({ text: o.text.trim(), isCorrect: o.isCorrect })) };
  if (v.type === 'true_false') return { ...base, correctAnswer: v.trueFalse === 'true' };
  if (v.type === 'short_answer') return { ...base, acceptedAnswers: v.accepted.map((a) => a.value.trim()).filter(Boolean), caseSensitive: v.caseSensitive };
  return base;
}

interface Props { open: boolean; draft: QuestionDraft | null; topics: string[]; onClose: () => void; onSave: (d: QuestionDraft) => void }

/** Adds or edits ONE question inside the exam or assignment being built. Nothing is sent to the server until that whole page is saved. */
export function QuestionDialog({ open, draft, ...rest }: Props) {
  return <Modal open={open} onClose={rest.onClose} title={draft ? 'Edit question' : 'Add question'} size="lg"><QuestionForm key={draft?.key ?? 'new'} draft={draft} {...rest} /></Modal>;
}

function QuestionForm({ draft, topics, onClose, onSave }: Omit<Props, 'open'>) {
  const { register, control, handleSubmit, watch, setValue, getValues, formState: { errors, submitCount } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: draft ? fromDraft(draft) : blank() });
  const options = useFieldArray({ control, name: 'options' });
  const accepted = useFieldArray({ control, name: 'accepted' });
  const type = watch('type'); const choice = type === 'multiple_choice' || type === 'multiple_select';
  // react-hook-form files array-level errors under `.root`; reading `.message` directly (the old bug) showed nothing at all.
  const rootMsg = (k: 'options' | 'accepted' | 'image') => { const e = errors[k] as { message?: string; root?: { message?: string } } | undefined; return e?.root?.message ?? e?.message; };

  const markCorrect = (i: number, checked: boolean) => options.fields.forEach((_, j) => {
    if (type === 'multiple_choice') setValue(`options.${j}.isCorrect`, j === i, { shouldDirty: true });
    else if (j === i) setValue(`options.${j}.isCorrect`, checked, { shouldDirty: true });
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault(); e.stopPropagation(); // never a native submit, never bubbles into a surrounding form
    // Teachers rarely fill all four starter rows. Blank answer rows are dropped instead of blocking the save.
    const v = getValues();
    if (v.type === 'multiple_choice' || v.type === 'multiple_select') setValue('options', v.options.filter((o) => o.text.trim()));
    if (v.type === 'short_answer') setValue('accepted', v.accepted.filter((a) => a.value.trim()).length ? v.accepted.filter((a) => a.value.trim()) : v.accepted);
    return handleSubmit((vals) => { onSave(toDraft(vals, draft)); onClose(); })(e);
  };
  const failed = submitCount > 0 && Object.keys(errors).length > 0;

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="space-y-4">
      {failed && <Alert>This question isn't complete yet. {rootMsg('options') ?? rootMsg('accepted') ?? 'Check the highlighted fields.'}</Alert>}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Question type" className="sm:col-span-2"><Select {...register('type')}>{QTYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}</Select></Field>
        <Field label="Points" error={errors.points?.message}><Input type="number" step="0.25" min="0.25" invalid={!!errors.points} {...register('points', { valueAsNumber: true })} /></Field>
      </div>
      <Field label="Question" error={errors.text?.message}><Textarea rows={3} autoFocus invalid={!!errors.text} {...register('text')} /></Field>

      {choice && (
        <fieldset>
          <legend className="mb-1 text-[13px] font-medium text-neutral-700">Answer options <span className="font-normal text-neutral-500">({type === 'multiple_choice' ? 'mark the one correct answer' : 'tick every correct answer'})</span></legend>
          <div className="space-y-2">{options.fields.map((f, i) => (
            <div key={f.id} className="flex items-center gap-2">
              <input type={type === 'multiple_choice' ? 'radio' : 'checkbox'} name="correct" aria-label={`Option ${i + 1} is correct`} className="size-4 shrink-0 accent-brand-600" checked={watch(`options.${i}.isCorrect`)} onChange={(e) => markCorrect(i, e.target.checked)} />
              <span className="w-5 text-xs font-medium text-neutral-500">{String.fromCharCode(65 + i)}</span>
              <Input aria-label={`Option ${i + 1} text`} placeholder={`Answer ${String.fromCharCode(65 + i)}`} {...register(`options.${i}.text`)} />
              <button type="button" aria-label={`Remove option ${i + 1}`} disabled={options.fields.length <= 2} onClick={() => options.remove(i)} className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"><X className="size-4" /></button>
            </div>))}</div>
          {rootMsg('options') && <p role="alert" className="mt-1 text-xs text-red-600">{rootMsg('options')}</p>}
          {options.fields.length < 8 && <Button size="sm" className="mt-2" onClick={() => options.append({ text: '', isCorrect: false })}><Plus className="size-3.5" aria-hidden />Add option</Button>}
          <p className="mt-1 text-xs text-neutral-500">Empty rows are ignored.</p>
        </fieldset>
      )}

      {type === 'true_false' && (
        <fieldset><legend className="mb-1 text-[13px] font-medium text-neutral-700">Correct answer</legend>
          <div className="flex gap-5">{(['true', 'false'] as const).map((v) => <label key={v} className="flex items-center gap-2 text-sm"><input type="radio" value={v} className="size-4 accent-brand-600" {...register('trueFalse')} />{v === 'true' ? 'True' : 'False'}</label>)}</div></fieldset>
      )}

      {type === 'short_answer' && (
        <fieldset>
          <legend className="mb-1 text-[13px] font-medium text-neutral-700">Accepted answers <span className="font-normal text-neutral-500">(any one of these is marked correct)</span></legend>
          <div className="space-y-2">{accepted.fields.map((f, i) => (
            <div key={f.id} className="flex items-center gap-2">
              <Input aria-label={`Accepted answer ${i + 1}`} {...register(`accepted.${i}.value`)} />
              <button type="button" aria-label={`Remove answer ${i + 1}`} disabled={accepted.fields.length <= 1} onClick={() => accepted.remove(i)} className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"><X className="size-4" /></button>
            </div>))}</div>
          {rootMsg('accepted') && <p role="alert" className="mt-1 text-xs text-red-600">{rootMsg('accepted')}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-4">
            {accepted.fields.length < 10 && <Button size="sm" onClick={() => accepted.append({ value: '' })}><Plus className="size-3.5" aria-hidden />Add answer</Button>}
            <Checkbox label="Match capital letters exactly" {...register('caseSensitive')} /></div>
        </fieldset>
      )}
      {type === 'essay' && <Alert tone="info">Essays are not graded automatically. You score them after the student submits.</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Topic" hint="Optional. Used to group progress reports, e.g. Algebra." error={errors.topic?.message}><Input list="topic-suggestions" invalid={!!errors.topic} {...register('topic')} /></Field>
        <Field label="Image address" hint="Optional. A full web address." error={rootMsg('image')}><Input type="url" placeholder="https://" invalid={!!errors.image} {...register('image')} /></Field>
      </div>
      <datalist id="topic-suggestions">{topics.map((t) => <option key={t} value={t} />)}</datalist>
      <Field label="Explanation" hint="Shown to the student afterwards, when results allow it." error={errors.explanation?.message}><Textarea rows={2} {...register('explanation')} /></Field>

      <div className="sticky -bottom-4 -mx-5 -mb-4 flex justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-5 py-3">
        <Button onClick={onClose}>Cancel</Button><Button type="submit" variant="primary">{draft ? 'Save question' : 'Add question'}</Button>
      </div>
    </form>
  );
}
