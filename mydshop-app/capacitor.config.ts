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
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#FFFFFF',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    
    // Status Bar
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#007acc',
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
  
  // Configurações Android
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false // Desabilitar em produção
  },
  
  // Configurações iOS
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scrollEnabled: true
  }
};

export default config;
