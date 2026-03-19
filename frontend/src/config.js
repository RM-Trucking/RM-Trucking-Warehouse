// routes
import { PATH_DASHBOARD } from './routes/paths';


const hostkeys = {};

let stage = import.meta.env.VITE_BUILD_STAGE;
if (!stage) {
  if (import.meta.env.VERBOSE === 'true') {
    console.info(`config(): No VITE_BUILD_STAGE env var set; defaulting to 'dev'.`);
  }
  stage = 'dev';
}
if (stage === 'dev') {
  hostkeys.hostApiKey = import.meta.env.VITE_HOST_API_KEY_DEV;
}

// ROOT PATH AFTER LOGIN SUCCESSFUL
export const PATH_AFTER_LOGIN = PATH_DASHBOARD.general.dashboard; // as '/dashboard'

export const HOST_API_KEY = hostkeys?.hostApiKey || ''; // base axios url

// LAYOUT
// ----------------------------------------------------------------------

export const HEADER = {
  H_MOBILE: 60,
  H_MAIN_DESKTOP: 60,
  H_DASHBOARD_DESKTOP: 60,
  H_DASHBOARD_DESKTOP_OFFSET: 60 - 32,
  H_DASHBOARD_DESKTOP_OFFSET_NEW: 60,
};

export const NAV = {
  W_BASE: 265,
  W_DASHBOARD: 280,
  W_DASHBOARD_MINI: 140,
  //
  H_DASHBOARD_ITEM: 48,
  H_DASHBOARD_ITEM_SUB: 36,
  //
  H_DASHBOARD_ITEM_HORIZONTAL: 32,
};

export const ICON = {
  NAV_ITEM: 24,
  NAV_ITEM_HORIZONTAL: 22,
  NAV_ITEM_MINI: 22,
};