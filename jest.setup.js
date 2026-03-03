import 'react-native-gesture-handler/jestSetup';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('react-native-worklets', () => ({
  __esModule: true,
  default: {},
  isShareableRef: () => false,
  makeShareable: value => value,
  makeShareableCloneOnUIRecursive: value => value,
  makeShareableCloneRecursive: value => value,
  shareableMappingCache: new Map(),
  getDynamicFeatureFlag: () => false,
  getStaticFeatureFlag: () => false,
  setDynamicFeatureFlag: () => undefined,
  isSynchronizable: () => false,
  createSerializable: value => value,
  isSerializableRef: () => false,
  registerCustomSerializable: () => undefined,
  serializableMappingCache: new Map(),
  createSynchronizable: value => value,
  RuntimeKind: {
    RN: 'RN',
    UI: 'UI',
  },
  getRuntimeKind: () => 'RN',
  createWorkletRuntime: () => ({ name: 'mock-runtime' }),
  runOnRuntime: fn => fn,
  scheduleOnRuntime: fn => fn,
  callMicrotasks: () => undefined,
  executeOnUIRuntimeSync: fn => (typeof fn === 'function' ? fn() : undefined),
  runOnUI: fn => fn,
  runOnUIAsync: fn => fn,
  runOnUISync: fn => fn,
  runOnJS: fn => fn,
  scheduleOnRN: fn => (typeof fn === 'function' ? fn() : undefined),
  scheduleOnUI: fn => (typeof fn === 'function' ? fn() : undefined),
  unstable_eventLoopTask: fn => (typeof fn === 'function' ? fn() : undefined),
  isWorkletFunction: jest.fn(() => false),
  WorkletsModule: {},
}));

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock'),
);

jest.mock('react-native-config', () => ({
  API_FOOTBALL_BASE_URL: 'https://v3.football.api-sports.io',
  API_FOOTBALL_KEY: 'test-key',
}));

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('react-native-calendars', () => {
  const React = require('react');
  const { View } = require('react-native');

  const CalendarList = props => React.createElement(View, props, props.children ?? null);

  return { CalendarList };
});

jest.mock('react-native-background-fetch', () => ({
  NETWORK_TYPE_ANY: 1,
  configure: jest.fn(async () => 2),
  scheduleTask: jest.fn(async () => undefined),
  finish: jest.fn(),
}));

jest.mock('@shopify/flash-list', () => {
  const React = require('react');
  const { View } = require('react-native');

  function renderOptionalComponent(component) {
    if (!component) {
      return null;
    }

    if (typeof component === 'function') {
      return React.createElement(component);
    }

    return component;
  }

  const FlashList = React.forwardRef((props, ref) => {
    const {
      data = [],
      renderItem,
      keyExtractor,
      ListEmptyComponent,
      ListHeaderComponent,
      ListFooterComponent,
      style,
      testID,
    } = props;

    return (
      <View ref={ref} style={style} testID={testID}>
        {renderOptionalComponent(ListHeaderComponent)}
        {data.length === 0
          ? renderOptionalComponent(ListEmptyComponent)
          : data.map((item, index) => {
              const key = keyExtractor ? keyExtractor(item, index) : String(index);
              return (
                <React.Fragment key={key}>
                  {renderItem({
                    item,
                    index,
                    separators: {
                      highlight: () => undefined,
                      unhighlight: () => undefined,
                      updateProps: () => undefined,
                    },
                  })}
                </React.Fragment>
              );
            })}
        {renderOptionalComponent(ListFooterComponent)}
      </View>
    );
  });
  FlashList.displayName = 'FlashList';

  return { FlashList };
});

jest.mock('react-native-localize', () => ({
  getLocales: jest.fn(() => [
    {
      languageCode: 'en',
      languageTag: 'en-US',
      countryCode: 'US',
      isRTL: false,
    },
  ]),
  getCountry: jest.fn(() => 'US'),
  getCurrencies: jest.fn(() => ['USD']),
}));

jest.mock('react-native-device-info', () => ({
  getVersion: () => '0.0.1',
  getBuildNumber: () => '1',
  isEmulator: jest.fn(async () => false),
  usePowerState: () => ({
    lowPowerMode: false,
  }),
}));

jest.mock('jail-monkey', () => ({
  isJailBroken: jest.fn(() => false),
  hookDetected: jest.fn(() => false),
  isDebuggedMode: jest.fn(async () => false),
}));

jest.mock('react-native-ssl-public-key-pinning', () => ({
  initializeSslPinning: jest.fn(async () => undefined),
  isSslPinningAvailable: jest.fn(() => false),
  addSslPinningErrorListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('react-native-permissions', () => ({
  RESULTS: {
    UNAVAILABLE: 'unavailable',
    BLOCKED: 'blocked',
    DENIED: 'denied',
    GRANTED: 'granted',
    LIMITED: 'limited',
  },
  checkNotifications: jest.fn(async () => ({
    status: 'granted',
    settings: {},
  })),
  requestNotifications: jest.fn(async () => ({
    status: 'granted',
    settings: {},
  })),
  openSettings: jest.fn(async () => undefined),
}));
