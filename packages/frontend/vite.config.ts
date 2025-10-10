import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { viteMockServe } from 'vite-plugin-mock'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const useMock = env.VITE_USE_MOCK !== 'false'
  const proxy = useMock ? undefined : {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true
    }
  }
  return ({
  plugins: [
    vue(),
    // Dev-time API mocks loaded from ./mock
    viteMockServe({
      mockPath: 'mock',
      localEnabled: command === 'serve' && useMock,
      // support ts files and hot reload by default
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000,
    proxy
  }
  })
})
