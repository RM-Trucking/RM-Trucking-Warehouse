import { Suspense, lazy } from 'react';
// components
import LoadingScreen from '../components/loading-screen';

// ----------------------------------------------------------------------

const Loadable = (Component) => (props) =>
  (
    <Suspense fallback={<LoadingScreen />}>
      <Component {...props} />
    </Suspense>
  );

// ----------------------------------------------------------------------

// AUTH
export const LoginPage = Loadable(lazy(() => import('../pages/auth/LoginPage')));

// Dashboard Page
export const DashboardPage = Loadable(lazy(() => import('../pages/dashboard/DashboardPage')));
export const DriverCheckInPage = Loadable(lazy(() => import('../pages/driver-check-in/DriverCheckInPage')));
export const WarehouseCheckInPage = Loadable(lazy(() => import('../pages/warehouse-check-in/WarehouseCheckInPage')));
export const TrailerCheckInPage = Loadable(lazy(() => import('../pages/warehouse-check-in/TrailerCheckInPage')));
export const EnRoutePage = Loadable(lazy(() => import('../pages/en-route/EnRoutePage')));
export const IdVerificationFormPage = Loadable(lazy(() => import('../pages/IdVerificationForm/IdVerificationFormPage')));
export const IdVerificationViewPage = Loadable(lazy(() => import('../pages/IdVerificationForm/IdVerificationView')));
export const WarehouseReceiptFormPage = Loadable(lazy(() => import('../pages/warehouse-check-in/WarehouseReceiptFormPage')));
export const ShipmentFormPage = Loadable(lazy(() => import('../pages/shipment/ShipmentFormPage')));


// Error pages
export const Page500 = Loadable(lazy(() => import('../pages/Page500')));
export const Page403 = Loadable(lazy(() => import('../pages/Page403')));
export const Page404 = Loadable(lazy(() => import('../pages/Page404')));