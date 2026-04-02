import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file from the current directory
  // Setting the 3rd parameter to '' loads all variables (including PORT)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      host: true,
      // Use the PORT from .env, or default to 5173
      port: parseInt(env.PORT) || 5173,
      strictPort: true, // Optional: forces Vite to fail if port 4000 is taken
    },
  };
});
