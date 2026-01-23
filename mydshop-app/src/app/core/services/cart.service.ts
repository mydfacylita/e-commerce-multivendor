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
  selectedSize?: string;
  selectedColor?: string;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  couponCode?: string | null;
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
    total: 0,
    couponCode: null
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
      if (savedCart && savedCart.items && savedCart.items.length > 0) {
        // Garantir que todos os valores numéricos são válidos
        const sanitizedCart: Cart = {
          items: savedCart.items,
          subtotal: Number(savedCart.subtotal) || 0,
          shipping: Number(savedCart.shipping) || 0,
          discount: Number(savedCart.discount) || 0,
          total: Number(savedCart.total) || 0,
          couponCode: savedCart.couponCode || null
        };
        
        // Recalcular total se necessário
        if (isNaN(sanitizedCart.total) || sanitizedCart.total === 0) {
          sanitizedCart.subtotal = sanitizedCart.items.reduce(
            (sum, item) => sum + (item.price * item.quantity), 0
          );
          sanitizedCart.total = sanitizedCart.subtotal + sanitizedCart.shipping - sanitizedCart.discount;
        }
        
        this.cart.next(sanitizedCart);
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
    
    // Garantir que os valores são números válidos
    const shipping = Number(currentCart.shipping) || 0;
    const discount = Number(currentCart.discount) || 0;

    this.cart.next({
      ...currentCart,
      subtotal,
      total: subtotal + shipping - discount
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
      total: 0,
      couponCode: null
    });
    await this.saveCart();
  }

  /**
   * Aplica cupom de desconto
   */
  async applyCoupon(code: string): Promise<number> {
    try {
      const request = await this.api.post<{ 
        valid: boolean;
        discount?: number; 
        discountAmount?: number;
        error?: string;
        message?: string;
      }>('/coupons/validate', {
        code,
        subtotal: this.cart.value.subtotal
      });
      const response = await firstValueFrom(request);

      // Verificar se a resposta é válida
      if (!response.valid) {
        throw new Error(response.error || response.message || 'Cupom inválido');
      }

      const currentCart = this.cart.value;
      // Garantir que o desconto é um número válido
      const discountValue = Number(response.discountAmount) || Number(response.discount) || 0;
      
      if (isNaN(discountValue)) {
        throw new Error('Erro ao calcular desconto');
      }

      currentCart.discount = discountValue;
      currentCart.couponCode = code.toUpperCase();
      currentCart.total = currentCart.subtotal + currentCart.shipping - discountValue;
      this.cart.next(currentCart);
      await this.saveCart();

      return discountValue;
    } catch (error: any) {
      // Tratar erro de resposta HTTP
      if (error.error) {
        throw new Error(error.error.error || error.error.message || 'Cupom inválido');
      }
      throw error;
    }
  }

  /**
   * Remove cupom aplicado
   */
  async removeCoupon(): Promise<void> {
    const currentCart = this.cart.value;
    currentCart.couponCode = null;
    currentCart.discount = 0;
    currentCart.total = currentCart.subtotal + currentCart.shipping;
    this.cart.next(currentCart);
    await this.saveCart();
  }

  /**
   * Retorna o cupom aplicado
   */
  getCouponCode(): string | null {
    return this.cart.value.couponCode || null;
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
