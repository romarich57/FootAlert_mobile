module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@': './src',
          '@data': './src/data',
          '@ui': './src/ui',
        },
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
