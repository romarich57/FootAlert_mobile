module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@data/(.*)$': '<rootDir>/src/data/$1',
    '^@ui/(.*)$': '<rootDir>/src/ui/$1',
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@app-core$': '<rootDir>/packages/app-core/dist/index.js',
    '^@app-core/(.*)$': '<rootDir>/packages/app-core/dist/$1.js',
    '^@api-contract$': '<rootDir>/packages/api-contract/generated/types.ts',
    '^@api-contract/(.*)$': '<rootDir>/packages/api-contract/generated/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@react-navigation|react-native-gesture-handler|react-native-reanimated|react-native-safe-area-context|react-native-screens|react-native-localize)/)',
  ],
  testPathIgnorePatterns: ['<rootDir>/footalert-bff/', '<rootDir>/web/tests/'],
  detectOpenHandles: true,
  forceExit: true,
};
