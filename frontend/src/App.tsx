import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { SourcesUpload } from './pages/SourcesUpload';
import { VideoViewer } from './pages/VideoViewer';
import { AlertQueue } from './pages/AlertQueue';
import { AlertReview } from './pages/AlertReview';
import { Analytics } from './pages/Analytics';
import { SettingsPage } from './pages/Settings';
import { AdminAudit } from './pages/AdminAudit';
import { useAuthStore } from './stores/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactElement; requiredRole?: string }> = ({
  children,
  requiredRole,
}) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="sources" element={<SourcesUpload />} />
            <Route path="cameras" element={<SourcesUpload />} />
            <Route path="jobs/:id" element={<VideoViewer />} />
            <Route path="alerts" element={<AlertQueue />} />
            <Route path="alerts/:id" element={<AlertReview />} />
            <Route path="analytics" element={<Analytics />} />
            <Route
              path="settings"
              element={
                <ProtectedRoute requiredRole="admin">
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminAudit />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
