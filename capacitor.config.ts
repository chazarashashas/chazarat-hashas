import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.chazarashashas.app',
  appName: 'Chazarat Hashas',
  webDir: 'dist',
  backgroundColor: '#f5f0e4',
  android: {
    backgroundColor: '#f5f0e4',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#f5f0e4',
      androidScaleType: 'CENTER_CROP',
    },
  },
};

export default config;
