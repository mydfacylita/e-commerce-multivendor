import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User } from '../../core/services/auth.service';
import { AlertController, ViewWillEnter } from '@ionic/angular';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false
})
export class ProfilePage implements OnInit, ViewWillEnter {
  user: User | null = null;
  isAuthenticated = false;
  isLoading = true;

  menuItems = [
    { icon: 'receipt-outline', label: 'Meus Pedidos', route: '/orders' },
    { icon: 'location-outline', label: 'Meus Endereços', route: '/addresses' },
    { icon: 'heart-outline', label: 'Favoritos', route: '/favorites' },
    { icon: 'card-outline', label: 'Formas de Pagamento', route: '/payment-methods' },
    { icon: 'notifications-outline', label: 'Notificações', route: '/notifications' },
    { icon: 'help-circle-outline', label: 'Ajuda', route: '/help' },
    { icon: 'document-text-outline', label: 'Termos de Uso', route: '/terms' },
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      console.log('🔐 Profile: user changed', user?.email);
    });
    
    this.authService.isAuthenticated$.subscribe(isAuth => {
      this.isAuthenticated = isAuth;
      console.log('🔐 Profile: isAuthenticated changed', isAuth);
    });
  }
  
  async ionViewWillEnter() {
    // Aguardar inicialização do AuthService
    this.isLoading = true;
    await this.authService.waitForInit();
    this.isLoading = false;
    
    // Atualizar estado
    const isAuth = await this.authService.checkAuth();
    if (isAuth && !this.user) {
      this.user = await this.authService.getUserAsync();
    }
  }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }

  goToRegister() {
    this.router.navigate(['/auth/register']);
  }

  goToMenuItem(route: string) {
    if (!this.isAuthenticated && (route === '/orders' || route === '/addresses' || route === '/favorites' || route === '/payment-methods')) {
      this.goToLogin();
      return;
    }
    this.router.navigate([route]);
  }

  async logout() {
    const alert = await this.alertCtrl.create({
      header: 'Sair',
      message: 'Deseja realmente sair da sua conta?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Sair',
          role: 'destructive',
          handler: () => {
            this.authService.logout();
          }
        }
      ]
    });
    await alert.present();
  }
}
