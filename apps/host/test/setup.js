// babel-preset-expo inlinea EXPO_OS; este proyecto usa @react-native/babel-preset (Re.Pack).
process.env.EXPO_OS = 'ios';

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

// Rozenite solo tiene sentido con React Native DevTools conectado.
jest.mock('@rozenite/react-navigation-plugin', () => ({
  useReactNavigationDevTools: jest.fn(),
}));
jest.mock('@rozenite/network-activity-plugin', () => ({
  useNetworkActivityDevTools: jest.fn(),
  withOnBootNetworkActivityRecording: jest.fn(),
}));
