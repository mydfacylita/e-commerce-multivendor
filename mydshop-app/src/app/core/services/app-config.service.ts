/**
 * 🎨 APP CONFIG SERVICE
 * 
 * Serviço para gerenciar configurações de aparência do app.
 * Busca configurações do backend e aplica dinamicamente.
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { StorageService } from './storage.service';
import { getApiUrl, getImageUrl } from '../config/api.config';

// Interfaces de configuração
export interface BrandConfig {
  name: string;
  slogan: string;
  logo: string | null;
  logoLight: string | null;
  logoDark: string | null;
  icon: string | null;
  splashScreen: string | null;
}

export interface ThemeConfig {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  success: string;
  warning: string;
  danger: string;
}

export interface TextsConfig {
  loginTitle: string;
  loginSubtitle: string;
  registerTitle: string;
  registerSubtitle: string;
  homeWelcome: string;
}

export interface FeaturesConfig {
  pushNotifications: boolean;
  biometricLogin: boolean;
  darkMode: boolean;
  guestCheckout: boolean;
}

export interface StatusConfig {
  maintenance: boolean;
  maintenanceMessage: string;
}

export interface SupportConfig {
  termsUrl: string;
  privacyUrl: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
}

export interface EcommerceConfig {
  freeShippingMin: number;
  pixDiscount: number;
  boletoDiscount: number;
}

export interface FreeShippingRule {
  minValue: number;
  region: string;
  regionType?: string;
}

export interface FreeShippingInfo {
  hasFreeShipping: boolean;
  bestOffer?: FreeShippingRule;
  rules: FreeShippingRule[];
}

export interface BannerConfig {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  gradient: string;
  buttonText?: string;
  buttonLink?: string;
  image?: string | null;
  active: boolean;
  order: number;
}

export interface AppConfig {
  brand: BrandConfig;
  theme: ThemeConfig;
  texts: TextsConfig;
  features: FeaturesConfig;
  status: StatusConfig;
  support: SupportConfig;
  ecommerce: EcommerceConfig;
  banners: BannerConfig[];
  version: number;
}

// Configuração padrão
const DEFAULT_CONFIG: AppConfig = {
  brand: {
    name: 'MYDSHOP',
    slogan: 'Sua loja na palma da mão',
    logo: null,
    logoLight: null,
    logoDark: null,
    icon: null,
    splashScreen: null,
  },
  theme: {
    primary: '#f97316',
    secondary: '#2563eb',
    accent: '#8b5cf6',
    background: '#ffffff',
    text: '#1f2937',
    success: '#16a34a',
    warning: '#eab308',
    danger: '#ef4444',
  },
  texts: {
    loginTitle: 'Bem-vindo de volta!',
    loginSubtitle: 'Faça login para continuar',
    registerTitle: 'Crie sua conta',
    registerSubtitle: 'É rápido e gratuito',
    homeWelcome: 'Olá! O que você procura hoje?',
  },
  features: {
    pushNotifications: true,
    biometricLogin: true,
    darkMode: true,
    guestCheckout: false,
  },
  status: {
    maintenance: false,
    maintenanceMessage: '',
  },
  support: {
    termsUrl: '/termos',
    privacyUrl: '/privacidade',
    email: null,
    phone: null,
    whatsapp: null,
  },
  ecommerce: {
    freeShippingMin: 0,
    pixDiscount: 0,
    boletoDiscount: 0,
  },
  banners: [
    {
      id: '1',
      title: 'Super Ofertas',
      subtitle: 'Até 50% OFF em produtos selecionados',
      icon: '🔥',
      gradient: 'linear-gradient(135deg, #f97316, #ea580c)',
      buttonText: 'Ver Ofertas',
      buttonLink: '/categories',
      active: true,
      order: 1
    },
    {
      id: '2',
      title: 'Frete Grátis',
      subtitle: 'Em compras acima de R$ 99',
      icon: '🚚',
      gradient: 'linear-gradient(135deg, #16a34a, #15803d)',
      buttonText: 'Aproveitar',
      buttonLink: '/frete-gratis',
      active: true,
      order: 2
    }
  ],
  version: 1,
};

const CONFIG_STORAGE_KEY = 'mydshop_app_config';
const CONFIG_CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private config = new BehaviorSubject<AppConfig>(DEFAULT_CONFIG);
  private freeShippingInfo = new BehaviorSubject<FreeShippingInfo>({ hasFreeShipping: false, rules: [] });
  private lastFetch = 0;
  private isLoading = false;

  // Observables públicos
  public config$ = this.config.asObservable();
  public brand$ = this.config$.pipe(map(c => c.brand));
  public theme$ = this.config$.pipe(map(c => c.theme));
  public texts$ = this.config$.pipe(map(c => c.texts));
  public features$ = this.config$.pipe(map(c => c.features));
  public status$ = this.config$.pipe(map(c => c.status));
  public freeShippingInfo$ = this.freeShippingInfo.asObservable();

  constructor(
    private http: HttpClient,
    private storage: StorageService
  ) {
    this.init();
  }

  /**
   * Retorna a URL da API de configuração
   */
  private getConfigUrl(): string {
    const url = `${getApiUrl()}/app/config`;
    console.log('🎨 Config URL:', url);
    return url;
  }

  /**
   * Processa URLs de imagens na configuração
   * Converte URLs relativas para absolutas (necessário no Capacitor)
   */
  private processConfigImages(config: AppConfig): AppConfig {
    return {
      ...config,
      brand: {
        ...config.brand,
        logo: config.brand.logo ? getImageUrl(config.brand.logo) : null,
        logoLight: config.brand.logoLight ? getImageUrl(config.brand.logoLight) : null,
        logoDark: config.brand.logoDark ? getImageUrl(config.brand.logoDark) : null,
        icon: config.brand.icon ? getImageUrl(config.brand.icon) : null,
        splashScreen: config.brand.splashScreen ? getImageUrl(config.brand.splashScreen) : null,
      },
      banners: config.banners?.map(banner => ({
        ...banner,
        image: banner.image ? getImageUrl(banner.image) : null
      })) || []
    };
  }

  /**
   * Inicializa o serviço carregando config do cache
   */
  private async init() {
    console.log('🎨 AppConfigService: Inicializando...');
    
    // TEMPORÁRIO: Limpar cache para garantir dados frescos
    await this.storage.remove(CONFIG_STORAGE_KEY);
    console.log('🗑️ Cache de configuração limpo');
    
    // Carregar config do cache local primeiro
    const cached = await this.storage.get<AppConfig>(CONFIG_STORAGE_KEY);
    if (cached) {
      console.log('🎨 AppConfigService: Config do cache:', cached.brand?.name);
      this.config.next(cached);
      this.applyTheme(cached.theme);
    }

    // Buscar config atualizada do servidor (precisa subscrever!)
    this.loadConfig().subscribe({
      next: (config) => {
        console.log('🎨 AppConfigService: Config carregada do servidor:', config.brand?.name);
      },
      error: (err) => {
        console.error('🎨 AppConfigService: Erro ao carregar config:', err);
      }
    });
  }

  /**
   * Carrega configurações do servidor
   */
  loadConfig(): Observable<AppConfig> {
    // Evitar múltiplas requisições simultâneas
    if (this.isLoading) {
      return this.config$;
    }

    // Verificar cache - DESABILITAR temporariamente para debug
    // const now = Date.now();
    // if (now - this.lastFetch < CONFIG_CACHE_DURATION) {
    //   return this.config$;
    // }

    this.isLoading = true;
    const now = Date.now();

    const configUrl = this.getConfigUrl();
    console.log('🔄 AppConfigService: Buscando config do servidor...');
    console.log('🔄 URL completa:', configUrl);
    console.log('🔄 API Key:', environment.apiKey?.substring(0, 20) + '...');

    return this.http.get<AppConfig>(configUrl, {
      headers: {
        'x-api-key': environment.apiKey
      }
    }).pipe(
      map(config => this.processConfigImages(config)),
      tap(async (config) => {
        console.log('✅ AppConfigService: Config recebida do servidor!');
        console.log('✅ Brand:', JSON.stringify(config.brand));
        console.log('✅ Logo:', config.brand?.logo);
        console.log('✅ Theme:', JSON.stringify(config.theme));
        
        this.config.next(config);
        this.lastFetch = now;
        this.isLoading = false;
        
        // Salvar no cache local
        await this.storage.set(CONFIG_STORAGE_KEY, config);
        
        // Aplicar tema
        this.applyTheme(config.theme);
      }),
      catchError((error) => {
        console.error('❌ AppConfigService: Erro ao carregar configurações!');
        console.error('❌ Erro completo:', JSON.stringify(error));
        console.error('❌ Status:', error?.status);
        console.error('❌ Message:', error?.message);
        console.error('❌ URL:', error?.url);
        this.isLoading = false;
        return of(this.config.value);
      })
    );
  }

  /**
   * Força recarregar as configurações
   */
  refresh(): Observable<AppConfig> {
    this.lastFetch = 0;
    return this.loadConfig();
  }

  /**
   * Retorna a configuração atual
   */
  getConfig(): AppConfig {
    return this.config.value;
  }

  /**
   * Retorna configuração da marca
   */
  getBrand(): BrandConfig {
    return this.config.value.brand;
  }

  /**
   * Retorna configuração do tema
   */
  getTheme(): ThemeConfig {
    return this.config.value.theme;
  }

  /**
   * Verifica se o app está em manutenção
   */
  isMaintenanceMode(): boolean {
    return this.config.value.status.maintenance;
  }

  /**
   * Aplica as cores do tema como CSS variables
   */
  applyTheme(theme: ThemeConfig) {
    console.log('🎨 Aplicando tema:', theme);
    const root = document.documentElement;
    
    // Cores principais
    root.style.setProperty('--app-primary', theme.primary);
    root.style.setProperty('--app-secondary', theme.secondary);
    root.style.setProperty('--app-accent', theme.accent);
    root.style.setProperty('--app-background', theme.background);
    root.style.setProperty('--app-text', theme.text);
    root.style.setProperty('--app-success', theme.success);
    root.style.setProperty('--app-warning', theme.warning);
    root.style.setProperty('--app-danger', theme.danger);

    // Cores derivadas (mais claras/escuras)
    root.style.setProperty('--app-primary-light', this.lightenColor(theme.primary, 20));
    root.style.setProperty('--app-primary-dark', this.darkenColor(theme.primary, 20));
    root.style.setProperty('--app-secondary-light', this.lightenColor(theme.secondary, 20));
    root.style.setProperty('--app-secondary-dark', this.darkenColor(theme.secondary, 20));

    // Atualizar variáveis do Ionic
    root.style.setProperty('--ion-color-primary', theme.primary);
    root.style.setProperty('--ion-color-secondary', theme.secondary);
    root.style.setProperty('--ion-color-success', theme.success);
    root.style.setProperty('--ion-color-warning', theme.warning);
    root.style.setProperty('--ion-color-danger', theme.danger);
    
    // Aplicar cor de fundo ao Ionic
    root.style.setProperty('--ion-background-color', theme.background);
    root.style.setProperty('--ion-toolbar-background', theme.background);
  }

  /**
   * Clareia uma cor hexadecimal
   */
  private lightenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  }

  /**
   * Escurece uma cor hexadecimal
   */
  private darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  }

  /**
   * Gera nome estilizado da marca (ex: MYD + SHOP)
   * Retorna array de partes com highlight alternado
   */
  getStyledBrandName(): { text: string; highlight: boolean }[] {
    const name = this.config.value.brand.name;
    
    // Se o nome tiver padrão XXXYYY, dividir
    if (name.length >= 4) {
      const midPoint = Math.ceil(name.length / 2);
      return [
        { text: name.substring(0, midPoint), highlight: true },
        { text: name.substring(midPoint), highlight: false }
      ];
    }
    
    return [{ text: name, highlight: true }];
  }

  /**
   * Busca informações de frete grátis do servidor
   */
  loadFreeShippingInfo(): Observable<FreeShippingInfo> {
    const url = `${getApiUrl()}/shipping/free-shipping-info`;
    
    return this.http.get<FreeShippingInfo>(url, {
      headers: {
        'x-api-key': environment.apiKey
      }
    }).pipe(
      tap(info => {
        console.log('🚚 FreeShippingInfo carregado:', info);
        this.freeShippingInfo.next(info);
      }),
      catchError(err => {
        console.error('🚚 Erro ao carregar FreeShippingInfo:', err);
        return of({ hasFreeShipping: false, rules: [] });
      })
    );
  }

  /**
   * Retorna o valor atual de frete grátis
   */
  getFreeShippingInfo(): FreeShippingInfo {
    return this.freeShippingInfo.value;
  }

  /**
   * Verifica se um produto tem frete grátis baseado no preço
   */
  hasFreeShipping(productPrice: number): boolean {
    const info = this.freeShippingInfo.value;
    if (!info.hasFreeShipping) return false;
    
    if (info.bestOffer) {
      return productPrice >= info.bestOffer.minValue;
    }
    return false;
  }

  /**
   * Retorna texto de frete grátis para um produto
   */
  getFreeShippingText(productPrice: number): string | null {
    const info = this.freeShippingInfo.value;
    if (!info.hasFreeShipping || !info.bestOffer) return null;
    
    if (productPrice >= info.bestOffer.minValue) {
      const region = info.bestOffer.region;
      // Só mostra região se ela existir e não for genérica
      if (region && region !== 'Todo o Brasil') {
        return `Frete Grátis · ${region}`;
      }
      return 'Frete Grátis';
    }
    return null;
  }
}
