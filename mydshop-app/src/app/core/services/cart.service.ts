/**
 * 🛒 CART SERVICE
 * 
 * Serviço de gerenciamento do carrinho de compras.
 * Mantém estado local e sincroniza com o backend quando autenticado.
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';

export interface CartItem {
  id?: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  stock?: number;
  size?: string;
  color?: string;
  selectedSize?: string;
  selectedColor?: string;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
}

const CART_STORAGE_KEY = 'mydshop_cart';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cart = new BehaviorSubject<Cart>({
    items: [],
    subtotal: 0,
    shipping: 0,
    discount: 0,
    total: 0
  });

  public cart$ = this.cart.asObservable();

  constructor(
    private api: ApiService,
    private storage: StorageService,
    private auth: AuthService
  ) {
    this.loadCart();
  }

  /**
   * Carrega carrinho do storage
   */
  private async loadCart(): Promise<void> {
    try {
      const savedCart = await this.storage.get<Cart>(CART_STORAGE_KEY);
      if (savedCart && savedCart.items.length > 0) {
        this.cart.next(savedCart);
      }
    } catch (error) {
      console.error('Erro ao carregar carrinho:', error);
    }
  }

  /**
   * Salva carrinho no storage
   */
  private async saveCart(): Promise<void> {
    await this.storage.set(CART_STORAGE_KEY, this.cart.value);
  }

  /**
   * Recalcula totais do carrinho
   */
  private calculateTotals(): void {
    const currentCart = this.cart.value;
    const subtotal = currentCart.items.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );

    this.cart.next({
      ...currentCart,
      subtotal,
      total: subtotal + currentCart.shipping - currentCart.discount
    });
  }

  /**
   * Adiciona item ao carrinho
   */
  async addItem(item: CartItem): Promise<void> {
    const currentCart = this.cart.value;
    const existingIndex = currentCart.items.findIndex(
      i => i.productId === item.productId && 
           i.selectedSize === item.selectedSize && 
           i.selectedColor === item.selectedColor
    );

    if (existingIndex > -1) {
      // Atualizar quantidade
      const newQuantity = currentCart.items[existingIndex].quantity + item.quantity;
      const availableStock = currentCart.items[existingIndex].stock ?? 999;
      if (newQuantity <= availableStock) {
        currentCart.items[existingIndex].quantity = newQuantity;
      } else {
        throw new Error('Quantidade máxima atingida');
      }
    } else {
      // Adicionar novo item
      currentCart.items.push(item);
    }

    this.cart.next(currentCart);
    this.calculateTotals();
    await this.saveCart();
  }

  /**
   * Remove item do carrinho
   */
  async removeItem(productId: string, selectedSize?: string, selectedColor?: string): Promise<void> {
    const currentCart = this.cart.value;
    currentCart.items = currentCart.items.filter(
      item => !(item.productId === productId && 
                item.selectedSize === selectedSize && 
                item.selectedColor === selectedColor)
    );

    this.cart.next(currentCart);
    this.calculateTotals();
    await this.saveCart();
  }

  /**
   * Atualiza quantidade de um item
   */
  async updateQuantity(productId: string, quantity: number, selectedSize?: string, selectedColor?: string): Promise<void> {
    if (quantity < 1) {
      await this.removeItem(productId, selectedSize, selectedColor);
      return;
    }

    const currentCart = this.cart.value;
    const item = currentCart.items.find(
      i => i.productId === productId && 
           i.selectedSize === selectedSize && 
           i.selectedColor === selectedColor
    );

    if (item) {
      const availableStock = item.stock ?? 999;
      if (quantity <= availableStock) {
        item.quantity = quantity;
        this.cart.next(currentCart);
        this.calculateTotals();
        await this.saveCart();
      } else {
        throw new Error('Quantidade excede estoque disponível');
      }
    }
  }

  /**
   * Limpa o carrinho
   */
  async clearCart(): Promise<void> {
    this.cart.next({
      items: [],
      subtotal: 0,
      shipping: 0,
      discount: 0,
      total: 0
    });
    await this.saveCart();
  }

  /**
   * Aplica cupom de desconto
   */
  async applyCoupon(code: string): Promise<number> {
    try {
      const request = await this.api.post<{ discount: number }>('/coupons/validate', {
        code,
        subtotal: this.cart.value.subtotal
      });
      const response = await firstValueFrom(request);

      const currentCart = this.cart.value;
      currentCart.discount = response.discount;
      currentCart.total = currentCart.subtotal + currentCart.shipping - response.discount;
      this.cart.next(currentCart);
      await this.saveCart();

      return response.discount;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Calcula frete usando as regras configuradas no admin
   */
  async calculateShipping(zipCode: string): Promise<number> {
    try {
      const currentCart = this.cart.value;
      const subtotal = currentCart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const estimatedWeight = currentCart.items.reduce((sum, item) => sum + (item.quantity * 0.3), 0);
      
      const request = await this.api.post<{ 
        shippingCost: number; 
        deliveryDays: number;
        isFree: boolean;
        message?: string;
      }>('/shipping/quote', {
        cep: zipCode.replace(/\D/g, ''),
        cartValue: subtotal,
        weight: estimatedWeight
      });
      const response = await firstValueFrom(request);

      currentCart.shipping = response.shippingCost;
      currentCart.total = currentCart.subtotal + response.shippingCost - currentCart.discount;
      this.cart.next(currentCart);
      await this.saveCart();

      return response.shippingCost;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Retorna quantidade total de itens
   */
  getItemCount(): number {
    return this.cart.value.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * Retorna o carrinho atual
   */
  getCart(): Cart {
    return this.cart.value;
  }
}
