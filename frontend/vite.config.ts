import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_')
  const backend = env.VITE_API_BASE_URL || 'https://localhost:44398'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': { target: backend, secure: false },
        '/health': { target: backend, secure: false },
        '/mcp': { target: backend, secure: false },
        '/hubs': {
          target: backend,
          ws: true,
          secure: false,
        },
      },
    },
  }
})
