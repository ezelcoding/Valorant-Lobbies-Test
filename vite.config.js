import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/valorant-lobbies/',   // repo adın neyse onu yaz
});
