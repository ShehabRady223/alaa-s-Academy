import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/States';
import { QuestionDraft, sumPoints } from '@/features/questions/types';

/** What the student sees: no answers, no explanations. */
export function ExamPreview({ open, title, instructions, durationMinutes, questions, onClose }: { open: boolean; title: string; instructions?: string | null; durationMinutes: number | null; questions: QuestionDraft[]; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Student preview" size="lg">
      <div className="space-y-5">
        <Alert tone="info">This is how the exam looks to a student. Correct answers are never shown to them.</Alert>
        <div><h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-[13px] text-neutral-500">{questions.length} questions · {sumPoints(questions)} points · {durationMinutes ? `${durationMinutes} minutes` : 'No time limit'}</p>
          {instructions && <p className="mt-2 whitespace-pre-line text-sm text-neutral-700">{instructions}</p>}</div>
        {questions.length === 0 && <p className="text-sm text-neutral-500">No questions added yet.</p>}
        <ol className="space-y-6">{questions.map((q, i) => (
          <li key={q.key}>
            <div className="flex items-baseline justify-between gap-3"><p className="text-sm font-medium"><span className="mr-1.5 text-neutral-500">{i + 1}.</span>{q.text}</p><span className="shrink-0 text-xs text-neutral-500">{q.points} pt</span></div>
            {q.image && <img src={q.image} alt="" className="mt-2 max-h-48 rounded-md border border-neutral-200" />}
            <div className="mt-2 space-y-1.5">
              {(q.type === 'multiple_choice' || q.type === 'multiple_select') && (q.options ?? []).map((o) => <label key={o.text} className="flex items-center gap-2 text-sm"><input type={q.type === 'multiple_choice' ? 'radio' : 'checkbox'} disabled className="size-4" />{o.text}</label>)}
              {q.type === 'true_false' && ['True', 'False'].map((t) => <label key={t} className="flex items-center gap-2 text-sm"><input type="radio" disabled className="size-4" />{t}</label>)}
              {q.type === 'multiple_select' && <p className="text-xs text-neutral-500">Select all that apply.</p>}
              {q.type === 'short_answer' && <input disabled placeholder="Type your answer" className="h-9 w-full max-w-sm rounded-md border border-neutral-300 bg-neutral-50 px-3 text-sm" />}
              {q.type === 'essay' && <textarea disabled rows={3} placeholder="Write your answer" className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm" />}
            </div>
          </li>))}</ol>
      </div>
    </Modal>
  );
}
