module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    '@babel/plugin-transform-export-namespace-from',
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@': './src',
          '@data': './src/data',
          '@ui': './src/ui',
          '@domain': './src/domain',
          '@app-core': './packages/app-core/dist',
          '@api-contract': './packages/api-contract/generated',
        },
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
