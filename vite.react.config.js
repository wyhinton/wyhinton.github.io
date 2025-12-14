import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'src/react-art',
  base: '/art/',
  build: {
    outDir: '../../dist/art',
    emptyOutDir: true,
  },
  plugins: [react()],
});
