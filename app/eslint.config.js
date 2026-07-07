// ESLint flat config — base Expo + désactivation des règles de format (Prettier gère).
const expoConfig = require('eslint-config-expo/flat');
const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = [
  ...expoConfig,
  eslintConfigPrettier,
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'android/**',
      'ios/**',
      'drizzle/**',
      'babel.config.js',
      'jest.config.js',
      'metro.config.js',
    ],
  },
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Tests : jest.mock() doit précéder l'import du module testé (hoisting jest).
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      'import/first': 'off',
    },
  },
];
