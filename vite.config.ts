import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  // Set environment variables
  process.env = {
    ...process.env,
    NODE_ENV: mode,
    VITE_APP_MODE: mode
  };

  return {
    root: '.',
    publicDir: 'public',
    server: {
      port: 3000,
      open: true
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.VITE_APP_MODE': JSON.stringify(mode)
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: resolve(__dirname, 'index.html')
      }
    },
    // Enable source maps in development for better debugging
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
  };
});
