import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CartService, Cart, CartItem } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { AlertController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.page.html',
  styleUrls: ['./cart.page.scss'],
  standalone: false
})
export class CartPage implements OnInit {
  cart: Cart = {
    items: [],
    subtotal: 0,
    shipping: 0,
    discount: 0,
    total: 0
  };
  
  couponCode = '';
  isApplyingCoupon = false;

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.cartService.cart$.subscribe(cart => {
      this.cart = cart;
    });
  }

  async updateQuantity(item: CartItem, change: number) {
    const newQuantity = item.quantity + change;
    
    try {
      await this.cartService.updateQuantity(
        item.productId,
        newQuantity,
        item.selectedSize,
        item.selectedColor
      );
    } catch (error: any) {
      this.showToast(error.message, 'warning');
    }
  }

  async removeItem(item: CartItem) {
    const alert = await this.alertCtrl.create({
      header: 'Remover Item',
      message: `Deseja remover "${item.name}" do carrinho?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Remover',
          role: 'destructive',
          handler: async () => {
            await this.cartService.removeItem(
              item.productId,
              item.selectedSize,
              item.selectedColor
            );
            this.showToast('Item removido', 'success');
          }
        }
      ]
    });
    await alert.present();
  }

  async applyCoupon() {
    if (!this.couponCode.trim()) return;
    
    this.isApplyingCoupon = true;
    
    try {
      const discount = await this.cartService.applyCoupon(this.couponCode);
      this.showToast(`Cupom aplicado! Desconto de ${this.formatPrice(discount)}`, 'success');
      this.couponCode = '';
    } catch (error: any) {
      this.showToast(error.message || 'Cupom inválido', 'danger');
    } finally {
      this.isApplyingCoupon = false;
    }
  }

  async removeCoupon() {
    await this.cartService.removeCoupon();
    this.showToast('Cupom removido', 'success');
  }

  async goToCheckout() {
    const isAuthenticated = await this.authService.checkAuth();
    
    if (!isAuthenticated) {
      const alert = await this.alertCtrl.create({
        header: 'Login Necessário',
        message: 'Você precisa estar logado para finalizar a compra.',
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          {
            text: 'Fazer Login',
            handler: () => {
              this.router.navigate(['/auth/login'], {
                queryParams: { returnUrl: '/checkout' }
              });
            }
          }
        ]
      });
      await alert.present();
      return;
    }
    
    this.router.navigate(['/checkout']);
  }

  formatPrice(price: number): string {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
