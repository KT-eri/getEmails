import { defineConfig } from 'vite';

const GAS_PATH = '/api/submit';
const GAS_EXEC = '/macros/s/AKfycbwJfJQ3Jd4U8CbgzTJcFOSQADWCUA0_SnQjltSxmqhIKVzKTrnVL2BDa1ojh9fSBFXFug/exec';

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
