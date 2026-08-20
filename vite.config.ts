import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-diagram',
      buildStart() {
        const src = resolve(__dirname, 'public/diagram')
        const dest = resolve(__dirname, 'dist/diagram')
        if (fs.existsSync(src)) {
          fs.cpSync(src, dest, { recursive: true })
        }
      },
      configureServer(server) {
        server.middlewares.use('/diagram', (req, res, next) => {
          // Serve diagram files directly, bypass React Router
          next()
        })
      },
    },
  ],
  resolve: {
    dedupe: ['three'],
  },
  publicDir: 'public',
  server: {
    fs: {
      allow: ['..', 'public'],
    },
  },
})
