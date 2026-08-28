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
  TrailerCheckInPage,
  EnRoutePage,
  IdVerificationFormPage,
  IdVerificationViewPage,
  WarehouseRecieptPage,
  WarehouseReceiptFormPage,
  ShipmentFormPage,
  LocationScanPage,
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
        { path: 'warehouse-check-in/regular', element: <WarehouseCheckInPage /> },
        { path: 'warehouse-check-in/trailer', element: <TrailerCheckInPage /> },
        { path: 'en-route', element: <EnRoutePage /> },
        { path: 'id-verification-form', element: <IdVerificationFormPage /> },
        { path: 'id-verification-form/:id', element: <IdVerificationViewPage /> },
        { path: 'warehouse-receipts', element: <WarehouseRecieptPage /> },
        { path: 'warehouse-receipt-form', element: <WarehouseReceiptFormPage /> },
        { path: 'shipment-form', element: <ShipmentFormPage /> },
        { path: 'location-view-update', element: <LocationScanPage /> },
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
