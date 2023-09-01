import { resolve } from 'path';
import {
  defineConfig,
  externalizeDepsPlugin,
  bytecodePlugin,
  splitVendorChunkPlugin
} from 'electron-vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), bytecodePlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin(), bytecodePlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [
      splitVendorChunkPlugin(),
      react(),
      bytecodePlugin(),
      visualizer({
        emitFile: true,
        filename: 'stats.html'
      })
    ],
    build: {
      minify: 'esbuild',
      rollupOptions: {
        treeshake: true,
        output: {
          manualChunks: {
            antd: ['antd'],
            revesuite: [
              '@revesuite/blocks',
              '@revesuite/editor',
              '@revesuite/lit',
              '@revesuite/store'
            ],
            revemate: ['revemate']
          }
        }
      }
    },
    server: {
      host: true
    }
  }
});
