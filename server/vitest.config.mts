import swc from 'unplugin-swc'
import { defineConfig } from 'vitest/config'

// SWC emits decorator metadata, which Nest's dependency injection needs; esbuild does not.
const plugins = [swc.vite({ module: { type: 'es6' } })]

export default defineConfig({
  test: {
    globals: true,
    projects: [
      {
        plugins,
        test: {
          name: 'unit',
          globals: true,
          include: ['src/**/*.spec.ts'],
        },
      },
      {
        plugins,
        test: {
          name: 'e2e',
          globals: true,
          include: ['test/**/*.e2e-spec.ts'],
          globalSetup: ['test/global-setup.ts'],
          setupFiles: ['test/setup-env.ts'],
          // One database: test files run one after another.
          fileParallelism: false,
          hookTimeout: 60_000,
          testTimeout: 30_000,
        },
      },
    ],
  },
})
