import Config from 'react-native-config';

import App from './src/ui/app/App';

const isStorybookEnabled = String(Config.MOBILE_ENABLE_STORYBOOK ?? process.env.STORYBOOK_ENABLED)
  .toLowerCase()
  .trim() === 'true';

const RootComponent = isStorybookEnabled
  ? require('./.storybook').default
  : App;

export default RootComponent;
