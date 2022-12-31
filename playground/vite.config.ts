import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { semiTheming } from 'vite-plugin-semi-theming';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), semiTheming({ theme: '@semi-bot/semi-theme-codpoe' })],
});
