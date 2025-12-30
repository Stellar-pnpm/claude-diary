import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, '../public'),
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/main.tsx'),
      output: {
        entryFileNames: 'comments-bundle.js',
        format: 'iife',
        inlineDynamicImports: true,
      },
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
})
