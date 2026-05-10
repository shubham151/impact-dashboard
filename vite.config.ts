import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'

export default defineConfig({
  root: 'root',
  plugins: [svelte()],
  build: {
    outDir: './build',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      $client: path.resolve(__dirname, 'client'),
      $server: path.resolve(__dirname, 'server'),
      $db: path.resolve(__dirname, 'db'),
      $lib: path.resolve(__dirname, 'lib')
    }
  },
  test: {
    root: __dirname
  }
})
