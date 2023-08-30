import { resolve } from 'path';
import {
  defineConfig,
  externalizeDepsPlugin,
  bytecodePlugin,
  splitVendorChunkPlugin
} from 'electron-vite';
import react from '@vitejs/plugin-react';

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
    plugins: [splitVendorChunkPlugin(), react(), bytecodePlugin()],
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
            flexlayout: ['flexlayout-react'],
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
