import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import glsl from 'vite-plugin-glsl';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), glsl()],
  build: {
    outDir: path.resolve(__dirname, '../themes/folio/source/js'),
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, 'src/index.tsx'),
      name: 'FolioWebGLImages',
      formats: ['iife'],
      fileName: () => 'webgl-images.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        assetFileNames: 'webgl-images.[ext]',
      },
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
});
