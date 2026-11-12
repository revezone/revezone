import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin, splitVendorChunkPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ['electron-store'] })],
    build: {
      minify: true
    }
  },
  preload: {
    build: {
      minify: true,
      rollupOptions: {
        output: { inlineDynamicImports: true }
      }
    }
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
      process.env.ANALYZE_BUNDLE === '1' &&
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
            revemate: ['revemate'],
            tldraw: ['@tldraw/tldraw']
          }
        }
      }
    }
  }
});
