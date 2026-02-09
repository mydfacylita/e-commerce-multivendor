import { Component, OnInit, ViewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { ProductsService, Product, Category, ProductsResponse } from '../../core/services/products.service';
import { CartService, CartItem } from '../../core/services/cart.service';
import { AppConfigService, BrandConfig, TextsConfig, ThemeConfig, FreeShippingInfo } from '../../core/services/app-config.service';
import { RecentlyViewedService } from '../../core/services/recently-viewed.service';
import { ToastController } from '@ionic/angular';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { getBaseUrl } from '../../core/config/api.config';

// Interface para banners do carrossel
interface Banner {
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

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {
  @ViewChild('swiperBanner') swiperBanner!: ElementRef;
  
  // Dados
  featuredProducts: Product[] = [];
  categories: Category[] = [];
  newProducts: Product[] = [];
  allProducts: Product[] = [];
  
  // 🌟 Novas seções dinâmicas
  spotlightProduct: Product | null = null; // Produto em destaque com detalhes
  spotlightRating: { average: number; total: number } = { average: 0, total: 0 };
  recentlyViewed: Product[] = []; // Produtos vistos recentemente
  promoProducts: Product[] = []; // Produtos com maior desconto
  dynamicSections: { title: string; icon: string; products: Product[] }[] = [];
  
  // 🚚 Frete grátis
  freeShippingInfo: FreeShippingInfo = { hasFreeShipping: false, rules: [] };
  
  // Banners do carrossel (carregados dinamicamente)
  banners: Banner[] = [];
  bannersLoaded = false;
  currentBannerIndex = 0;
  
  // Estados
  isLoading = true;
  searchQuery = '';
  
  // Infinite scroll
  currentPage = 1;
  productsPerPage = 10;
  hasMoreProducts = true;
  isLoadingMore = false;
  
  // Configurações dinâmicas
  brand: BrandConfig | null = null;
  texts: TextsConfig | null = null;
  theme: ThemeConfig | null = null;
  logoFailed = false;
  brandParts: { text: string; highlight: boolean }[] = [
    { text: 'MYD', highlight: true },
    { text: 'SHOP', highlight: false }
  ];
  
  // Controle de imagens de categorias com erro
  categoryImageErrors: Set<string> = new Set();

  constructor(
    private productsService: ProductsService,
    private cartService: CartService,
    private appConfig: AppConfigService,
    public recentlyViewedService: RecentlyViewedService,
    private router: Router,
    private toastCtrl: ToastController
  ) {}

  // Debug mode - desativado
  debugMessages: string[] = [];
  showDebug = false;

  ngOnInit() {
    // Debug detalhado
    const ua = navigator.userAgent.toLowerCase();
    const isWV = ua.includes('wv') || (ua.includes('android') && ua.includes('version/'));
    
    this.debugMessages.push('[ENV] WebView: ' + (isWV ? 'SIM' : 'NAO'));
    this.debugMessages.push('[ENV] BaseURL: ' + getBaseUrl());
    
    this.appConfig.config$.subscribe({
      next: (config) => {
        this.debugMessages.push('[DEBUG] Config recebida: ' + JSON.stringify(config).substring(0, 200));
        this.debugMessages.push('[DEBUG] Logo URL: ' + config.brand?.logo);
        this.brand = config.brand;
        this.texts = config.texts;
        this.theme = config.theme;
        this.brandParts = this.appConfig.getStyledBrandName();
        
        // Testar se a URL da logo é acessível
        if (config.brand?.logo) {
          this.testImageUrl(config.brand.logo);
        }
      
        // Carregar banners da configuração
        if (config.banners && config.banners.length > 0) {
          this.banners = config.banners.filter(banner => banner.active);
        } else {
          // Banners padrão caso não haja configuração
          this.banners = [
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
          ];
        }
        this.bannersLoaded = true;
        console.log('Banners carregados:', this.banners);
      },
      error: (err) => {
        this.debugMessages.push('[DEBUG] ERRO config$: ' + JSON.stringify(err).substring(0, 200));
      }
    });
    
    // Carregar informações de frete grátis
    this.appConfig.loadFreeShippingInfo().subscribe({
      next: (info) => {
        this.freeShippingInfo = info;
        this.debugMessages.push('[FRETE] Info carregada: ' + JSON.stringify(info).substring(0, 100));
      },
      error: (err) => {
        this.debugMessages.push('[FRETE] ERRO: ' + err.message);
      }
    });
    
    this.loadData();
    this.setupBannerAutoSlide();
  }

  /**
   * Configura o auto-slide do banner e listener de mudança
   */
  setupBannerAutoSlide() {
    // Atualizar índice quando o swiper mudar
    setTimeout(() => {
      if (this.swiperBanner?.nativeElement) {
        this.swiperBanner.nativeElement.addEventListener('slidechange', (event: any) => {
          this.currentBannerIndex = event.detail[0].activeIndex % this.banners.length;
        });
      }
    }, 500);
  }

  /**
   * Navega para um banner específico
   */
  goToBanner(index: number) {
    this.currentBannerIndex = index;
    if (this.swiperBanner?.nativeElement?.swiper) {
      this.swiperBanner.nativeElement.swiper.slideTo(index);
    }
  }

  /**
   * Ação ao clicar em um banner
   */
  onBannerClick(banner: Banner) {
    if (banner.buttonLink) {
      if (banner.buttonLink.startsWith('http')) {
        // Link externo
        window.open(banner.buttonLink, '_blank');
      } else {
        // Navegação interna
        this.router.navigate([banner.buttonLink]);
      }
    }
  }

  /**
   * Carrega dados iniciais
   */
  loadData() {
    this.debugMessages.push('[DEBUG] loadData() iniciado');
    this.isLoading = true;
    this.currentPage = 1;
    this.allProducts = [];
    this.hasMoreProducts = true;
    
    // Usar catchError para que erros individuais não quebrem todo o forkJoin
    const emptyProducts = { products: [], total: 0, page: 1, limit: 12, totalPages: 0, hasMore: false };
    
    forkJoin({
      featured: this.productsService.getFeaturedProducts(8).pipe(catchError(e => { this.debugMessages.push('[ERRO] featured: ' + e?.message); return of(emptyProducts); })),
      categories: this.productsService.getCategories().pipe(catchError(e => { this.debugMessages.push('[ERRO] categories: ' + e?.message); return of([]); })),
      newProducts: this.productsService.getProducts({ limit: 8, sortBy: 'newest' }).pipe(catchError(e => { this.debugMessages.push('[ERRO] newProducts: ' + e?.message); return of(emptyProducts); })),
      allProducts: this.productsService.getProducts({ page: 1, limit: this.productsPerPage }).pipe(catchError(e => { this.debugMessages.push('[ERRO] allProducts: ' + e?.message); return of(emptyProducts); }))
    }).subscribe({
      next: (result) => {
        this.debugMessages.push('[DEBUG] OK - Dados recebidos!');
        // Tratar dados - mesmo que vazios, não é erro
        this.featuredProducts = result.featured?.products || [];
        this.categories = (result.categories || []).slice(0, 8);
        this.newProducts = result.newProducts?.products || [];
        this.allProducts = result.allProducts?.products || [];
        this.hasMoreProducts = (result.allProducts?.products?.length || 0) >= this.productsPerPage;
        this.isLoading = false;
        
        // 🌟 Carregar seções dinâmicas
        this.loadSpotlightProduct();
        this.loadRecentlyViewed();
        this.createDynamicSections();
        
        // Mostrar quantidade no debug
        this.debugMessages.push('[DEBUG] Featured: ' + this.featuredProducts.length);
        this.debugMessages.push('[DEBUG] Categories: ' + this.categories.length);
        
        // Mostrar URLs das imagens para debug
        if (this.featuredProducts.length > 0) {
          const img = this.featuredProducts[0].images?.[0];
          this.debugMessages.push('[IMG] Produto 1: ' + (img?.substring(0, 80) || 'sem imagem'));
        }
        if (this.featuredProducts.length > 1) {
          const img = this.featuredProducts[1].images?.[0];
          this.debugMessages.push('[IMG] Produto 2: ' + (img?.substring(0, 80) || 'sem imagem'));
        }
      },
      error: (error: any) => {
        this.debugMessages.push('[DEBUG] ERRO: ' + (error?.message || 'Erro de conexão'));
        console.error('Erro ao carregar dados:', error);
        // NÃO mostrar toast de erro - apenas carregar listas vazias
        this.featuredProducts = [];
        this.categories = [];
        this.newProducts = [];
        this.allProducts = [];
        this.isLoading = false;
      }
    });
  }

  /**
   * Refresh pull-to-refresh
   */
  handleRefresh(event: any) {
    this.currentPage = 1;
    this.allProducts = [];
    this.hasMoreProducts = true;
    
    const emptyProducts = { products: [], total: 0, page: 1, limit: 12, totalPages: 0, hasMore: false };
    
    forkJoin({
      featured: this.productsService.getFeaturedProducts(8).pipe(catchError(() => of(emptyProducts))),
      categories: this.productsService.getCategories().pipe(catchError(() => of([]))),
      newProducts: this.productsService.getProducts({ limit: 8, sortBy: 'newest' }).pipe(catchError(() => of(emptyProducts))),
      allProducts: this.productsService.getProducts({ page: 1, limit: this.productsPerPage }).pipe(catchError(() => of(emptyProducts)))
    }).subscribe({
      next: (result) => {
        this.featuredProducts = result.featured?.products || [];
        this.categories = (result.categories || []).slice(0, 8);
        this.newProducts = result.newProducts?.products || [];
        this.allProducts = result.allProducts?.products || [];
        this.hasMoreProducts = (result.allProducts?.products?.length || 0) >= this.productsPerPage;
        this.isLoading = false;
        event.target.complete();
      },
      error: () => {
        // Não mostrar erro - apenas finalizar refresh
        this.isLoading = false;
        event.target.complete();
      }
    });
  }

  /**
   * Carrega mais produtos (infinite scroll)
   */
  loadMoreProducts(event: any) {
    if (!this.hasMoreProducts || this.isLoadingMore) {
      event.target.complete();
      return;
    }

    this.isLoadingMore = true;
    this.currentPage++;

    this.productsService.getProducts({ 
      page: this.currentPage, 
      limit: this.productsPerPage 
    }).subscribe({
      next: (result) => {
        const newProducts = result.products || [];
        this.allProducts = [...this.allProducts, ...newProducts];
        this.hasMoreProducts = newProducts.length >= this.productsPerPage;
        this.isLoadingMore = false;
        event.target.complete();
        
        // Desabilita o infinite scroll se não houver mais produtos
        if (!this.hasMoreProducts) {
          event.target.disabled = true;
        }
      },
      error: (error: any) => {
        console.error('Erro ao carregar mais produtos:', error);
        this.isLoadingMore = false;
        event.target.complete();
      }
    });
  }

  /**
   * Tratamento de erro ao carregar logo
   */
  onLogoError(event: any) {
    console.error('❌ Erro ao carregar logo:', this.brand?.logo, event);
    this.debugMessages.push('[ERRO] Logo não carregou: ' + this.brand?.logo);
    this.debugMessages.push('[ERRO] Evento: ' + JSON.stringify(event?.detail || event?.type || 'unknown'));
    this.logoFailed = true;
  }

  /**
   * Logo carregou com sucesso
   */
  onLogoLoad() {
    console.log('✅ Logo carregou com sucesso:', this.brand?.logo);
    this.debugMessages.push('[OK] Logo carregou: ' + this.brand?.logo);
  }

  /**
   * Testar se a URL da imagem é acessível via fetch
   */
  async testImageUrl(url: string) {
    try {
      this.debugMessages.push('[TEST] Testando URL: ' + url);
      const response = await fetch(url, { method: 'HEAD', mode: 'cors' });
      this.debugMessages.push('[TEST] Resposta: ' + response.status + ' ' + response.statusText);
    } catch (error: any) {
      this.debugMessages.push('[TEST] ERRO fetch: ' + (error?.message || error));
    }
  }

  /**
   * Navegar para busca
   */
  goToSearch() {
    this.router.navigate(['/search'], { 
      queryParams: { q: this.searchQuery }
    });
  }

  /**
   * Navegar para categoria
   */
  goToCategory(category: Category) {
    this.router.navigate(['/tabs/categories'], {
      queryParams: { id: category.id }
    });
  }

  /**
   * Tratamento de erro ao carregar imagem da categoria
   */
  onCategoryImageError(categoryId: string) {
    this.categoryImageErrors.add(categoryId);
  }

  /**
   * Navegar para detalhes do produto
   */
  goToProduct(product: Product) {
    // 🕐 Salvar nos vistos recentemente
    this.recentlyViewedService.addProduct(product);
    this.router.navigate(['/product', product.id]);
  }

  /**
   * Adicionar ao carrinho rapidamente
   */
  async addToCart(product: Product, event: Event) {
    event.stopPropagation();
    
    if (product.stock <= 0) {
      this.showToast('Produto indisponível', 'warning');
      return;
    }

    const cartItem: CartItem = {
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.images?.[0] || '',
      stock: product.stock
    };

    try {
      await this.cartService.addItem(cartItem);
      this.showToast('Adicionado ao carrinho!', 'success');
    } catch (error: any) {
      this.showToast(error.message || 'Erro ao adicionar', 'danger');
    }
  }

  /**
   * Ver todos os produtos em destaque
   */
  viewAllFeatured() {
    this.router.navigate(['/search'], {
      queryParams: { featured: true }
    });
  }

  /**
   * Ver todos os novos produtos
   */
  viewAllNew() {
    this.router.navigate(['/search'], {
      queryParams: { sortBy: 'newest' }
    });
  }

  /**
   * Formata preço para exibição
   */
  formatPrice(price: number): string {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  /**
   * Calcula desconto percentual
   */
  getDiscount(price: number, comparePrice?: number): number {
    if (!comparePrice || comparePrice <= price) return 0;
    return Math.round(((comparePrice - price) / comparePrice) * 100);
  }

  /**
   * Exibe toast
   */
  private async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  /**
   * 🌟 Carrega produto em destaque com detalhes completos (avaliações, frete)
   */
  private loadSpotlightProduct() {
    // Escolhe aleatoriamente um produto dos destaques
    if (this.featuredProducts.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * this.featuredProducts.length);
    this.spotlightProduct = this.featuredProducts[randomIndex];
    
    // Buscar avaliações desse produto
    if (this.spotlightProduct) {
      this.productsService.getProductReviews(this.spotlightProduct.id, 1, 3).subscribe({
        next: (response: any) => {
          this.spotlightRating = {
            average: response.stats?.averageRating || 0,
            total: response.stats?.totalReviews || 0
          };
        },
        error: () => {
          this.spotlightRating = { average: 0, total: 0 };
        }
      });
    }
  }

  /**
   * 🕐 Carrega produtos vistos recentemente
   */
  private loadRecentlyViewed() {
    // O serviço já mantém os produtos completos em memória
    this.recentlyViewed = this.recentlyViewedService.getProducts(10);
  }

  /**
   * 🔀 Embaralha array (Fisher-Yates)
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * 📦 Cria seções dinâmicas aleatórias priorizando produtos em destaque
   */
  private createDynamicSections() {
    this.dynamicSections = [];
    
    // Produtos com desconto (promoções)
    this.promoProducts = this.allProducts
      .filter(p => p.compareAtPrice && p.compareAtPrice > p.price)
      .sort((a, b) => {
        const discountA = (((a.compareAtPrice || 0) - a.price) / (a.compareAtPrice || 1)) * 100;
        const discountB = (((b.compareAtPrice || 0) - b.price) / (b.compareAtPrice || 1)) * 100;
        return discountB - discountA;
      })
      .slice(0, 10);
    
    if (this.promoProducts.length > 0) {
      this.dynamicSections.push({
        title: '🔥 Ofertas Imperdíveis',
        icon: 'flame-outline',
        products: this.shuffleArray(this.promoProducts).slice(0, 6)
      });
    }
    
    // Seções randômicas com diferentes temas
    const sectionThemes = [
      { title: '⭐ Recomendados para Você', icon: 'star-outline' },
      { title: '💎 Seleção Premium', icon: 'diamond-outline' },
      { title: '🎯 Escolha Certa', icon: 'checkmark-circle-outline' },
      { title: '🛒 Mais Vendidos', icon: 'trending-up-outline' },
      { title: '✨ Novidades da Semana', icon: 'sparkles-outline' }
    ];
    
    // Combinar featured + all products e embaralhar
    const combinedProducts = [...this.featuredProducts, ...this.allProducts];
    const uniqueProducts = combinedProducts.filter((p, i, arr) => 
      arr.findIndex(x => x.id === p.id) === i
    );
    
    // Criar 2-3 seções randômicas
    const numSections = Math.min(3, Math.floor(uniqueProducts.length / 6));
    const shuffledThemes = this.shuffleArray(sectionThemes);
    
    for (let i = 0; i < numSections && i < shuffledThemes.length; i++) {
      const startIndex = i * 6;
      const sectionProducts = this.shuffleArray(uniqueProducts).slice(startIndex, startIndex + 6);
      
      if (sectionProducts.length >= 3) {
        this.dynamicSections.push({
          title: shuffledThemes[i].title,
          icon: shuffledThemes[i].icon,
          products: sectionProducts
        });
      }
    }
  }

  /**
   * Gera estrelas para rating
   */
  getStarsArray(rating: number): string[] {
    const stars: string[] = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push('star');
      } else if (i === fullStars && hasHalfStar) {
        stars.push('star-half');
      } else {
        stars.push('star-outline');
      }
    }
    return stars;
  }

  /**
   * Verifica se um produto tem frete grátis baseado nas regras
   */
  hasFreeShipping(product: Product): boolean {
    if (!this.freeShippingInfo.hasFreeShipping || !this.freeShippingInfo.bestOffer) {
      return false;
    }
    return product.price >= this.freeShippingInfo.bestOffer.minValue;
  }

  /**
   * Retorna texto de frete grátis com região (se disponível)
   */
  getFreeShippingLabel(product: Product): string | null {
    if (!this.freeShippingInfo.hasFreeShipping || !this.freeShippingInfo.bestOffer) {
      return null;
    }
    
    if (product.price >= this.freeShippingInfo.bestOffer.minValue) {
      const region = this.freeShippingInfo.bestOffer.region;
      // Só mostra região se ela existir e não for genérica
      if (region && region !== 'Todo o Brasil') {
        return `Frete Grátis · ${region}`;
      }
      return 'Frete Grátis';
    }
    return null;
  }

  /**
   * Calcula frete estimado usando as regras configuradas
   */
  getEstimatedShipping(product: Product): string {
    if (this.freeShippingInfo.hasFreeShipping && this.freeShippingInfo.bestOffer) {
      if (product.price >= this.freeShippingInfo.bestOffer.minValue) {
        return 'Frete Grátis';
      }
    }
    // Fallback para frete estimado
    const shippingCost = Math.min(29.90, product.price * 0.1);
    return this.formatPrice(shippingCost);
  }

  /**
   * Calcula prazo de entrega estimado
   */
  getEstimatedDelivery(): string {
    const today = new Date();
    const minDays = 5;
    const maxDays = 12;
    
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() + minDays);
    
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + maxDays);
    
    const formatDate = (date: Date) => {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      return `${day}/${month}`;
    };
    
    return `${formatDate(minDate)} - ${formatDate(maxDate)}`;
  }
}
