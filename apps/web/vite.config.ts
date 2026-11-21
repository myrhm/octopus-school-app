import { defineConfig } from 'vitest/config';
import { loadEnv, type Plugin } from 'vite';
import { participant } from './api/participant';
import solid from 'vite-plugin-solid';
import tailwindcss from '@tailwindcss/vite';

function participantApi(): Plugin {
  const install = (server: import('vite').ViteDevServer | import('vite').PreviewServer) => {
    const env = loadEnv(server.config.mode, server.config.envDir, 'VITE_');
    server.middlewares.use('/api/participant', (req, res) => {
      void participant(req, res, {
        endpoint: env.VITE_APPWRITE_ENDPOINT ?? '',
        project: env.VITE_APPWRITE_PROJECT_ID ?? '',
        secure: false,
      });
    });
  };
  return {
    name: 'octopus-participant-api',
    configureServer: install,
    configurePreviewServer: install,
  };
}

export default defineConfig({
  plugins: [tailwindcss(), solid(), participantApi()],
  server: { port: 5173, strictPort: true },
  preview: { port: 5174, strictPort: true },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
});
