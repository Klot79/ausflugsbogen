/// <reference types="vitest/config" />
import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';
import { serviceWorkerPlugin } from './build/sw-plugin';

// BASE_PATH lets the app run under a sub path, e.g. "/ausflugsbogen/" on GitHub Pages.
// The default "./" (relative) works from any folder.
const base = process.env.BASE_PATH || './';

export default defineConfig({
  base,
  plugins: [preact(), serviceWorkerPlugin()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
