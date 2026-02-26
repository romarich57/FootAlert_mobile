import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@app-core': path.resolve(__dirname, '../packages/app-core/src'),
      '@api-contract': path.resolve(__dirname, '../packages/api-contract/generated'),
    },
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
});
