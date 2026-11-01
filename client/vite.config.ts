import { copyFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// Vercel serves 404.html with a real 404 status for unknown paths;
// it is the SPA shell, so the app still renders its not-found page.
function spaNotFoundPage(): Plugin {
  let outDir = 'dist'

  return {
    name: 'spa-not-found-page',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    async closeBundle() {
      await copyFile(resolve(outDir, 'index.html'), resolve(outDir, '404.html'))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), spaNotFoundPage()],
})
