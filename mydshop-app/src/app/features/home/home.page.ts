import { Component, OnInit, ViewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { ProductsService, Product, Category, ProductsResponse } from '../../core/services/products.service';
import { CartService, CartItem } from '../../core/services/cart.service';
import { AppConfigService, BrandConfig, TextsConfig, ThemeConfig } from '../../core/services/app-config.service';
import { ToastController } from '@ionic/angular';
import { forkJoin } from 'rxjs';

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
  brandParts: { text: string; highlight: boolean }[] = [
    { text: 'MYD', highlight: true },
    { text: 'SHOP', highlight: false }
  ];

  constructor(
    private productsService: ProductsService,
    private cartService: CartService,
    private appConfig: AppConfigService,
    private router: Router,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    // Carregar configurações
    this.appConfig.config$.subscribe(config => {
      this.brand = config.brand;
      this.texts = config.texts;
      this.theme = config.theme;
      this.brandParts = this.appConfig.getStyledBrandName();
      
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
    this.isLoading = true;
    this.currentPage = 1;
    this.allProducts = [];
    this.hasMoreProducts = true;
    
    forkJoin({
      featured: this.productsService.getFeaturedProducts(8),
      categories: this.productsService.getCategories(),
      newProducts: this.productsService.getProducts({ limit: 8, sortBy: 'newest' }),
      allProducts: this.productsService.getProducts({ page: 1, limit: this.productsPerPage })
    }).subscribe({
      next: (result) => {
        this.featuredProducts = result.featured.products || [];
        this.categories = (result.categories || []).slice(0, 8);
        this.newProducts = result.newProducts.products || [];
        this.allProducts = result.allProducts.products || [];
        this.hasMoreProducts = (result.allProducts.products?.length || 0) >= this.productsPerPage;
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Erro ao carregar dados:', error);
        this.showToast('Erro ao carregar dados. Puxe para atualizar.', 'danger');
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
    
    forkJoin({
      featured: this.productsService.getFeaturedProducts(8),
      categories: this.productsService.getCategories(),
      newProducts: this.productsService.getProducts({ limit: 8, sortBy: 'newest' }),
      allProducts: this.productsService.getProducts({ page: 1, limit: this.productsPerPage })
    }).subscribe({
      next: (result) => {
        this.featuredProducts = result.featured.products || [];
        this.categories = (result.categories || []).slice(0, 8);
        this.newProducts = result.newProducts.products || [];
        this.allProducts = result.allProducts.products || [];
        this.hasMoreProducts = (result.allProducts.products?.length || 0) >= this.productsPerPage;
        this.isLoading = false;
        event.target.complete();
      },
      error: (error: any) => {
        console.error('Erro ao carregar dados:', error);
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
   * Navegar para detalhes do produto
   */
  goToProduct(product: Product) {
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
}
