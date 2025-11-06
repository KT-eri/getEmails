import { defineConfig } from 'vite';

const GAS_PATH = '/api/submit';
const GAS_EXEC = '/macros/s/AKfycbzov5xbpkc2t6eqHALcPOzjng9ZxmLvL2on5m6-xH7Q_a1pam0C-zBAqaI55RvxgHEtbA/exec';

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
