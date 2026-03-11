import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import dotenv from 'dotenv';

dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

const backendUrl = process.env.VITE_API_URL;
const baseUrl = process.env.VITE_BASE_URL;

console.log(baseUrl, backendUrl, process.env.NODE_ENV);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: baseUrl,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
