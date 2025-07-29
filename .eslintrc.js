module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: [
    'standard'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    indent: ['error', 2],
    'linebreak-style': ['error', 'unix'],
    quotes: ['error', 'single'],
    semi: ['error', 'always'],
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'off',
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error',
    'space-before-function-paren': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'no-trailing-spaces': 'error',
    'eol-last': 'error',
    'no-multiple-empty-lines': ['error', { max: 1 }],
    'quote-props': ['error', 'as-needed'],
    'operator-linebreak': ['error', 'before'],
    'multiline-ternary': ['error', 'always-multiline'],
    'spaced-comment': ['error', 'always'],
    'padded-blocks': ['error', 'never'],
    'comma-spacing': ['error', { before: false, after: true }],
    'no-undef': 'error',
    'no-unreachable': 'error',
    'no-unmodified-loop-condition': 'error',
    'no-dupe-keys': 'error',
    'dot-notation': 'error'
  },
  ignorePatterns: [
    'node_modules/',
    'logs/',
    'coverage/',
    '*.min.js'
  ]
};
