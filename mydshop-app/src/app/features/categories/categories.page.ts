import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductsService, Category, Product, ProductsResponse } from '../../core/services/products.service';
import { CartService, CartItem } from '../../core/services/cart.service';
import { ToastController, InfiniteScrollCustomEvent, ModalController } from '@ionic/angular';

@Component({
  selector: 'app-categories',
  templateUrl: './categories.page.html',
  styleUrls: ['./categories.page.scss'],
  standalone: false
})
export class CategoriesPage implements OnInit {
  categories: Category[] = [];  // Categorias PAI
  currentCategories: Category[] = [];  // Categorias sendo exibidas (PAI ou filhas)
  products: Product[] = [];
  selectedCategory: Category | null = null;
  parentCategory: Category | null = null;  // Para navegação de volta
  showingProducts = false;  // Se está mostrando produtos ou subcategorias
  
  isLoading = true;
  currentPage = 1;
  hasMore = true;
  
  // Controle de imagens com erro
  categoryImageErrors = new Set<string>();
  
  // Filtros
  showFilters = false;
  selectedSort = 'newest';
  minPrice: number | null = null;
  maxPrice: number | null = null;
  activeFiltersCount = 0;
  
  sortOptions = [
    { value: 'newest', label: 'Mais recentes' },
    { value: 'price_asc', label: 'Menor preço' },
    { value: 'price_desc', label: 'Maior preço' },
    { value: 'name_asc', label: 'A - Z' },
    { value: 'name_desc', label: 'Z - A' },
    { value: 'bestseller', label: 'Mais vendidos' }
  ];

  constructor(
    private productsService: ProductsService,
    private cartService: CartService,
    private route: ActivatedRoute,
    private router: Router,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.loadCategories();
    
    // Verificar se tem categoria na URL
    this.route.queryParams.subscribe(params => {
      if (params['id']) {
        this.selectCategoryById(params['id']);
      }
    });
  }

  loadCategories() {
    this.productsService.getCategories().subscribe({
      next: (categories: Category[]) => {
        this.categories = categories;
        this.currentCategories = categories;  // Inicialmente mostra categorias PAI
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Erro ao carregar categorias:', error);
        this.isLoading = false;
      }
    });
  }

  selectCategoryById(id: string) {
    this.isLoading = true;
    this.currentPage = 1;
    this.products = [];
    
    this.selectedCategory = this.categories.find(c => c.id === id) || null;
    this.loadProducts();
  }

  selectCategory(category: Category) {
    // Se a categoria tem filhas, mostrar as subcategorias
    if (category.children && category.children.length > 0) {
      this.parentCategory = category;
      this.currentCategories = category.children;
      this.selectedCategory = category;
      this.showingProducts = false;
    } else {
      // Se não tem filhas, mostrar produtos
      this.selectedCategory = category;
      this.showingProducts = true;
      this.currentPage = 1;
      this.products = [];
      this.isLoading = true;
      this.loadProducts();
    }
  }

  loadProducts() {
    if (!this.selectedCategory) return;
    
    this.productsService.getProductsByCategory(
      this.selectedCategory.id,
      this.currentPage
    ).subscribe({
      next: (response: ProductsResponse) => {
        this.products = [...this.products, ...response.products];
        this.hasMore = response.hasMore;
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Erro ao carregar produtos:', error);
        this.isLoading = false;
      }
    });
  }

  loadMore(event: InfiniteScrollCustomEvent) {
    if (!this.hasMore) {
      event.target.complete();
      event.target.disabled = true;
      return;
    }
    
    this.currentPage++;
    
    if (!this.selectedCategory) {
      event.target.complete();
      return;
    }
    
    this.productsService.getProductsByCategory(
      this.selectedCategory.id,
      this.currentPage
    ).subscribe({
      next: (response: ProductsResponse) => {
        this.products = [...this.products, ...response.products];
        this.hasMore = response.hasMore;
        event.target.complete();
        
        if (!this.hasMore) {
          event.target.disabled = true;
        }
      },
      error: (error: any) => {
        console.error('Erro ao carregar mais produtos:', error);
        event.target.complete();
      }
    });
  }

  clearCategory() {
    // Se está mostrando produtos, voltar para subcategorias (se houver)
    if (this.showingProducts && this.parentCategory) {
      this.showingProducts = false;
      this.products = [];
      this.currentPage = 1;
      this.hasMore = true;
      return;
    }
    
    // Se está mostrando subcategorias, voltar para categorias PAI
    if (this.parentCategory) {
      this.parentCategory = null;
      this.selectedCategory = null;
      this.currentCategories = this.categories;
      this.showingProducts = false;
      this.products = [];
      this.currentPage = 1;
      this.hasMore = true;
      return;
    }
    
    // Se está na lista de categorias PAI, não faz nada
    this.selectedCategory = null;
    this.showingProducts = false;
    this.products = [];
    this.currentPage = 1;
    this.hasMore = true;
    this.clearFilters();
  }

  // Métodos de Filtros
  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  applyFilters() {
    this.showFilters = false;
    this.currentPage = 1;
    this.products = [];
    this.isLoading = true;
    this.updateActiveFiltersCount();
    this.loadProductsWithFilters();
  }

  clearFilters() {
    this.selectedSort = 'newest';
    this.minPrice = null;
    this.maxPrice = null;
    this.activeFiltersCount = 0;
    
    if (this.selectedCategory) {
      this.currentPage = 1;
      this.products = [];
      this.isLoading = true;
      this.loadProductsWithFilters();
    }
  }

  updateActiveFiltersCount() {
    let count = 0;
    if (this.selectedSort !== 'newest') count++;
    if (this.minPrice !== null && this.minPrice > 0) count++;
    if (this.maxPrice !== null) count++;
    this.activeFiltersCount = count;
  }

  loadProductsWithFilters() {
    if (!this.selectedCategory) return;
    
    // Construir parâmetros de filtro
    const params: any = {
      categoryId: this.selectedCategory.id,
      page: this.currentPage,
      limit: 20,
      sortBy: this.selectedSort
    };
    
    if (this.minPrice !== null && this.minPrice > 0) {
      params.minPrice = this.minPrice;
    }
    if (this.maxPrice !== null) {
      params.maxPrice = this.maxPrice;
    }
    
    this.productsService.getProducts(params).subscribe({
      next: (response: ProductsResponse) => {
        if (this.currentPage === 1) {
          this.products = response.products;
        } else {
          this.products = [...this.products, ...response.products];
        }
        this.hasMore = response.hasMore;
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Erro ao carregar produtos:', error);
        this.isLoading = false;
      }
    });
  }

  goToProduct(product: Product) {
    this.router.navigate(['/product', product.id]);
  }

  async addToCart(product: Product, event: Event) {
    event.stopPropagation();
    
    if (product.stock <= 0) {
      const toast = await this.toastCtrl.create({
        message: 'Produto indisponível',
        duration: 2000,
        color: 'warning'
      });
      toast.present();
      return;
    }

    const cartItem: CartItem = {
      productId: product.id,
      name: product.name,
      price: product.salePrice || product.price,
      image: product.images[0],
      quantity: 1,
      stock: product.stock
    };

    this.cartService.addItem(cartItem);

    const toast = await this.toastCtrl.create({
      message: 'Produto adicionado ao carrinho!',
      duration: 2000,
      color: 'success'
    });
    toast.present();
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  // Método para tratar erro de imagem de categoria
  onCategoryImageError(categoryId: string): void {
    this.categoryImageErrors.add(categoryId);
  }

  // Verifica se imagem da categoria teve erro
  hasCategoryImageError(categoryId: string): boolean {
    return this.categoryImageErrors.has(categoryId);
  }

  getDiscountPercent(product: Product): number {
    if (!product.salePrice) return 0;
    return Math.round((1 - product.salePrice / product.price) * 100);
  }
}
