import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // GitHub Pages Project Pages 배포: https://jtech-co.github.io/Wplace-Pixel-Blueprint/
  base: '/Wplace-Pixel-Blueprint/',
});
