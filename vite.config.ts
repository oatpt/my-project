import { webcrypto } from 'crypto';

if (!globalThis.crypto || !globalThis.crypto.getRandomValues) {
  // ใช้ type-casting เพื่อบอก TypeScript ว่าเราอนุญาตให้แก้ไข globalThis ได้
  (globalThis as any).crypto = webcrypto;
}

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  }
});
