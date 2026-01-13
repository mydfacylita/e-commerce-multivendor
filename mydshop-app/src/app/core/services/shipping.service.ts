/**
 * 🚚 SHIPPING SERVICE
 * 
 * Serviço para cálculo de frete e opções de entrega.
 */

import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ShippingOption {
  id: string;
  name: string;
  description: string;
  price: number;
  days: number;
  company: string;
  icon: string;
  isFree?: boolean;
  isExpress?: boolean;
  discount?: number;
}

export interface ShippingResult {
  cep: string;
  city: string;
  state: string;
  options: ShippingOption[];
  freeShippingThreshold?: number;
  freeShippingDiscount?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ShippingService {

  private readonly FREE_SHIPPING_THRESHOLD = 199; // Frete grátis acima de R$ 199
  private readonly EXPRESS_CITIES = ['01000-000', '04000-000', '02000-000']; // CEPs de SP capital

  constructor() { }

  /**
   * Calcula frete baseado no CEP e valor do produto
   */
  calculateShipping(cep: string, productValue: number, productWeight: number = 0.5): Observable<ShippingResult> {
    return this.validateCep(cep).pipe(
      delay(1500), // Simula delay de API
      map(location => {
        const options = this.generateShippingOptions(cep, productValue, productWeight, location);
        
        return {
          cep: cep,
          city: location.city,
          state: location.state,
          options: options,
          freeShippingThreshold: this.FREE_SHIPPING_THRESHOLD,
          freeShippingDiscount: productValue >= this.FREE_SHIPPING_THRESHOLD ? 
            this.calculateFreeShippingDiscount(options) : undefined
        };
      })
    );
  }

  /**
   * Validar e buscar informações do CEP
   */
  private validateCep(cep: string): Observable<{city: string, state: string, region: string}> {
    // Simular diferentes regiões baseadas no CEP
    const firstDigit = parseInt(cep.charAt(0));
    
    let location = { city: 'São Paulo', state: 'SP', region: 'sudeste' };
    
    switch (firstDigit) {
      case 0:
      case 1:
        location = { city: 'São Paulo', state: 'SP', region: 'sudeste' };
        break;
      case 2:
        location = { city: 'Rio de Janeiro', state: 'RJ', region: 'sudeste' };
        break;
      case 3:
        location = { city: 'Belo Horizonte', state: 'MG', region: 'sudeste' };
        break;
      case 4:
        location = { city: 'Salvador', state: 'BA', region: 'nordeste' };
        break;
      case 5:
        location = { city: 'Brasília', state: 'DF', region: 'centro-oeste' };
        break;
      case 6:
        location = { city: 'Fortaleza', state: 'CE', region: 'nordeste' };
        break;
      case 7:
        location = { city: 'Goiânia', state: 'GO', region: 'centro-oeste' };
        break;
      case 8:
        location = { city: 'Curitiba', state: 'PR', region: 'sul' };
        break;
      case 9:
        location = { city: 'Porto Alegre', state: 'RS', region: 'sul' };
        break;
    }
    
    return of(location);
  }

  /**
   * Gerar opções de frete baseadas na localização e produto
   */
  private generateShippingOptions(
    cep: string, 
    productValue: number, 
    productWeight: number, 
    location: {city: string, state: string, region: string}
  ): ShippingOption[] {
    
    const options: ShippingOption[] = [];
    const isExpress = this.EXPRESS_CITIES.some(expressCep => cep.startsWith(expressCep.substring(0, 2)));
    const isFreeShipping = productValue >= this.FREE_SHIPPING_THRESHOLD;
    
    // Frete Grátis (se aplicável)
    if (isFreeShipping) {
      options.push({
        id: 'free',
        name: 'Frete Grátis',
        description: 'Entrega gratuita por compras acima de R$ 199',
        price: 0,
        days: this.calculateDeliveryDays(location.region, false),
        company: 'MYDSHOP',
        icon: 'gift-outline',
        isFree: true
      });
    }

    // PAC Econômico
    options.push({
      id: 'pac',
      name: 'PAC',
      description: 'Entrega econômica pelos Correios',
      price: isFreeShipping ? 0 : this.calculatePACPrice(location.region, productWeight),
      days: this.calculateDeliveryDays(location.region, false),
      company: 'Correios',
      icon: 'mail-outline',
      isFree: isFreeShipping
    });

    // SEDEX Rápido
    const sedexPrice = this.calculateSedexPrice(location.region, productWeight);
    options.push({
      id: 'sedex',
      name: 'SEDEX',
      description: 'Entrega rápida e rastreada',
      price: isFreeShipping ? Math.max(0, sedexPrice - 15) : sedexPrice, // Desconto mesmo com frete grátis
      days: this.calculateDeliveryDays(location.region, true),
      company: 'Correios',
      icon: 'rocket-outline',
      isExpress: true,
      discount: isFreeShipping ? 15 : undefined
    });

    // Entrega Expressa (apenas para grandes centros)
    if (isExpress) {
      options.push({
        id: 'express',
        name: 'Entrega Expressa',
        description: 'Receba em até 24h úteis',
        price: isFreeShipping ? 9.90 : 24.90,
        days: 1,
        company: 'MYDSHOP Express',
        icon: 'flash-outline',
        isExpress: true,
        discount: isFreeShipping ? 15 : undefined
      });
    }

    // Retirada em Loja (se disponível)
    if (location.region === 'sudeste') {
      options.push({
        id: 'pickup',
        name: 'Retirar na Loja',
        description: 'Retire gratuitamente em nossa loja',
        price: 0,
        days: 0,
        company: 'MYDSHOP',
        icon: 'storefront-outline',
        isFree: true
      });
    }

    return options.sort((a, b) => {
      // Ordenar: Grátis primeiro, depois por preço
      if (a.isFree && !b.isFree) return -1;
      if (!a.isFree && b.isFree) return 1;
      return a.price - b.price;
    });
  }

  /**
   * Calcular preço do PAC baseado na região
   */
  private calculatePACPrice(region: string, weight: number): number {
    const basePrice = {
      'sudeste': 12.90,
      'sul': 15.90,
      'nordeste': 18.90,
      'centro-oeste': 16.90,
      'norte': 22.90
    };

    const weightFactor = Math.max(0, (weight - 0.5) * 5); // R$ 5 por kg adicional
    return (basePrice[region as keyof typeof basePrice] || 15.90) + weightFactor;
  }

  /**
   * Calcular preço do SEDEX baseado na região
   */
  private calculateSedexPrice(region: string, weight: number): number {
    const basePrice = {
      'sudeste': 18.90,
      'sul': 22.90,
      'nordeste': 26.90,
      'centro-oeste': 24.90,
      'norte': 32.90
    };

    const weightFactor = Math.max(0, (weight - 0.5) * 8); // R$ 8 por kg adicional
    return (basePrice[region as keyof typeof basePrice] || 22.90) + weightFactor;
  }

  /**
   * Calcular dias de entrega baseado na região
   */
  private calculateDeliveryDays(region: string, isExpress: boolean): number {
    const baseDays = {
      'sudeste': isExpress ? 2 : 5,
      'sul': isExpress ? 3 : 7,
      'nordeste': isExpress ? 4 : 8,
      'centro-oeste': isExpress ? 3 : 6,
      'norte': isExpress ? 5 : 10
    };

    return baseDays[region as keyof typeof baseDays] || (isExpress ? 3 : 7);
  }

  /**
   * Calcular desconto do frete grátis
   */
  private calculateFreeShippingDiscount(options: ShippingOption[]): number {
    const cheapestOption = options
      .filter(opt => !opt.isFree)
      .sort((a, b) => a.price - b.price)[0];
    
    return cheapestOption?.price || 0;
  }

  /**
   * Formatar CEP
   */
  formatCep(cep: string): string {
    return cep.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2');
  }

  /**
   * Validar formato do CEP
   */
  isValidCep(cep: string): boolean {
    const cleanCep = cep.replace(/\D/g, '');
    return cleanCep.length === 8;
  }
}