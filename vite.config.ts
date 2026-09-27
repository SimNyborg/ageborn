import { fileURLToPath, URL } from 'node:url';
import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';

/** GitHub Pages serves the game from /ageborn/ (DESIGN B1). The dev server uses /. */
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview === true ? '/ageborn/' : '/',
  plugins: [preact()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173 },
  preview: { port: 4173 },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
}));
