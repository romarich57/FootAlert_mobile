module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@data/(.*)$': '<rootDir>/src/data/$1',
    '^@ui/(.*)$': '<rootDir>/src/ui/$1',
    '^@app-core$': '<rootDir>/packages/app-core/src/index.ts',
    '^@app-core/(.*)$': '<rootDir>/packages/app-core/src/$1',
    '^@api-contract$': '<rootDir>/packages/api-contract/generated/types.ts',
    '^@api-contract/(.*)$': '<rootDir>/packages/api-contract/generated/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@react-navigation|react-native-gesture-handler|react-native-reanimated|react-native-safe-area-context|react-native-screens|react-native-localize)/)',
  ],
  testPathIgnorePatterns: ['<rootDir>/footalert-bff/'],
};
