/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('@data/notifications/pushTokenLifecycle', () => ({
  startPushNotificationRuntime: jest.fn(async () => undefined),
  stopPushNotificationRuntime: jest.fn(() => undefined),
  syncPushTokenRegistration: jest.fn(async () => undefined),
}));

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
