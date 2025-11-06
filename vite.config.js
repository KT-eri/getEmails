import { defineConfig } from 'vite';

const GAS_PATH = '/api/submit';
const GAS_EXEC = '/macros/s/AKfycbyPmc435I_lXBJPF-A654AlRc56WOunyiCPoMObDpwnuTxbu-tioYOLqITsfOPEjo_s0g/exec';

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
