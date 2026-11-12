import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AdminLayout } from '@/layouts/AdminLayout';
import { StudentLayout } from '@/layouts/StudentLayout';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { SetPasswordPage } from '@/features/auth/SetPasswordPage';
import { AnalyticsPage } from '@/features/admin/AnalyticsPage';
import { DashboardPage } from '@/features/admin/DashboardPage';
import { SettingsPage } from '@/features/admin/SettingsPage';
import { StudentProfilePage } from '@/features/admin/StudentProfilePage';
import { ResultDetailPage } from '@/features/results/ResultDetailPage';
import { ResultsPage } from '@/features/results/ResultsPage';
import { AssignmentDetailPage } from '@/features/assignments/AssignmentDetailPage';
import { AssignmentFormPage } from '@/features/assignments/AssignmentFormPage';
import { AssignmentsPage } from '@/features/assignments/AssignmentsPage';
import { SubmissionPage } from '@/features/assignments/SubmissionPage';
import { ExamAccessPage } from '@/features/exam-access/ExamAccessPage';
import { PrintPinsPage } from '@/features/exam-access/PrintPinsPage';
import { StudentAssignmentPage } from '@/features/student-home/StudentAssignmentPage';
import { JoinPage } from '@/features/exam-taking/JoinPage';
import { StartExamPage } from '@/features/exam-taking/StartExamPage';
import { ResultPage } from '@/features/exam-taking/ResultPage';
import { RunnerPage } from '@/features/exam-taking/RunnerPage';
import { ExamBuilderPage } from '@/features/exams/ExamBuilderPage';
import { ExamsPage } from '@/features/exams/ExamsPage';
import { StudentHomePage } from '@/features/student-home/StudentHomePage';
import { StudentsPage } from '@/features/students/StudentsPage';
import { ErrorPage, NotFoundPage } from '@/pages/ErrorPages';
import { GuestOnly, RequireRole, RoleHome } from './guards';

export const router = createBrowserRouter([
  { path: '/', element: <RoleHome />, errorElement: <ErrorPage /> },
  {
    errorElement: <ErrorPage />,
    children: [
      { element: <GuestOnly />, children: [{ path: '/login', element: <LoginPage /> }, { path: '/forgot-password', element: <ForgotPasswordPage /> }] },
      { path: '/set-password', element: <SetPasswordPage /> }, // reachable signed-in or out
      {
        element: <RequireRole role="admin" />,
        children: [{ path: '/admin/exam-access/print', element: <PrintPinsPage /> }, { element: <AdminLayout />, children: [
          { path: '/admin', element: <DashboardPage /> },
          { path: '/admin/students/:id', element: <StudentProfilePage /> },
          { path: '/admin/results', element: <ResultsPage /> },
          { path: '/admin/results/:id', element: <ResultDetailPage /> },
          { path: '/admin/analytics', element: <AnalyticsPage /> },
          { path: '/admin/settings', element: <SettingsPage /> },
          { path: '/admin/students', element: <StudentsPage /> },
          { path: '/admin/exams', element: <ExamsPage /> },
          { path: '/admin/exams/:id', element: <ExamBuilderPage /> },
          { path: '/admin/exam-access', element: <ExamAccessPage /> },
          { path: '/admin/assignments', element: <AssignmentsPage /> },
          { path: '/admin/assignments/new', element: <AssignmentFormPage /> },
          { path: '/admin/assignments/:id', element: <AssignmentDetailPage /> },
          { path: '/admin/assignments/:id/edit', element: <AssignmentFormPage /> },
          { path: '/admin/assignments/:id/submissions/:sid', element: <SubmissionPage /> },
        ] }],
      },
      {
        element: <RequireRole role="student" />,
        children: [
          { path: '/exam/run/:attemptId', element: <RunnerPage /> }, // focused screen, no site chrome
          { element: <StudentLayout />, children: [
            { path: '/me', element: <StudentHomePage /> },
            { path: '/assignments/:id', element: <StudentAssignmentPage /> },
            { path: '/exam/join', element: <JoinPage /> },
            { path: '/exam/start', element: <StartExamPage /> },
            { path: '/exam/access/:token', element: <Navigate to="/exam/join" replace /> }, // an old printed QR link: ask for the PIN instead
            { path: '/exam/result/:attemptId', element: <ResultPage /> },
          ] },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
