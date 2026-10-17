// Pre-deploy safety net, run from the repo root by .github/workflows/deploy.yml:
//   npx --prefix .github/lint eslint -c .github/lint/eslint.config.mjs <app>/src shared
// Only undefined-variable rules — a missing variable doesn't fail `vite build`
// but crashes the app at runtime (e.g. the Sushiro "lang is not defined"
// outage). Deliberately not a style linter.
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

export default [
  { ignores: ['**/dist/**', '**/node_modules/**'] },
  {
    files: ['**/*.{js,jsx,mjs}'],
    // react-hooks is loaded only so existing eslint-disable comments for its
    // rules resolve; none of its rules are enabled.
    plugins: { react, 'react-hooks': reactHooks },
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node, __APP_BUILD__: 'readonly' },
    },
    rules: {
      'no-undef': 'error',
      'react/jsx-no-undef': 'error',
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error',
    },
  },
  {
    // Service-worker sources (e.g. stock-ranges/src/sw.js)
    files: ['**/sw.js'],
    languageOptions: { globals: { ...globals.serviceworker } },
  },
]
