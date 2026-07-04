import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.safetyalert.app',
  appName: 'SafetyAlert',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
