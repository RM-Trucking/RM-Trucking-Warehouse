import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import UnsavedChangesProvider from './components/UnsavedChangesProvider';
import { HelmetProvider } from 'react-helmet-async';
// for redux store
import { Provider as ReduxProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/lib/integration/react';
import { AuthProvider } from './auth/JwtContext';

import './index.css'
import App from './App.jsx'

// redux
import { store, persistor } from './redux/store';

const router = createBrowserRouter([
  { path: '*', element: <UnsavedChangesProvider><App /></UnsavedChangesProvider> },
]);

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    {/* <StrictMode> */}
      <HelmetProvider>
        <ReduxProvider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <RouterProvider router={router} />
          </PersistGate>
        </ReduxProvider>
      </HelmetProvider>
    {/* </StrictMode> */}
  </AuthProvider>,
)
