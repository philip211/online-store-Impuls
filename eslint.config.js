import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'design-reference', 'coverage', 'server'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.strict, ...tseslint.configs.stylistic],
    languageOptions: { ecmaVersion: 2023, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      // FSD: reach into a slice only through its public API (index.ts)
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/*/*/*/**', '!@/shared/**', '!@/app/**', '!@/entities/*/@x/*'],
              message: 'Import slices through their public API: @/layer/slice',
            },
            {
              group: [
                '../**/app/**',
                '../**/pages/**',
                '../**/widgets/**',
                '../**/features/**',
                '../**/entities/**',
              ],
              message: 'Use the @/ alias across layers',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
)
