import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { tempo } from 'tempo-devtools/dist/vite';

const conditionalPlugins = [];
if (process.env.TEMPO) {
  conditionalPlugins.push('tempo-devtools/dist/babel-plugin');
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [...conditionalPlugins]
      }
    }),
    tempo()
  ],
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
  },
  server: {
    // @ts-ignore
    allowedHosts: process.env.TEMPO === "true" ? true : undefined
  }
});