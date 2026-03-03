import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  base: '/gabbyquest/',
  publicDir: 'assets',
  build: {
    outDir: 'dist'
  }
})
