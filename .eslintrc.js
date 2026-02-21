module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.test.tsx', 'jest.setup.js'],
      env: {
        jest: true,
      },
    },
  ],
};
