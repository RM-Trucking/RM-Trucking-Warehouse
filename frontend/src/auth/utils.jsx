// // routes
import { PATH_AUTH } from '../routes/paths';
// // utils
import axios from '../utils/axios';

// // ----------------------------------------------------------------------

function jwtDecode(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    window
      .atob(base64)
      .split('')
      .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
      .join('')
  );

  return JSON.parse(jsonPayload);
}

// // ----------------------------------------------------------------------

export const isValidToken = (accessToken) => {
  if (!accessToken) {
    return false;
  }

  const decoded = jwtDecode(accessToken);
  console.log("decoded token:", decoded);

  const currentTime = Date.now() / 1000;

  return decoded.exp > currentTime;
};

// // ----------------------------------------------------------------------


// // export const tokenExpired = (exp) => {
// //   // eslint-disable-next-line prefer-const
// //   let expiredTimer;

// //   const currentTime = Date.now() / 1000; // Convert to seconds

// //   // Calculate the time left until the token expires (24 hours)
// //   const timeLeft = exp - currentTime - 86400; // 86400 seconds = 24 hours

// //   clearTimeout(expiredTimer);

// //   expiredTimer = setTimeout(() => {
// //     alert('Token expired');

// //     localStorage.removeItem('accessToken');

// //     window.location.href = PATH_AUTH.login;
// //   }, timeLeft * 1000); // Convert timeLeft back to milliseconds
// // };


// export const tokenExpired = (exp) => {
//   // eslint-disable-next-line prefer-const
//   let expiredTimer;

//   const currentTime = Date.now();

//   // Test token expires after 10s
//   // const timeLeft = currentTime + 10000 - currentTime; // ~10s
//   const timeLeft = exp * 1000 - currentTime;

//   clearTimeout(expiredTimer);

//   expiredTimer = setTimeout(() => {
//     alert('Token expired');

//     localStorage.removeItem('accessToken');

//     window.location.href = PATH_AUTH.login;
//   }, timeLeft);
// };

// // ----------------------------------------------------------------------

// export const setSession = (accessToken) => {
//   if (accessToken) {
//     localStorage.setItem('accessToken', accessToken);

//     axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

//     // This function below will handle when token is expired
//     const { exp } = jwtDecode(accessToken); // ~3 days by minimals server
//     tokenExpired(exp);
//   } else {
//     localStorage.removeItem('accessToken');

//     delete axios.defaults.headers.common.Authorization;
//   }
// };

// ----------------------------------------------------------------------

// utils.jsx
export const setSession = (accessToken, refreshToken) => {
  if (accessToken) {
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    
    // Set global axios header
    axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

    // Start proactive timer (as discussed before)
    const { exp } = jwtDecode(accessToken);
    handleTokenRefresh(exp); 
  } else {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    delete axios.defaults.headers.common.Authorization;
  }
};


// ----------------------------------------------------------------------

export const handleTokenRefresh = (exp) => {
  let expiredTimer;

  const currentTime = Date.now();
  const timeLeft = exp * 1000 - currentTime;

  // We clear any existing timer to prevent multiple loops
  clearTimeout(expiredTimer);

  // Strategy: Trigger refresh 1 minute BEFORE the token actually expires
  // If the token lasts less than a minute, trigger at 5 seconds before
  const bufferTime = timeLeft > 60000 ? 60000 : 5000;

  expiredTimer = setTimeout(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (refreshToken) {
        // Request a new token from your API
        const response = await axios.post('/maintenance/auth/refresh', { refreshToken });
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data;

        // Reset session with new tokens
        setSession(newAccessToken, newRefreshToken);
      } else {
        throw new Error('No refresh token available');
      }
    } catch (error) {
      console.error('Unable to refresh token', error);
      // If refresh fails, force logout
      setSession(null);
      window.location.href = PATH_AUTH.login;
    }
  }, timeLeft - bufferTime);
};
