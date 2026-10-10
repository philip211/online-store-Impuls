import fsd from '@feature-sliced/steiger-plugin'
import { defineConfig } from 'steiger'

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // Small slices are intentional here: a demo store has one page per route.
    rules: { 'fsd/insignificant-slice': 'off' },
  },
  {
    // Tests may take fixtures from a slice's testing.ts (e.g. the catalogue the API serves).
    files: ['./src/**/*.test.{ts,tsx}'],
    rules: { 'fsd/no-public-api-sidestep': 'off' },
  },
])
