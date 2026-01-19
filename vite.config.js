import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: 'public',
  server: {
    host: true,
    port: 5174,
    strictPort: true,  // Fail if port is in use (don't pick another)
    cors: true   // Allow cross-origin requests from SceneEditor
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});
