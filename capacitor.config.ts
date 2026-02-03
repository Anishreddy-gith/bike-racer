import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourcompany.bikeracer',
  appName: 'Bike Racer',
  webDir: 'web',
  server: {
    // Keep cleartext off for production. (Capacitor serves local assets; no HTTP needed.)
    cleartext: false
  }
};

export default config;
