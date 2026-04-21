import axios from 'axios';
// config
import { HOST_API_KEY } from '../config';
import { setSession } from '../auth/utils';
import { PATH_AUTH } from '../routes/paths';
 
// ----------------------------------------------------------------------

// A navigate function reference that React Router sets on app boot.
// Using this avoids window.location.href (which causes a full page reload).
let navigateFn = null;
export const setNavigator = (fn) => { navigateFn = fn; };
const softRedirect = (path) => {
  if (navigateFn) {
    navigateFn(path, { replace: true });
  } else {
    // Fallback: only used if React hasn't mounted yet
    window.location.replace(path);
  }
};

// ----------------------------------------------------------------------
 
const axiosInstance = axios.create({ baseURL: HOST_API_KEY });
 
// Request Interceptor to attach the header
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token && token !== 'undefined' && token !== 'null') {
      // Ensure there is exactly ONE space between 'Bearer' and the token
      config.headers.Authorization = `Bearer ${token.trim()}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
 
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
 
    // const originalRequest = error.config;
    // // 2. CHECK FOR 401 AND RETRY FLAG
    // if (error.response?.status === 401 && !originalRequest._retry) {
    //   originalRequest._retry = true;
 
    //   try {
    //     const refreshToken = localStorage.getItem('refreshToken');
 
    //     // 3. CALL REFRESH (Use base 'axios' to avoid interceptor loops)
    //     const response = await axios.post(`${HOST_API_KEY}/maintenance/auth/refresh`, {
    //       refreshToken
    //     });
 
    //     const { accessToken, refreshToken: newRefreshToken } = response.data.data;
 
    //     // 4. CRITICAL: Update storage and restart timers
    //     setSession(accessToken, newRefreshToken);
 
    //     // 5. RETRY ORIGINAL REQUEST
    //     originalRequest.headers.Authorization = `Bearer ${accessToken}`;
    //     return axiosInstance(originalRequest);
 
    //   } catch (refreshError) {
    //     // 6. HARD FAIL: Clear everything and force login
    //     setSession(null);
    //     softRedirect(PATH_AUTH.login);
    //     return Promise.reject(refreshError);
    //   }
    // }
 
    // for invalid token
    if (error.response?.data?.error === 'Invalid or expired token' || error.response?.status === 403 || error.response?.status === 401) {
      // Clear tokens from localStorage via your utility
      setSession(null);
      // Soft navigation — no full page reload
      if (!window.location.pathname.includes(PATH_AUTH.login)) {
        softRedirect(PATH_AUTH.login);
      }
    }
    return Promise.reject((error.response && error.response.data) || 'Something went wrong');
  }
);
 
export default axiosInstance;

