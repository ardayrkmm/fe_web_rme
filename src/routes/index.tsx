import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import DashboardLayout from '../layouts/DashboardLayout';
import AuthLayout from '../layouts/AuthLayout';
import Login from '../pages/auth/Login';
import Dashboard from '../pages/Dashboard';
import Patients from '../pages/patients/Patients';
import Physiotherapists from '../pages/physiotherapists/Physiotherapists';
import Appointments from '../pages/appointments/Appointments';
import TherapySessions from '../pages/therapy-sessions/TherapySessions';

import Services from '../pages/services/ServiceMasterList';
import PaymentList from '../pages/payments/PaymentList';
import PaymentForm from '../pages/payments/PaymentForm';
import PaymentDetail from '../pages/payments/PaymentDetail';

import MedicalRecords from '../pages/medical-records/MedicalRecords';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  if (!hasHydrated) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Memuat...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const RoleRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || 'admin';
  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

const router = createBrowserRouter([
  {
    path: '/login',
    element: <AuthLayout />,
    children: [
      { index: true, element: <Login /> },
    ],
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: 'dashboard', element: <RoleRoute allowedRoles={['admin', 'owner', 'fisioterapis']}><Dashboard /></RoleRoute> },
      { path: 'patients', element: <RoleRoute allowedRoles={['admin', 'owner']}><Patients /></RoleRoute> },
      { path: 'physiotherapists', element: <RoleRoute allowedRoles={['admin', 'owner']}><Physiotherapists /></RoleRoute> },
      { path: 'services', element: <RoleRoute allowedRoles={['admin', 'owner']}><Services /></RoleRoute> },
      { path: 'payments', element: <RoleRoute allowedRoles={['admin', 'owner']}><PaymentList /></RoleRoute> },
      { path: 'payments/new', element: <RoleRoute allowedRoles={['admin', 'owner']}><PaymentForm /></RoleRoute> },
      { path: 'payments/:id', element: <RoleRoute allowedRoles={['admin', 'owner']}><PaymentDetail /></RoleRoute> },
      { path: 'payments/:id/edit', element: <RoleRoute allowedRoles={['admin', 'owner']}><PaymentForm /></RoleRoute> },
      { path: 'appointments', element: <RoleRoute allowedRoles={['admin', 'owner']}><Appointments /></RoleRoute> },
      { path: 'medical-records', element: <RoleRoute allowedRoles={['admin', 'owner', 'fisioterapis']}><MedicalRecords /></RoleRoute> },
      { path: 'therapy-sessions', element: <RoleRoute allowedRoles={['admin', 'owner', 'fisioterapis']}><TherapySessions /></RoleRoute> },

      { path: '', element: <Navigate to="/dashboard" replace /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
