import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Product } from './products.service';
import { Preferences } from '@capacitor/preferences';

const STORAGE_KEY = 'recently_viewed_products';
const MAX_ITEMS = 20;

@Injectable({
  providedIn: 'root'
})
export class RecentlyViewedService {
  private recentlyViewedSubject = new BehaviorSubject<Product[]>([]);
  recentlyViewed$ = this.recentlyViewedSubject.asObservable();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Carrega produtos vistos do storage
   */
  private async loadFromStorage() {
    try {
      const { value } = await Preferences.get({ key: STORAGE_KEY });
      if (value) {
        const products = JSON.parse(value);
        this.recentlyViewedSubject.next(products);
      }
    } catch (error) {
      console.error('Erro ao carregar produtos vistos:', error);
    }
  }

  /**
   * Salva no storage
   */
  private async saveToStorage(products: Product[]) {
    try {
      await Preferences.set({
        key: STORAGE_KEY,
        value: JSON.stringify(products)
      });
    } catch (error) {
      console.error('Erro ao salvar produtos vistos:', error);
    }
  }

  /**
   * Adiciona um produto à lista de vistos recentemente
   */
  addProduct(product: Product) {
    const current = this.recentlyViewedSubject.value;
    
    // Remove se já existe (para mover pro topo)
    const filtered = current.filter(p => p.id !== product.id);
    
    // Adiciona no início
    const updated = [product, ...filtered].slice(0, MAX_ITEMS);
    
    this.recentlyViewedSubject.next(updated);
    this.saveToStorage(updated);
  }

  /**
   * Retorna produtos vistos recentemente
   */
  getProducts(limit: number = 10): Product[] {
    return this.recentlyViewedSubject.value.slice(0, limit);
  }

  /**
   * Limpa o histórico
   */
  async clear() {
    this.recentlyViewedSubject.next([]);
    await Preferences.remove({ key: STORAGE_KEY });
  }
}
