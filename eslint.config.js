const antfu = require('@antfu/eslint-config').default

module.exports = antfu({
  rules: {
    'no-void': ['off'],
    '@typescript-eslint/consistent-type-imports': ['off'],
    'dot-notation': ['off'],
    'ts/consistent-type-imports': ['off'],
  },
}, {
  ignores: ['*.md', '*.yaml'],
})
