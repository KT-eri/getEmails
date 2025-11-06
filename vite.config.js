import { defineConfig } from 'vite';

const GAS_PATH = '/api/submit';
const GAS_EXEC = '/macros/s/AKfycbx733JKTzz_krgZbXdjIQ7zya4SVNg89Z_H3_0wqK2I2KyJNmurSHGQvGaOqtG8y1VvIg/exec';

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
