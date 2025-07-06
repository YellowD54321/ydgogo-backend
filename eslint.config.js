const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.{js,ts}'],
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'warn',
      
      // 內部模組必須使用絕對路徑 (@/)
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../services/*', '../handlers/*', '../utils/*', './services/*', './handlers/*', './utils/*'],
              message: '內部模組應該使用絕對路徑 (@/) 導入，例如: @/services/googleService',
            },
          ],
        },
      ],
    },
  },
  {
    // 測試文件必須使用相對路徑
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.{test,spec}.{ts,tsx}'],
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'warn',
      
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/services/*', '@/handlers/*', '@/utils/*'],
              message: '測試代碼中的內部模組應該使用相對路徑導入，例如: ../googleService',
            },
          ],
        },
      ],
    },
  },
]; 