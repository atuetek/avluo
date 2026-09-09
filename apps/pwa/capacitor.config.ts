import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.avluo.yesiltepe',
  appName: 'Avluo',
  webDir: 'dist/pwa/browser',
  // Local WebView bundle — API URL is resolved in Angular (environment.ts).
  // Dev: iOS Simulator → 127.0.0.1:3000 | Android Emulator → 10.0.2.2:3000
  // Device: localStorage.setItem('avluo_api_url', 'http://<LAN-IP>:3000')
  android: {
    backgroundColor: '#ff5a3c',
    allowMixedContent: true,
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#ff5a3c',
    scheme: 'Avluo',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      launchAutoHide: true,
      backgroundColor: '#ff5a3c',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#ff5a3c',
    },
    Keyboard: {
      resize: 'body',
    },
  },
};

export default config;
