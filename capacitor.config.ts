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
      androidScaleType: 'CENTER_INSIDE',
    },
    // Google and Apple sign-in only. Every other provider is left out so
    // its SDK (Facebook's especially) never ships in the app. Apple is
    // used on iPhone, where Apple requires it alongside Google.
    SocialLogin: {
      providers: {
        google: true,
        facebook: false,
        apple: true,
        twitter: false,
      },
      logLevel: 1,
    },
  },
};

export default config;
