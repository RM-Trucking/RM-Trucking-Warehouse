// ----------------------------------------------------------------------

function path(root, sublink) {
  return `${root}${sublink}`;
}

const ROOTS_AUTH = '/auth';
const ROOTS_DASHBOARD = '/app';

// ----------------------------------------------------------------------

export const PATH_AUTH = {
  root: ROOTS_AUTH,
  login: path(ROOTS_AUTH, '/login'),
  logout: path(ROOTS_AUTH, '/logout'),
  register: path(ROOTS_AUTH, '/register'),
  loginUnprotected: path(ROOTS_AUTH, '/login-unprotected'),
  registerUnprotected: path(ROOTS_AUTH, '/register-unprotected'),
  verify: path(ROOTS_AUTH, '/verify'),
  resetPassword: path(ROOTS_AUTH, '/reset-password'),
  changePassword: path(ROOTS_AUTH, '/change-password'),
  newPassword: path(ROOTS_AUTH, '/new-password'),
  createNewPassword: path(ROOTS_AUTH, '/create-new-password'),
  successMessage: path(ROOTS_AUTH, '/success-message'),
};

export const PATH_PAGE = {
  comingSoon: '/coming-soon',
  maintenance: '/maintenance',
  page403: '/403',
  page404: '/404',
  page500: '/500',
};

export const PATH_DASHBOARD = {
  root: ROOTS_DASHBOARD,
  general: {
    home: path(ROOTS_DASHBOARD, '/home'),
  },
  driverCheckIn: path(ROOTS_DASHBOARD, '/driver-check-in'),
  warehouseCheckIn: path(ROOTS_DASHBOARD, '/warehouse-check-in'),
  warehouseCheckInRegular: path(ROOTS_DASHBOARD, '/warehouse-check-in/regular'),
  warehouseCheckInTrailer: path(ROOTS_DASHBOARD, '/warehouse-check-in/trailer'),
  enRoute: path(ROOTS_DASHBOARD, '/en-route'),
  idVerificationForm: path(ROOTS_DASHBOARD, '/id-verification-form'),
  warehouseReceiptForm: path(ROOTS_DASHBOARD, '/warehouse-receipt-form'),
  shipmentBuilding: path(ROOTS_DASHBOARD, '/shipment-form'),
};

