export type QType = 'multiple_choice' | 'true_false' | 'multiple_select' | 'short_answer' | 'essay';
export const QTYPES: QType[] = ['multiple_choice', 'true_false', 'multiple_select', 'short_answer', 'essay'];
export const TYPE_LABEL: Record<QType, string> = { multiple_choice: 'Multiple choice', true_false: 'True / False', multiple_select: 'Multiple select', short_answer: 'Short answer', essay: 'Essay' };

/** A question as the server returns it to its teacher (includes the answers). */
export interface QuestionData {
  id: string; type: QType; text: string; options: { id: string; text: string }[]; correctOptionIds: string[]; acceptedAnswers: string[]; caseSensitive: boolean;
  points: number; topic: string | null; explanation: string | null; image: string | null;
}

/** A question while it is being edited: exactly the shape the API accepts (plus a local `key` for React lists). */
export interface QuestionDraft {
  key: string; id?: string; type: QType; text: string; points: number; topic?: string; explanation?: string; image?: string;
  options?: { text: string; isCorrect: boolean }[]; correctAnswer?: boolean; acceptedAnswers?: string[]; caseSensitive?: boolean;
}

let counter = 0;
export const newKey = () => `q${++counter}-${Date.now().toString(36)}`;

export const fromData = (q: QuestionData): QuestionDraft => ({
  key: q.id, id: q.id, type: q.type, text: q.text, points: q.points,
  ...(q.topic ? { topic: q.topic } : {}), ...(q.explanation ? { explanation: q.explanation } : {}), ...(q.image ? { image: q.image } : {}),
  ...(q.type === 'multiple_choice' || q.type === 'multiple_select' ? { options: q.options.map((o) => ({ text: o.text, isCorrect: q.correctOptionIds.includes(o.id) })) } : {}),
  ...(q.type === 'true_false' ? { correctAnswer: q.correctOptionIds[0] === 'true' } : {}),
  ...(q.type === 'short_answer' ? { acceptedAnswers: q.acceptedAnswers, caseSensitive: q.caseSensitive } : {}),
});

/** What is sent to the API: the draft without its local key. */
export const toPayload = ({ key: _key, ...q }: QuestionDraft) => q;

/** One line describing the right answer, so a teacher can scan a list of questions at a glance. */
export function answerSummary(q: QuestionDraft): string {
  switch (q.type) {
    case 'multiple_choice': case 'multiple_select': return (q.options ?? []).filter((o) => o.isCorrect).map((o) => o.text).join(', ');
    case 'true_false': return q.correctAnswer ? 'True' : 'False';
    case 'short_answer': return (q.acceptedAnswers ?? []).join(' / ');
    case 'essay': return 'Graded by you';
  }
}
export const sumPoints = (qs: { points: number }[]) => Math.round(qs.reduce((s, q) => s + q.points, 0) * 100) / 100;
