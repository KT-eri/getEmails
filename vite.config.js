import { defineConfig } from 'vite';

const GAS_PATH = '/api/submit';
const GAS_EXEC = '/macros/s/AKfycbzFX1YGARu6YRtDGHlZLWV5O0fgM5cX3e9rdtG4UvkyWqSVK0uYwsI1Zaj_kX50Y9-9GA/exec';

export default defineConfig({
  server: {
    proxy: {
      [GAS_PATH]: {
        target: 'https://script.google.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/submit$/, GAS_EXEC),
      },
    },
  },
});
