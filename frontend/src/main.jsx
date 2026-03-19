import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
// for redux store
import { Provider as ReduxProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/lib/integration/react';
import { AuthProvider } from './auth/JwtContext';

import './index.css'
import App from './App.jsx'

// redux
import { store, persistor } from './redux/store';

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    {/* <StrictMode> */}
      <HelmetProvider>
        <ReduxProvider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </PersistGate>
        </ReduxProvider>
      </HelmetProvider>
    {/* </StrictMode> */}
  </AuthProvider>,
)
