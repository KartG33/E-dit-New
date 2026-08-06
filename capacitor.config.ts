import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kartg33.edit.v2',
  appName: 'E-dit 2',
  webDir: 'dist',
  plugins: {
    SystemBars: {
      insetsHandling: 'css',
      style: 'DARK',
      hidden: false,
    },
    Keyboard: {
      resizeOnFullScreen: true,
    },
  },
};

export default config;
