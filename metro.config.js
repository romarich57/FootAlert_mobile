const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { resolve: resolveMetroRequest } = require('metro-resolver');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const projectRoot = __dirname;
const NOBLE_HASHES_PACKAGE_SEGMENT = `${path.sep}node_modules${path.sep}@noble${path.sep}hashes${path.sep}`;

const config = {
  watchFolders: [path.resolve(projectRoot, 'packages')],
  resolver: {
    unstable_enablePackageExports: false,
    extraNodeModules: {
      '@data': path.resolve(projectRoot, 'src/data'),
      '@ui': path.resolve(projectRoot, 'src/ui'),
      '@app-core': path.resolve(projectRoot, 'packages/app-core/src'),
      '@api-contract': path.resolve(projectRoot, 'packages/api-contract/generated'),
    },
    resolveRequest: (context, moduleName, platform) => {
      // @noble/hashes 1.8 maps `./crypto` -> `./crypto.js` through `browser`,
      // while exports only exposes `./crypto`. Re-route to the exported entry.
      if (moduleName === '@noble/hashes/crypto.js') {
        return resolveMetroRequest(context, '@noble/hashes/crypto', platform);
      }

      if (
        moduleName === './crypto.js' &&
        typeof context.originModulePath === 'string' &&
        context.originModulePath.includes(NOBLE_HASHES_PACKAGE_SEGMENT)
      ) {
        return resolveMetroRequest(context, '@noble/hashes/crypto', platform);
      }

      return resolveMetroRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
