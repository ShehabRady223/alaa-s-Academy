import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Alert, EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { QuestionDialog } from '@/features/questions/QuestionDialog';
import { QuestionList } from '@/features/questions/QuestionList';
import { fromData, QuestionDraft, sumPoints, toPayload } from '@/features/questions/types';
import { useSingleFlight } from '@/hooks/useSingleFlight';
import { fromLocalInput, toLocalInput } from '@/lib/format';
import { HwDetail, useCreateHw, useHw, useUpdateHw } from './api';
import { StudentPicker } from './StudentPicker';

const schema = z.object({
  title: z.string().trim().min(2, 'Enter a title').max(160), subject: z.string().trim().max(80, 'At most 80 characters'),
  description: z.string().max(2000, 'At most 2000 characters'), instructions: z.string().max(5000, 'At most 5000 characters'),
  dueDate: z.string().refine((v) => !v || new Date(v) > new Date(), 'The due date must be in the future'),
  allowLate: z.boolean(), studentIds: z.array(z.string()).max(200),
});
type Values = z.infer<typeof schema>;
const blank = (): Values => ({ title: '', subject: '', description: '', instructions: '', dueDate: '', allowLate: false, studentIds: [] });
const fromDetail = (a: HwDetail): Values => ({ title: a.title, subject: a.subject, description: a.description ?? '', instructions: a.instructions ?? '', dueDate: toLocalInput(a.dueDate), allowLate: a.allowLate, studentIds: a.students.map((s) => s.id) });
const sig = (qs: QuestionDraft[]) => JSON.stringify(qs.map(toPayload));

/** `/admin/assignments/new` and `/admin/assignments/:id/edit`. Questions are added right here: no exam, no bank. */
export function AssignmentFormPage() {
  const id = useParams().id ?? ''; const q = useHw(id);
  if (id && q.isPending) return <div className="space-y-4"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-64 w-full" /></div>;
  if (id && q.isError) return <Card><ErrorState message={q.error instanceof ApiError ? q.error.message : 'Something went wrong.'} onRetry={() => void q.refetch()} /></Card>;
  return <Form key={id || 'new'} existing={q.data} />;
}

function Form({ existing }: { existing?: HwDetail }) {
  const toast = useToast(); const navigate = useNavigate(); const create = useCreateHw(); const update = useUpdateHw(); const once = useSingleFlight();
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionDraft[]>(() => existing?.questions.map(fromData) ?? []);
  const [dialog, setDialog] = useState<{ open: boolean; draft: QuestionDraft | null }>({ open: false, draft: null });
  const names = useMemo(() => new Map(existing?.students.map((s) => [s.id, s.name]) ?? []), [existing]);
  const baseline = useMemo(() => sig(existing?.questions.map(fromData) ?? []), [existing]);
  const locked = !!existing && existing.submittedCount > 0; // the server refuses question edits once work exists; say so up front
  const { register, handleSubmit, watch, setValue, formState: { errors, isDirty, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: existing ? fromDetail(existing) : blank() });
  const studentIds = watch('studentIds'); const dirty = isDirty || sig(questions) !== baseline;
  const topics = useMemo(() => [...new Set(questions.map((x) => x.topic).filter((t): t is string => !!t))], [questions]);
  useEffect(() => { if (!dirty) return; const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; }; window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h); }, [dirty]);
  const saveQuestion = (d: QuestionDraft) => setQuestions((cur) => (cur.some((x) => x.key === d.key) ? cur.map((x) => (x.key === d.key ? d : x)) : [...cur, d]));

  const save = (publish: boolean) => once(() => handleSubmit(async (v) => {
    setError(null);
    if (!questions.length) return setError('Add at least one question.');
    if (publish && !v.studentIds.length) return setError('Choose at least one student before publishing.');
    const body = { title: v.title, subject: v.subject.trim() || 'General', description: v.description, instructions: v.instructions, dueDate: fromLocalInput(v.dueDate), allowLate: v.allowLate, studentIds: v.studentIds };
    try {
      let go: string;
      if (existing) { await update.mutateAsync({ id: existing.id, body: locked ? body : { ...body, questions: questions.map(toPayload) } }); go = existing.id; }
      else go = (await create.mutateAsync({ ...body, questions: questions.map(toPayload), publish })).id;
      toast.success(existing ? 'Assignment saved' : publish ? 'Assignment published' : 'Draft saved');
      navigate(`/admin/assignments/${go}`);
    } catch (e) { setError(e instanceof ApiError ? (e.details?.map((d) => d.message).join('. ') || e.message) : 'Something went wrong.'); }
  })());

  return (
    <>
    <form noValidate onSubmit={(e) => e.preventDefault()}>
      <Link to={existing ? `/admin/assignments/${existing.id}` : '/admin/assignments'} className="mb-3 inline-flex items-center gap-1 text-[13px] text-neutral-600 hover:text-neutral-900"><ArrowLeft className="size-3.5" aria-hidden />{existing ? 'Back to assignment' : 'All assignments'}</Link>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{existing ? 'Edit assignment' : 'New assignment'}</h1>
        <div className="flex gap-2">
          {existing ? <Button variant="primary" loading={isSubmitting} onClick={() => void save(existing.status === 'published')}>Save changes</Button> : <>
            <Button loading={isSubmitting} onClick={() => void save(false)}>Save draft</Button><Button variant="primary" loading={isSubmitting} onClick={() => void save(true)}>Publish</Button></>}
        </div>
      </div>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {locked && <div className="mb-4"><Alert tone="info">Students have already submitted work, so the questions are locked. You can still change the title, wording, due date and recipients.</Alert></div>}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Card><CardHeader title="Details" /><div className="space-y-3 p-4">
            <Field label="Title" error={errors.title?.message}><Input autoFocus invalid={!!errors.title} {...register('title')} /></Field>
            <fieldset disabled={locked}><Field label="Subject" hint="Optional. Groups this assignment in progress reports, e.g. Mathematics." error={errors.subject?.message}><Input placeholder="General" invalid={!!errors.subject} {...register('subject')} /></Field></fieldset>
            <Field label="Description" hint="A short summary students see in their list." error={errors.description?.message}><Textarea rows={2} {...register('description')} /></Field>
            <Field label="Instructions" error={errors.instructions?.message}><Textarea rows={4} {...register('instructions')} /></Field></div></Card>
          <Card><CardHeader title={`Questions (${questions.length})`} description={`${sumPoints(questions)} points in total`}
            action={<Button size="sm" variant="primary" disabled={locked} onClick={() => setDialog({ open: true, draft: null })}><Plus className="size-3.5" aria-hidden />Add question</Button>} />
            {questions.length === 0 ? <EmptyState title="No questions yet" description="Add the first question right here. Multiple choice, true/false, short answer and essay are all supported." action={<Button variant="primary" onClick={() => setDialog({ open: true, draft: null })}>Add question</Button>} />
              : <QuestionList questions={questions} onChange={setQuestions} onEdit={(d) => setDialog({ open: true, draft: d })} readOnly={locked} />}</Card>
        </div>
        <div className="space-y-5">
          <Card><CardHeader title="Due date" /><div className="space-y-3 p-4">
            <Field label="Due" hint="Optional. Leave empty for no deadline." error={errors.dueDate?.message}><Input type="datetime-local" invalid={!!errors.dueDate} {...register('dueDate')} /></Field>
            <Checkbox label="Accept late work" hint="Late submissions are marked as late." {...register('allowLate')} /></div></Card>
          <Card><CardHeader title="Send to" description="Your students only" /><div className="p-4">
            <StudentPicker value={studentIds} names={names} onChange={(ids) => setValue('studentIds', ids, { shouldDirty: true })} /></div></Card>
        </div>
      </div>
    </form>
    {/* Outside the page <form>: a <form> inside a <form> makes the browser submit natively and reload the page. */}
    <QuestionDialog open={dialog.open} draft={dialog.draft} topics={topics} onClose={() => setDialog({ open: false, draft: null })} onSave={saveQuestion} />
    </>
  );
}
