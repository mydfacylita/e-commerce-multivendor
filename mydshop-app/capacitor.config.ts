import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mydshop.app',
  appName: 'MYDSHOP',
  webDir: 'www',
  
  // Servidor removido - usar URLs absolutas
  
  // Plugins nativos
  plugins: {
    // Splash Screen
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: '#0A1929',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_INSIDE',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    
    // Status Bar
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#0A1929',
      overlaysWebView: false
    },
    
    // Keyboard
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    },
    
    // Push Notifications (configurar depois)
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  },
  
  // Servidor para produção - usar HTTPS
  server: {
    androidScheme: 'https', // HTTPS para produção
    cleartext: false
  },
  
  // Configurações Android
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // Desabilitar em produção
    useLegacyBridge: true
  },
  
  // Configurações iOS
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scrollEnabled: true
  }
};

export default config;
