import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "./shared/layout/AppLayout";
import { AuthCallback } from "./features/auth/AuthCallback";
import { LoginPage } from "./features/auth/LoginPage";
import { ResetPasswordPage } from "./features/auth/ResetPasswordPage";
import { UpdatePasswordPage } from "./features/auth/UpdatePasswordPage";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { NotesPage } from "./features/notes/NotesPage";
import { NoteDetailPage } from "./features/notes/NoteDetailPage";
import { FilesPage } from "./features/files/FilesPage";
import { KnowledgeGraphPage } from "./features/knowledge/KnowledgeGraphPage";
import { KnowledgeInsightsPage } from "./features/semantic/KnowledgeInsightsPage";
import { ProfilePage } from "./features/profile/ProfilePage";
import { SharedNotePage } from "./features/sharing/SharedNotePage";
import { ErrorBoundary } from "./shared/components/ErrorBoundary";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  { path: "/update-password", element: <UpdatePasswordPage /> },
  { path: "/auth/callback", element: <AuthCallback /> },
  { path: "/share/:token", element: <SharedNotePage /> },
  {
    element: <ProtectedRoute />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/notes", element: <NotesPage /> },
          { path: "/notes/:noteId", element: <NoteDetailPage /> },
          { path: "/knowledge", element: <KnowledgeGraphPage /> },
          { path: "/insights", element: <KnowledgeInsightsPage /> },
          { path: "/files", element: <FilesPage /> },
          { path: "/profile", element: <ProfilePage /> }
        ]
      }
    ]
  }
]);
