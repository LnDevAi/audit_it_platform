module.exports = {
  '*.js': [
    'eslint --fix',
    'prettier --write',
    'jest --bail --findRelatedTests',
  ],
  '*.json': [
    'prettier --write',
  ],
  '*.md': [
    'prettier --write',
  ],
};


