import { closestCenter, DndContext, DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { answerSummary, QuestionDraft, TYPE_LABEL } from './types';

interface Props { questions: QuestionDraft[]; onChange: (next: QuestionDraft[]) => void; onEdit: (q: QuestionDraft) => void; readOnly?: boolean }

/** The questions of one exam/assignment: drag to reorder, edit in a dialog, set points inline, remove. */
export function QuestionList({ questions, onChange, onEdit, readOnly }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    onChange(arrayMove(questions, questions.findIndex((x) => x.key === e.active.id), questions.findIndex((x) => x.key === e.over!.id)));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={questions.map((x) => x.key)} strategy={verticalListSortingStrategy}>
        <ol className="divide-y divide-neutral-100">{questions.map((q, i) => (
          <Row key={q.key} q={q} index={i} readOnly={!!readOnly} onEdit={() => onEdit(q)}
            onPoints={(p) => onChange(questions.map((y) => (y.key === q.key ? { ...y, points: p } : y)))} onRemove={() => onChange(questions.filter((y) => y.key !== q.key))} />
        ))}</ol>
      </SortableContext>
    </DndContext>
  );
}

function Row({ q, index, readOnly, onEdit, onPoints, onRemove }: { q: QuestionDraft; index: number; readOnly: boolean; onEdit: () => void; onPoints: (p: number) => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: q.key, disabled: readOnly });
  const answer = answerSummary(q);
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`flex items-start gap-2 bg-white px-3 py-3 ${isDragging ? 'relative z-10 border border-brand-300 opacity-90' : ''}`}>
      {readOnly ? <span className="w-6 shrink-0" /> : <button type="button" aria-label={`Reorder question ${index + 1}`} className="mt-0.5 cursor-grab touch-none rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 active:cursor-grabbing" {...attributes} {...listeners}><GripVertical className="size-4" /></button>}
      <span className="tabular mt-0.5 w-6 shrink-0 text-right text-[13px] text-neutral-500">{index + 1}.</span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm">{q.text}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5"><Badge>{TYPE_LABEL[q.type]}</Badge>{q.topic && <Badge tone="brand">{q.topic}</Badge>}
          {answer && <span className="truncate text-xs text-neutral-500">Answer: {answer}</span>}</div>
      </div>
      {readOnly ? <span className="tabular w-14 shrink-0 text-right text-sm text-neutral-700">{q.points} pt</span> : (
        <label className="flex shrink-0 items-center gap-1 text-xs text-neutral-500"><span className="sr-only">Points for question {index + 1}</span>
          <input type="number" min={0.25} max={100} step={0.25} value={q.points} onChange={(e) => { const n = Number(e.target.value); if (n >= 0.25 && n <= 100) onPoints(n); }}
            className="h-8 w-16 rounded-md border border-neutral-300 px-2 text-right text-sm text-neutral-900 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600" />pt</label>)}
      {!readOnly && <>
        <button type="button" onClick={onEdit} aria-label={`Edit question ${index + 1}`} className="mt-0.5 rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800"><Pencil className="size-4" /></button>
        <button type="button" onClick={onRemove} aria-label={`Remove question ${index + 1}`} className="mt-0.5 rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-red-600"><X className="size-4" /></button></>}
    </li>
  );
}
