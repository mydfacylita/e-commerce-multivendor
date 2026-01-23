import { Component } from '@angular/core';
import { Platform } from '@ionic/angular';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  showSplash = true;
  splashFading = false;

  constructor(private platform: Platform) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(async () => {
      // Configurar status bar - NÃO sobrepor o conteúdo
      if (this.platform.is('capacitor')) {
        // IMPORTANTE: Primeiro desabilita overlay
        await StatusBar.setOverlaysWebView({ overlay: false });
        StatusBar.setStyle({ style: Style.Light });
        StatusBar.setBackgroundColor({ color: '#0A1929' });
        
        // Esconder splash nativa imediatamente
        await SplashScreen.hide();
      }
      
      // Após 1.5 segundos, iniciar fade out
      setTimeout(() => {
        this.splashFading = true;
        
        // Após animação de fade (0.5s), remover splash
        setTimeout(() => {
          this.showSplash = false;
          
          // Mudar cor da status bar para a cor do app
          if (this.platform.is('capacitor')) {
            StatusBar.setBackgroundColor({ color: '#007acc' });
          }
        }, 500);
      }, 1500);
    });
  }
}
