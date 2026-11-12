import type { QType } from '@/features/questions/types';

export type Response = string | string[] | null;
export interface RunnerQuestion { questionId: string; type: QType; text: string; options: { id: string; text: string }[]; points: number; image: string | null }
export interface RunnerData {
  attemptId: string; examTitle: string; durationMinutes: number | null; startedAt: string; deadline: string | null; serverNow: string;
  questions: RunnerQuestion[]; answers: Record<string, Response>;
}
export interface AccessInfo {
  exam: { title: string; description: string | null; instructions: string | null; durationMinutes: number | null; passingScore: number; questionCount: number; totalPoints: number };
  attemptsUsed: number; maxAttempts: number; inProgressAttemptId: string | null; canStart: boolean; reason: string | null; lastAttemptId: string | null;
}
export interface ResultQuestion {
  questionId: string; type: QType; text: string; image: string | null; options: { id: string; text: string }[]; response: Response;
  isCorrect: boolean | null; pointsAwarded: number; maxPoints: number; feedback: string | null;
  correctOptionIds?: string[]; acceptedAnswers?: string[]; explanation?: string | null;
}
export type ResultPayload = { released: false; message: string } | {
  released: true; score: number; maxScore: number; percentage: number; passed: boolean; passingScore: number; timeTakenSec: number | null; submittedAt: string; questions: ResultQuestion[];
};
export const hasAnswer = (r: Response | undefined) => (Array.isArray(r) ? r.length > 0 : !!r && r.trim() !== '');
