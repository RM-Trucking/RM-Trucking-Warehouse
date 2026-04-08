import { Navigate, useRoutes } from 'react-router-dom';
import AuthGuard from '../auth/AuthGuard';
import GuestGuard from '../auth/GuestGuard';
// layouts
import DashboardLayout from '../layouts/dashboard';
import MainLayout from '../layouts/main';
// config
import { PATH_AFTER_LOGIN } from '../config';
//
import {
  // Auth
  LoginPage,
  DashboardPage,
  DriverCheckInPage,
  WarehouseCheckInPage,
  EnRoutePage,
  IdVerificationFormPage,
  WarehouseReceiptFormPage,
  ShipmentFormPage,
  Page500,
  Page403,
  Page404,
} from './elements';
import { PATH_DASHBOARD } from './paths';


// ----------------------------------------------------------------------

export default function Router() {
  return useRoutes([


    // Auth
    {
      path: 'auth',
      children: [
        {
          path: 'login',
          element: (
            <GuestGuard>
              <LoginPage />
            </GuestGuard>
          ),
        },

        {
          path: 'logout',
          element: (
            <GuestGuard>
              <LoginPage />
            </GuestGuard>
          ),
        },
      ],
    },

    // Dashboard
    {
      path: 'app',
      element: (
        <AuthGuard>
          <DashboardLayout />
        </AuthGuard>
      ),
      children: [
        { element: <Navigate to={PATH_AFTER_LOGIN} replace />, index: true },
        { path: 'home', element: <DashboardPage /> },
        { path: 'driver-check-in', element: <DriverCheckInPage /> },
        { path: 'warehouse-check-in', element: <WarehouseCheckInPage /> },
        { path: 'en-route', element: <EnRoutePage /> },
        { path: 'id-verification-form', element: <IdVerificationFormPage /> },
        { path: 'warehouse-receipt-form', element: <WarehouseReceiptFormPage /> },
        { path: 'shipment-form', element: <ShipmentFormPage /> },
      ],
    },
    {
      element: <MainLayout />,
      children: [
        { element: <Navigate to="/auth/login" replace />, index: true },
      ],
    },
    { path: '500', element: <Page500 /> },
    { path: '404', element: <Page404 /> },
    { path: '403', element: <Page403 /> },
    { path: '*', element: <Navigate to="/404" replace /> },
  ]);
}
