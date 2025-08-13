// ESLint config v9 - Básico e Funcional
module.exports = [
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly'
      }
    },
    rules: {
      // Regras básicas de qualidade
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-console': 'off', // Permitir console em desenvolvimento
      'no-unused-vars': [
        'warn',
        { 
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ],
      'no-empty-pattern': 'off', // Comum em destructuring opcional
      'no-undef': 'off' // Desabilitar para evitar conflitos com TypeScript
    }
  },
  
  {
    files: ['tests/**/*.ts', '**/*.spec.ts', '**/*.test.ts'],
    rules: {
      // Testes são mais relaxados
      'no-unused-vars': 'off',
      'max-lines-per-function': 'off'
    }
  },
  
  {
    ignores: [
      'node_modules/**',
      'test-results/**',
      'playwright-report/**',
      'dist/**',
      'coverage/**',
      '.husky/**'
    ]
  }
];