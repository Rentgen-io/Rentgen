import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';

// ---------- Architecture boundaries (see the folder roles below) ----------

// Side effects and UI: the store, IPC/network (src/api), app services (toasts, localStorage), i18n, React
const SIDE_EFFECTS = {
  group: [
    'src/store',
    'src/store/**',
    'src/api',
    'src/api/**',
    'src/services',
    'src/services/**',
    'src/hooks',
    'src/hooks/**',
    'src/i18n',
    'src/i18n/**',
    'src/components/**',
    'src/features/**',
    'src/test-engine',
    'src/test-engine/**',
    'react',
    'react-*',
    'i18next',
  ],
  message:
    'src/utils and src/converters are pure (same input, same output, no side effects): pass the value in as an argument, or move the code to src/api, src/services or a hook.',
};

// shared/ is compiled into the renderer, the Electron main process and the CLI: it can't depend on the renderer
const RENDERER = {
  group: ['src', 'src/**', 'electron', 'electron/**', 'react', 'react-*'],
  message: 'shared/ runs in the renderer, the Electron main process and the CLI: it must not import renderer code.',
};

// Node built-ins don't exist in the renderer
const NODE_BUILTINS = {
  group: ['fs', 'fs/**', 'path', 'crypto', 'os', 'child_process', 'node:*'],
  message: 'Node-only code belongs in shared/node/ (it is not bundled into the renderer).',
};

export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'out/**', '.webpack/**', 'build/**', 'coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      import: importPlugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    settings: {
      'import/resolver': {
        typescript: { alwaysTryTypes: true },
        node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
      },
    },
    rules: {
      ...importPlugin.configs.recommended.rules,
      ...importPlugin.configs.typescript.rules,
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // Pure helpers and format converters
    files: ['src/utils/**/*.{ts,tsx}', 'src/converters/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { patterns: [SIDE_EFFECTS] }] },
  },
  {
    // Code shared by every runtime
    files: ['shared/**/*.ts'],
    ignores: ['shared/node/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: [RENDERER, NODE_BUILTINS] }] },
  },
  {
    // Node-only shared code (Electron main process and CLI)
    files: ['shared/node/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [RENDERER] }] },
  },
  {
    files: ['**/*.{js,cjs,mjs}'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
  },
];
