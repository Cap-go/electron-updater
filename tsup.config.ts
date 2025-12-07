import { defineConfig } from 'tsup';

export default defineConfig([
  // Main process
  {
    entry: ['src/main/index.ts'],
    outDir: 'dist/main',
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    external: ['electron'],
    platform: 'node',
  },
  // Preload
  {
    entry: ['src/preload/index.ts'],
    outDir: 'dist/preload',
    format: ['cjs', 'esm'],
    dts: true,
    external: ['electron'],
    platform: 'node',
  },
  // Renderer
  {
    entry: ['src/renderer/index.ts'],
    outDir: 'dist/renderer',
    format: ['cjs', 'esm'],
    dts: true,
    platform: 'browser',
  },
]);
