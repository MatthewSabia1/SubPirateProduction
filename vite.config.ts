import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es'
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        analysisWorker: resolve(__dirname, 'src/lib/analysisSharedWorker.ts')
      }
    }
  },
  optimizeDeps: {
    exclude: ['src/lib/analysisSharedWorker.ts']
  }
});