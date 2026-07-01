import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  base: process.env.VITE_GITHUB_PAGES === 'true' ? '/mockup-test-alevel-social/' : '/',
  plugins: [react()],
})
