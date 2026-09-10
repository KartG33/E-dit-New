import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kartg33.edit.v2',
  appName: 'E-dit 2',
  webDir: 'dist/android',
  plugins: {
    SystemBars: {
      insetsHandling: 'disable',
      style: 'DARK',
      hidden: false,
    },
    Keyboard: {
      resizeOnFullScreen: false,
    },
  },
};

export default config;
