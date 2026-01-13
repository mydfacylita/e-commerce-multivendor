import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { IonSearchbar, IonInfiniteScroll, ToastController } from '@ionic/angular';
import { ProductsService, Product } from '../../core/services/products.service';
import { CartService } from '../../core/services/cart.service';
import { debounceTime, Subject } from 'rxjs';

@Component({
  selector: 'app-search',
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.scss'],
  standalone: false
})
export class SearchPage implements OnInit {
  @ViewChild('searchbar') searchbar!: IonSearchbar;
  @ViewChild(IonInfiniteScroll) infiniteScroll!: IonInfiniteScroll;

  searchQuery = '';
  products: Product[] = [];
  isLoading = false;
  hasSearched = false;
  currentPage = 1;
  hasMoreProducts = true;
  
  // Search history
  searchHistory: string[] = [];
  
  // Filters
  showFilters = false;
  selectedSort = 'relevance';
  minPrice: number | null = null;
  maxPrice: number | null = null;
  
  sortOptions = [
    { value: 'relevance', label: 'Mais relevantes' },
    { value: 'price_asc', label: 'Menor preço' },
    { value: 'price_desc', label: 'Maior preço' },
    { value: 'newest', label: 'Mais recentes' },
    { value: 'bestselling', label: 'Mais vendidos' }
  ];

  private searchSubject = new Subject<string>();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private productsService: ProductsService,
    private cartService: CartService,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    // Load search history from storage
    this.loadSearchHistory();
    
    // Get query from route params
    const query = this.route.snapshot.queryParamMap.get('q');
    if (query) {
      this.searchQuery = query;
      this.search();
    }

    // Setup debounced search
    this.searchSubject.pipe(
      debounceTime(300)
    ).subscribe(query => {
      if (query.length >= 2) {
        this.performSearch(query);
      }
    });
  }

  ionViewDidEnter() {
    setTimeout(() => {
      this.searchbar?.setFocus();
    }, 200);
  }

  loadSearchHistory() {
    const history = localStorage.getItem('searchHistory');
    if (history) {
      this.searchHistory = JSON.parse(history);
    }
  }

  saveSearchHistory(query: string) {
    if (!query.trim()) return;
    
    // Remove if already exists
    this.searchHistory = this.searchHistory.filter(h => h.toLowerCase() !== query.toLowerCase());
    
    // Add to beginning
    this.searchHistory.unshift(query);
    
    // Keep only last 10
    this.searchHistory = this.searchHistory.slice(0, 10);
    
    localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
  }

  clearHistory() {
    this.searchHistory = [];
    localStorage.removeItem('searchHistory');
  }

  onSearchInput(event: any) {
    const query = event.target.value || '';
    this.searchQuery = query;
    
    if (query.length >= 2) {
      this.searchSubject.next(query);
    } else {
      this.products = [];
      this.hasSearched = false;
    }
  }

  search() {
    if (this.searchQuery.trim().length < 2) return;
    this.performSearch(this.searchQuery);
    this.saveSearchHistory(this.searchQuery);
  }

  searchFromHistory(query: string) {
    this.searchQuery = query;
    this.search();
  }

  performSearch(query: string) {
    this.isLoading = true;
    this.hasSearched = true;
    this.currentPage = 1;
    this.products = [];

    const params: any = {
      search: query,
      page: 1,
      limit: 20
    };

    if (this.selectedSort !== 'relevance') {
      params.sort = this.selectedSort;
    }

    if (this.minPrice !== null) {
      params.minPrice = this.minPrice;
    }

    if (this.maxPrice !== null) {
      params.maxPrice = this.maxPrice;
    }

    this.productsService.searchProducts(params).subscribe({
      next: (response) => {
        this.products = response.products || [];
        this.hasMoreProducts = response.hasMore || false;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Search error:', error);
        this.isLoading = false;
      }
    });
  }

  loadMore(event: any) {
    if (!this.hasMoreProducts) {
      event.target.complete();
      return;
    }

    this.currentPage++;

    const params: any = {
      search: this.searchQuery,
      page: this.currentPage,
      limit: 20
    };

    if (this.selectedSort !== 'relevance') {
      params.sort = this.selectedSort;
    }

    this.productsService.searchProducts(params).subscribe({
      next: (response) => {
        this.products = [...this.products, ...(response.products || [])];
        this.hasMoreProducts = response.hasMore || false;
        event.target.complete();
        
        if (!this.hasMoreProducts) {
          this.infiniteScroll.disabled = true;
        }
      },
      error: (error) => {
        console.error('Load more error:', error);
        event.target.complete();
      }
    });
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  applyFilters() {
    this.showFilters = false;
    this.search();
  }

  clearFilters() {
    this.selectedSort = 'relevance';
    this.minPrice = null;
    this.maxPrice = null;
    this.search();
  }

  async addToCart(product: Product) {
    const cartItem = {
      productId: product.id,
      name: product.name,
      price: product.salePrice || product.price,
      image: product.images[0],
      quantity: 1
    };

    this.cartService.addItem(cartItem);

    const toast = await this.toastController.create({
      message: 'Produto adicionado ao carrinho!',
      duration: 2000,
      color: 'success'
    });
    toast.present();
  }

  openProduct(product: Product) {
    this.router.navigate(['/product', product.id]);
  }

  goBack() {
    this.router.navigate(['/tabs/home']);
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  getDiscountPercentage(product: Product): number {
    if (!product.salePrice) return 0;
    return Math.round((1 - product.salePrice / product.price) * 100);
  }
}
