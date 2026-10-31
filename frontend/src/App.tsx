import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { CamerasMatrix } from './pages/CamerasMatrix';
import { UploadFootage } from './pages/UploadFootage';
import { CollegeAdminPortal } from './pages/CollegeAdminPortal';
import { OwnerPortal } from './pages/OwnerPortal';
import { SecurityRoomPortal } from './pages/SecurityRoomPortal';
import { VideoViewer } from './pages/VideoViewer';
import { AlertQueue } from './pages/AlertQueue';
import { AlertReview } from './pages/AlertReview';
import { Analytics } from './pages/Analytics';
import { Reports } from './pages/Reports';
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

const ProtectedRoute: React.FC<{ children: React.ReactElement; requiredRole?: string | string[] }> = ({
  children,
  requiredRole,
}) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (user?.role && !allowed.includes(user.role)) {
      return <Navigate to="/" replace />;
    }
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
            <Route path="cameras" element={<CamerasMatrix />} />
            <Route path="sources" element={<CamerasMatrix />} />
            <Route path="upload" element={<UploadFootage />} />
            <Route
              path="college-admin"
              element={
                <ProtectedRoute requiredRole={['admin', 'owner']}>
                  <CollegeAdminPortal />
                </ProtectedRoute>
              }
            />
            <Route
              path="owner"
              element={
                <ProtectedRoute requiredRole={['owner', 'admin']}>
                  <OwnerPortal />
                </ProtectedRoute>
              }
            />
            <Route
              path="security-room-1"
              element={
                <ProtectedRoute requiredRole={['security_room', 'operator', 'admin', 'owner']}>
                  <SecurityRoomPortal />
                </ProtectedRoute>
              }
            />
            <Route path="jobs/:id" element={<VideoViewer />} />
            <Route path="alerts" element={<AlertQueue />} />
            <Route path="alerts/:id" element={<AlertReview />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="reports" element={<Reports />} />
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
