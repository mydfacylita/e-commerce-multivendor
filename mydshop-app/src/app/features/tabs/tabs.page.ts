import { Component } from '@angular/core';
import { CartService } from '../../core/services/cart.service';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: false
})
export class TabsPage {
  cartItemCount = 0;

  constructor(private cartService: CartService) {
    this.cartService.cart$.subscribe(cart => {
      this.cartItemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    });
  }
}
