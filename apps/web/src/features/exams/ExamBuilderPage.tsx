import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Check, Eye, Plus, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { ApiError } from '@/api/client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/Modal';
import { Alert, EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { QuestionDialog } from '@/features/questions/QuestionDialog';
import { QuestionList } from '@/features/questions/QuestionList';
import { fromData, QuestionDraft, sumPoints, toPayload } from '@/features/questions/types';
import { useSingleFlight } from '@/hooks/useSingleFlight';
import { fromLocalInput, toLocalInput } from '@/lib/format';
import { EXAM_STATUS, ExamDetail, useCreateExam, useDuplicateExam, useExam, usePublishExam, useUpdateExam } from './api';
import { ExamPreview } from './ExamPreview';

const num = (m: string) => z.number({ invalid_type_error: m });
const schema = z.object({
  title: z.string().trim().min(2, 'Enter a title').max(160), subject: z.string().trim().max(80, 'At most 80 characters'), description: z.string().max(2000), instructions: z.string().max(5000),
  timed: z.boolean(), durationMinutes: num('Enter minutes'), passingScore: num('Enter a number').min(0, 'At least 0').max(100, 'At most 100'),
  maxAttempts: num('Enter a number').int('Whole number').min(1, 'At least 1').max(10, 'At most 10'),
  startDate: z.string(), expiresAt: z.string(),
  shuffleQuestions: z.boolean(), shuffleOptions: z.boolean(), showCorrectAnswers: z.boolean(), resultRelease: z.enum(['instant', 'manual']),
}).superRefine((v, ctx) => {
  if (v.timed && !(Number.isInteger(v.durationMinutes) && v.durationMinutes >= 1 && v.durationMinutes <= 600)) ctx.addIssue({ code: 'custom', path: ['durationMinutes'], message: '1 to 600 minutes' });
  if (v.startDate && v.expiresAt && new Date(v.expiresAt) <= new Date(v.startDate)) ctx.addIssue({ code: 'custom', path: ['expiresAt'], message: 'Must be after the start' });
});
type Values = z.infer<typeof schema>;
const toValues = (e: ExamDetail): Values => ({
  title: e.title, subject: e.subject, description: e.description ?? '', instructions: e.instructions ?? '', timed: e.durationMinutes != null, durationMinutes: e.durationMinutes ?? 30,
  passingScore: e.passingScore, maxAttempts: e.maxAttempts, startDate: toLocalInput(e.startDate), expiresAt: toLocalInput(e.expiresAt),
  shuffleQuestions: e.settings.shuffleQuestions, shuffleOptions: e.settings.shuffleOptions, showCorrectAnswers: e.settings.showCorrectAnswers, resultRelease: e.settings.resultRelease,
});
const sig = (qs: QuestionDraft[]) => JSON.stringify(qs.map(toPayload));

/** A blank, unsaved draft: `/admin/exams/new` opens the real builder directly. The exam is created on the first save. */
const BLANK: ExamDetail = {
  id: '', title: '', subject: '', description: null, instructions: null, status: 'draft', effectiveStatus: 'draft', durationMinutes: 30, passingScore: 50, maxAttempts: 1,
  startDate: null, expiresAt: null, settings: { shuffleQuestions: false, shuffleOptions: false, resultRelease: 'instant', showCorrectAnswers: true },
  questionCount: 0, totalPoints: 0, publishedAt: null, createdAt: '', updatedAt: '', questions: [],
};

export function ExamBuilderPage() {
  const id = useParams().id as string;
  const isNew = id === 'new';
  const q = useExam(isNew ? '' : id);
  if (isNew) return <Builder key="new" exam={BLANK} />;
  if (q.isPending) return <div className="space-y-4"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-64 w-full" /></div>;
  if (q.isError) return <Card><ErrorState message={q.error instanceof ApiError ? q.error.message : 'Something went wrong.'} onRetry={() => void q.refetch()} /></Card>;
  return <Builder key={q.data.id} exam={q.data} />;
}

function Builder({ exam }: { exam: ExamDetail }) {
  const toast = useToast(); const navigate = useNavigate();
  const isDraft = exam.status === 'draft'; const archived = exam.status === 'archived'; const isNew = !exam.id;
  const [questions, setQuestions] = useState<QuestionDraft[]>(() => exam.questions.map(fromData));
  const [dialog, setDialog] = useState<{ open: boolean; draft: QuestionDraft | null }>({ open: false, draft: null });
  const [previewOpen, setPreviewOpen] = useState(false); const [confirmPublish, setConfirmPublish] = useState(false);
  const update = useUpdateExam(); const create = useCreateExam(); const publish = usePublishExam(); const duplicate = useDuplicateExam();
  const { register, handleSubmit, reset, watch, trigger, getValues, formState: { errors, isDirty } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(exam) });

  // Re-sync from the server only when it really holds a newer version (a save), never on a background refetch of identical data.
  const syncedAt = useRef(exam.updatedAt);
  useEffect(() => { if (syncedAt.current === exam.updatedAt) return; syncedAt.current = exam.updatedAt; reset(toValues(exam)); setQuestions(exam.questions.map(fromData)); }, [exam, reset]);
  const baseline = useMemo(() => sig(exam.questions.map(fromData)), [exam]);
  const questionsDirty = isDraft && sig(questions) !== baseline;
  const dirty = isDirty || questionsDirty;
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const timed = watch('timed'); const expiresAt = watch('expiresAt');
  const total = useMemo(() => sumPoints(questions), [questions]);
  const topics = useMemo(() => [...new Set(questions.map((x) => x.topic).filter((t): t is string => !!t))], [questions]);
  const msg = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong.');

  const saveOnce = useSingleFlight(); const publishOnce = useSingleFlight();
  const saveAll = (): Promise<boolean> => saveOnce(saveAllImpl).then((r) => r ?? false);
  const saveAllImpl = async (): Promise<boolean> => {
    if (!(await trigger())) { toast.error('Some fields need attention'); return false; }
    const v = getValues();
    const common = { title: v.title, description: v.description, instructions: v.instructions, startDate: fromLocalInput(v.startDate), expiresAt: fromLocalInput(v.expiresAt) };
    // ONE request carries the settings and the questions: either everything is saved or nothing is, and the editor gets exactly one new server version.
    const full = { ...common, subject: v.subject.trim() || 'General', durationMinutes: v.timed ? v.durationMinutes : null, passingScore: v.passingScore, maxAttempts: v.maxAttempts,
      settings: { shuffleQuestions: v.shuffleQuestions, shuffleOptions: v.shuffleOptions, showCorrectAnswers: v.showCorrectAnswers, resultRelease: v.resultRelease }, questions: questions.map(toPayload) };
    try {
      if (isNew) { const d = await create.mutateAsync(full); navigate(`/admin/exams/${d.id}`, { replace: true }); return true; }
      if (isDirty || questionsDirty) await update.mutateAsync({ id: exam.id, body: isDraft ? full : common });
      return true;
    } catch (e) { toast.error(msg(e)); return false; }
  };

  const checks = [
    { ok: questions.length > 0, label: 'At least one question' },
    { ok: watch('title').trim().length >= 2, label: 'A title' },
    { ok: !expiresAt || new Date(expiresAt) > new Date(), label: 'Expiry date is in the future' },
  ];
  const ready = checks.every((c) => c.ok);
  const doPublish = () => publishOnce(doPublishImpl);
  const doPublishImpl = async () => {
    if (!(await saveAll())) return setConfirmPublish(false);
    publish.mutate(exam.id, { onSuccess: () => { toast.success('Exam published'); setConfirmPublish(false); }, onError: (e) => { toast.error(msg(e)); setConfirmPublish(false); } });
  };
  const busy = update.isPending || create.isPending;
  const saveQuestion = (d: QuestionDraft) => setQuestions((cur) => (cur.some((x) => x.key === d.key) ? cur.map((x) => (x.key === d.key ? d : x)) : [...cur, d]));

  return (
    <>
      <Link to="/admin/exams" className="mb-3 inline-flex items-center gap-1 text-[13px] text-neutral-600 hover:text-neutral-900"><ArrowLeft className="size-3.5" aria-hidden />All exams</Link>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3"><h1 className="truncate text-xl font-semibold">{isNew ? 'New exam' : exam.title}</h1><Badge tone={EXAM_STATUS[exam.effectiveStatus].tone}>{EXAM_STATUS[exam.effectiveStatus].label}</Badge></div>
        <div className="flex flex-wrap items-center gap-2">
          {dirty && <span className="text-xs text-amber-700">Unsaved changes</span>}
          <Button onClick={() => setPreviewOpen(true)}><Eye className="size-4" aria-hidden />Preview</Button>
          {!archived && <Button variant={isNew ? 'primary' : 'secondary'} disabled={!dirty} loading={busy} onClick={() => void saveAll().then((ok) => ok && toast.success(isNew ? 'Exam created' : 'Changes saved'))}>{isNew ? 'Create exam' : 'Save changes'}</Button>}
          {isDraft && !isNew && <Button variant="primary" disabled={!ready} onClick={() => setConfirmPublish(true)}>Publish</Button>}
          {!isDraft && !isNew && <Button loading={duplicate.isPending} onClick={() => duplicate.mutate(exam.id, { onSuccess: (d) => { toast.success('Copy created as a draft'); navigate(`/admin/exams/${d.id}`); }, onError: (e) => toast.error(msg(e)) })}>Duplicate as new draft</Button>}
        </div>
      </div>
      {!isDraft && <div className="mb-4"><Alert tone="info">{archived ? 'This exam is archived and can no longer be changed.' : 'Published exams are locked so results stay comparable. You can still edit the title, wording and dates. To change questions, duration or scoring, duplicate it as a new draft.'}</Alert></div>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <Card>
            <CardHeader title={`Questions (${questions.length})`} description={`${total} points in total`}
              action={isDraft && <Button size="sm" variant="primary" onClick={() => setDialog({ open: true, draft: null })}><Plus className="size-3.5" aria-hidden />Add question</Button>} />
            {questions.length === 0 ? <EmptyState title="No questions yet" description="Add the first question right here. You can reorder them by dragging and set points for each." action={isDraft ? <Button variant="primary" onClick={() => setDialog({ open: true, draft: null })}>Add question</Button> : undefined} />
              : <QuestionList questions={questions} onChange={setQuestions} onEdit={(d) => setDialog({ open: true, draft: d })} readOnly={!isDraft} />}
          </Card>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(() => undefined)} noValidate>
          <Card><CardHeader title="Details" /><fieldset disabled={archived} className="space-y-3 p-4">
            <Field label="Title" error={errors.title?.message}><Input invalid={!!errors.title} {...register('title')} /></Field>
            <fieldset disabled={!isDraft}><Field label="Subject" hint="Optional. Groups this exam in progress reports, e.g. Mathematics." error={errors.subject?.message}><Input placeholder="General" invalid={!!errors.subject} {...register('subject')} /></Field></fieldset>
            <Field label="Description" hint="Shown to the teacher only."><Textarea rows={2} {...register('description')} /></Field>
            <Field label="Instructions for students" hint="Shown before the exam starts."><Textarea rows={4} {...register('instructions')} /></Field>
          </fieldset></Card>

          <Card><CardHeader title="Timing and attempts" /><div className="space-y-3 p-4">
            <fieldset disabled={!isDraft} className="space-y-3">
              <Checkbox label="Time limit" {...register('timed')} />
              {timed && <Field label="Minutes" error={errors.durationMinutes?.message}><Input type="number" min={1} max={600} invalid={!!errors.durationMinutes} {...register('durationMinutes', { valueAsNumber: true })} /></Field>}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Passing score (%)" error={errors.passingScore?.message}><Input type="number" min={0} max={100} invalid={!!errors.passingScore} {...register('passingScore', { valueAsNumber: true })} /></Field>
                <Field label="Attempts allowed" error={errors.maxAttempts?.message}><Input type="number" min={1} max={10} invalid={!!errors.maxAttempts} {...register('maxAttempts', { valueAsNumber: true })} /></Field>
              </div>
            </fieldset>
            <fieldset disabled={archived} className="space-y-3">
              <Field label="Opens" hint="Leave empty to open immediately."><Input type="datetime-local" {...register('startDate')} /></Field>
              <Field label="Closes" hint="Leave empty for no end date." error={errors.expiresAt?.message}><Input type="datetime-local" invalid={!!errors.expiresAt} {...register('expiresAt')} /></Field>
            </fieldset>
          </div></Card>

          <Card><CardHeader title="Student experience" /><fieldset disabled={!isDraft} className="space-y-3 p-4">
            <Checkbox label="Shuffle question order" hint="Each student gets their own order." {...register('shuffleQuestions')} />
            <Checkbox label="Shuffle answer choices" {...register('shuffleOptions')} />
            <Checkbox label="Show correct answers in results" hint="Includes your explanations." {...register('showCorrectAnswers')} />
            <Field label="Show results to students"><Select {...register('resultRelease')}><option value="instant">Right after grading</option><option value="manual">When I release them</option></Select></Field>
          </fieldset></Card>

          {isDraft && !isNew && <Card><CardHeader title="Before publishing" /><ul className="space-y-1.5 p-4">
            {checks.map((c) => <li key={c.label} className={`flex items-center gap-2 text-[13px] ${c.ok ? 'text-green-700' : 'text-neutral-500'}`}>{c.ok ? <Check className="size-3.5" aria-hidden /> : <X className="size-3.5" aria-hidden />}{c.label}</li>)}
          </ul></Card>}
        </form>
      </div>

      <QuestionDialog open={dialog.open} draft={dialog.draft} topics={topics} onClose={() => setDialog({ open: false, draft: null })} onSave={saveQuestion} />
      <ExamPreview open={previewOpen} title={watch('title') || exam.title} instructions={watch('instructions')} durationMinutes={timed ? watch('durationMinutes') : null} questions={questions} onClose={() => setPreviewOpen(false)} />
      <ConfirmDialog open={confirmPublish} title="Publish this exam?" confirmLabel="Publish exam" loading={busy || publish.isPending} onClose={() => setConfirmPublish(false)} onConfirm={() => void doPublish()}
        message="Publishing locks the questions, duration, passing score and attempts. You can still duplicate it to make a new version." />
    </>
  );
}
