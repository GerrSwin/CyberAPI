import { resolve } from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { visualizer } from 'rollup-plugin-visualizer'

const isAnalyze = process.env.ANALYZE === '1' || process.env.ANALYZE === 'true'
const isCI = process.env.CI === 'true'

export default defineConfig({
  server: {
    port: 3000,
  },

  plugins: [
    vue(),
    vueJsx(),
    isAnalyze
      ? visualizer({
          filename: 'dist/stats.html',
          template: 'treemap',
          gzipSize: false,
          brotliSize: false,
          open: false,
        })
      : undefined,
  ].filter(Boolean),

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
    sourcemap: false,
    reportCompressedSize: !isCI,
    cssCodeSplit: true,

    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/monaco-editor/')) return 'editor'

          if (
            id.includes('node_modules/vue/') ||
            id.includes('node_modules/vue-router/') ||
            id.includes('node_modules/vue-i18n/') ||
            id.includes('node_modules/pinia/')
          ) {
            return 'ui'
          }

          if (id.includes('node_modules/naive-ui/')) return 'naive'

          const commonPkgs = [
            'dayjs',
            'localforage',
            'debug',
            'lodash-es',
            'pretty-bytes',
            'ulid',
            'bluebird',
            'js-base64',
            'crypto-js',
            'form-data-encoder',
          ]

          if (id.includes('node_modules/')) {
            for (const p of commonPkgs) {
              if (id.includes(`/node_modules/${p}/`)) return 'common'
            }
          }

          return undefined
        },
      },
    },
  },
})
