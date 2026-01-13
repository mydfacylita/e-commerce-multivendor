import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController, LoadingController, AlertController } from '@ionic/angular';
import { ProductsService, Product } from '../../core/services/products.service';
import { CartService } from '../../core/services/cart.service';
import { AuthService, User } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';

// Interfaces para frete
interface ShippingResult {
  shippingCost: number;
  deliveryDays: number;
  isFree: boolean;
  message?: string;
}

interface UserAddress {
  zipCode: string;
  street: string;
  city: string;
  state: string;
  neighborhood: string;
}

@Component({
  selector: 'app-product',
  templateUrl: './product.page.html',
  styleUrls: ['./product.page.scss'],
  standalone: false
})
export class ProductPage implements OnInit {
  product: Product | null = null;
  selectedSize: string | null = null;
  selectedColor: string | null = null;
  quantity = 1;
  currentSlide = 0;
  isLoading = true;
  isFavorite = false;

  // Propriedades para frete
  currentUser: User | null = null;
  userAddress: UserAddress | null = null;
  shippingCep = '';
  shippingResult: ShippingResult | null = null;
  shippingError = '';
  isCalculatingShipping = false;
  shippingCalculated = false;
  showShippingOptions = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productsService: ProductsService,
    private cartService: CartService,
    private authService: AuthService,
    private apiService: ApiService,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.loadProduct();
    this.loadUserData();
  }

  async loadUserData() {
    // Verificar se usuário está logado
    this.currentUser = this.authService.getUser();
    
    if (this.currentUser) {
      try {
        // Buscar endereço padrão do usuário
        const response = await this.apiService.get<any>('/user/address').toPromise();
        if (response.defaultAddress) {
          this.userAddress = response.defaultAddress;
          
          // Calcular frete automaticamente se tiver produto e endereço
          if (this.product) {
            this.calculateShippingForUser();
          }
        }
      } catch (error) {
        console.log('Erro ao buscar endereço do usuário:', error);
      }
    }
  }

  async loadProduct() {
    const productId = this.route.snapshot.paramMap.get('id');
    
    if (!productId) {
      this.router.navigate(['/tabs/home']);
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Carregando...',
      spinner: 'crescent'
    });
    await loading.present();

    this.productsService.getProduct(productId).subscribe({
      next: (product: any) => {
        // Parsear dados JSON se necessário
        if (typeof product.images === 'string') {
          try {
            product.images = JSON.parse(product.images);
          } catch { product.images = []; }
        }
        if (typeof product.sizes === 'string') {
          try {
            product.sizes = JSON.parse(product.sizes);
          } catch { product.sizes = []; }
        }
        if (typeof product.specifications === 'string') {
          try {
            product.specifications = JSON.parse(product.specifications);
          } catch { product.specifications = {}; }
        }
        if (typeof product.attributes === 'string') {
          try {
            product.attributes = JSON.parse(product.attributes);
          } catch { product.attributes = {}; }
        }
        if (typeof product.technicalSpecs === 'string') {
          try {
            product.technicalSpecs = JSON.parse(product.technicalSpecs);
          } catch { product.technicalSpecs = {}; }
        }

        // Debug para ver os dados
        console.log('Product attributes:', product.attributes);
        console.log('Product technicalSpecs:', product.technicalSpecs);
        console.log('Product specifications:', product.specifications);
        if (typeof product.variants === 'string') {
          try {
            product.variants = JSON.parse(product.variants);
          } catch { product.variants = []; }
        }
        if (!Array.isArray(product.colors) && product.color) {
          product.colors = [product.color];
        }
        
        // Extract unique sizes and colors from variants if available
        if (product.variants && product.variants.length > 0) {
          const uniqueSizes = [...new Set(product.variants.map((v: any) => v.size).filter(Boolean))];
          const uniqueColors = [...new Set(product.variants.map((v: any) => v.color).filter(Boolean))];
          
          if (uniqueSizes.length > 0) product.sizes = uniqueSizes;
          if (uniqueColors.length > 0) product.colors = uniqueColors;
        }
        
        this.product = product;
        this.isLoading = false;
        loading.dismiss();
        
        // Auto-select first size/color if available
        if (product.sizes && product.sizes.length > 0) {
          this.selectedSize = product.sizes[0];
        }
        if (product.colors && product.colors.length > 0) {
          this.selectedColor = product.colors[0];
        }

        // Calcular frete automaticamente se usuário logado e tem endereço
        if (this.currentUser && this.userAddress && !this.shippingCalculated) {
          this.calculateShippingForUser();
        }
      },
      error: async (error: any) => {
        loading.dismiss();
        const toast = await this.toastController.create({
          message: 'Erro ao carregar produto',
          duration: 3000,
          color: 'danger'
        });
        toast.present();
        this.router.navigate(['/tabs/home']);
      }
    });
  }

  goToSlide(index: number) {
    this.currentSlide = index;
  }

  selectSize(size: string) {
    this.selectedSize = size;
    this.updateImageBasedOnVariant();
  }

  selectColor(color: string) {
    this.selectedColor = color;
    this.updateImageBasedOnVariant();
  }

  incrementQuantity() {
    const availableStock = this.getAvailableStock();
    if (this.quantity < availableStock) {
      this.quantity++;
    }
  }

  decrementQuantity() {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  toggleFavorite() {
    this.isFavorite = !this.isFavorite;
    // TODO: Implement favorites service
  }

  async addToCart() {
    if (!this.product) return;

    // Check size/color selection
    if (this.product.sizes && this.product.sizes.length > 0 && !this.selectedSize) {
      const toast = await this.toastController.create({
        message: 'Selecione um tamanho',
        duration: 2000,
        color: 'warning'
      });
      toast.present();
      return;
    }

    if (this.product.colors && this.product.colors.length > 0 && !this.selectedColor) {
      const toast = await this.toastController.create({
        message: 'Selecione uma cor',
        duration: 2000,
        color: 'warning'
      });
      toast.present();
      return;
    }

    const cartItem = {
      productId: this.product.id,
      name: this.product.name,
      price: this.product.salePrice || this.product.price,
      image: this.product.images[0],
      quantity: this.quantity,
      stock: this.product.stock,
      size: this.selectedSize || undefined,
      color: this.selectedColor || undefined
    };

    this.cartService.addItem(cartItem);

    const toast = await this.toastController.create({
      message: 'Produto adicionado ao carrinho!',
      duration: 2000,
      color: 'success',
      buttons: [
        {
          text: 'Ver Carrinho',
          handler: () => {
            this.router.navigate(['/tabs/cart']);
          }
        }
      ]
    });
    toast.present();
  }

  async buyNow() {
    if (!this.product) return;

    // Check size/color selection
    if (this.product.sizes && this.product.sizes.length > 0 && !this.selectedSize) {
      const toast = await this.toastController.create({
        message: 'Selecione um tamanho',
        duration: 2000,
        color: 'warning'
      });
      toast.present();
      return;
    }

    if (this.product.colors && this.product.colors.length > 0 && !this.selectedColor) {
      const toast = await this.toastController.create({
        message: 'Selecione uma cor',
        duration: 2000,
        color: 'warning'
      });
      toast.present();
      return;
    }

    const cartItem = {
      productId: this.product.id,
      name: this.product.name,
      price: this.product.salePrice || this.product.price,
      image: this.product.images[0],
      quantity: this.quantity,
      stock: this.product.stock,
      size: this.selectedSize || undefined,
      color: this.selectedColor || undefined
    };

    this.cartService.addItem(cartItem);
    this.router.navigate(['/checkout']);
  }

  share() {
    if (navigator.share && this.product) {
      navigator.share({
        title: this.product.name,
        text: `Confira ${this.product.name} na MYDSHOP!`,
        url: window.location.href
      });
    }
  }

  goBack() {
    this.router.navigate(['/tabs/home']);
  }

  getDiscountPercentage(): number {
    if (!this.product || !this.product.salePrice) return 0;
    return Math.round((1 - this.product.salePrice / this.product.price) * 100);
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  hasSpecifications(): boolean {
    return !!(this.product?.specifications && Object.keys(this.product.specifications).length > 0);
  }

  hasAttributes(): boolean {
    return !!(this.product?.attributes && Object.keys(this.product.attributes).length > 0);
  }

  hasTechnicalSpecs(): boolean {
    return !!(this.product?.technicalSpecs && Object.keys(this.product.technicalSpecs).length > 0);
  }

  hasDimensions(): boolean {
    return !!(this.product?.dimensions && (
      this.product.dimensions.length || 
      this.product.dimensions.width || 
      this.product.dimensions.height || 
      this.product.dimensions.weight
    ));
  }

  getObjectEntries(obj: any): { key: string, value: string }[] {
    if (!obj) return [];
    
    const entries: { key: string, value: string }[] = [];
    
    Object.entries(obj).forEach(([key, value]) => {
      let displayValue = '';
      
      try {
        if (typeof value === 'string') {
          // Tentar parsear strings JSON com escape
          if (value.includes('{"') || value.includes('[{')) {
            try {
              const parsed = JSON.parse(value);
              value = parsed;
            } catch {
              // Se não conseguir parsear, usar como string mesmo
              displayValue = (value as string).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
            }
          } else {
            displayValue = value;
          }
        }
        
        if (typeof value === 'object' && value !== null) {
          if (Array.isArray(value)) {
            // Tratar arrays de objetos
            if (value.length > 0 && typeof value[0] === 'object') {
              const descriptions = value.map((item: any) => {
                if (item.content) return item.content;
                if (item.data) return item.data;
                if (item.name) return item.name;
                if (item.title) return item.title;
                if (item.value) return item.value;
                if (item.description) return item.description;
                return JSON.stringify(item);
              }).filter(desc => desc && desc !== '{}');
              
              displayValue = descriptions.join(' • ');
            } else {
              displayValue = value.join(', ');
            }
          } else if ((value as any).data) {
            displayValue = (value as any).data;
          } else if ((value as any).content) {
            displayValue = (value as any).content;
          } else if ((value as any).moduleList && Array.isArray((value as any).moduleList)) {
            // Tratar casos específicos como moduleList
            const modules = (value as any).moduleList.map((module: any) => {
              if (module.data && module.data.content) {
                return module.data.content;
              }
              return JSON.stringify(module);
            }).filter((content: string) => content && content !== '{}');
            
            displayValue = modules.join(' • ');
          } else {
            displayValue = JSON.stringify(value);
          }
        } else {
          displayValue = String(value || '');
        }
      } catch (error) {
        console.warn('Erro ao processar valor:', error);
        displayValue = String(value || '');
      }
      
      // Limpar caracteres de escape e melhorar formatação
      displayValue = displayValue
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .replace(/\\n/g, ' ')
        .replace(/\\t/g, ' ')
        .trim();
      
      // Formatar nomes das chaves para ficarem mais legíveis
      const displayKey = this.formatKeyName(key);
      const displayVal = this.formatValue(displayValue);
      
      if (displayVal && displayVal !== '{}' && displayVal !== '[]' && displayVal !== '[object Object]') {
        entries.push({ key: displayKey, value: displayVal });
      }
    });
    
    return entries;
  }

  formatKeyName(key: string): string {
    // Dicionário de traduções
    const translations: { [key: string]: string } = {
      'mobileDetail': 'Detalhes Móveis',
      'mobile_detail': 'Detalhes Móveis', 
      'subject': 'Assunto',
      'evaluationCount': 'Avaliações',
      'evaluation_count': 'Avaliações',
      'salesCount': 'Vendas',
      'sales_count': 'Vendas',
      'productStatusType': 'Status do Produto',
      'product_status_type': 'Status do Produto',
      'avgEvaluationRating': 'Nota Média',
      'avg_evaluation_rating': 'Nota Média',
      'currencyCode': 'Moeda',
      'currency_code': 'Moeda',
      'categoryId': 'Categoria',
      'category_id': 'Categoria',
      'productId': 'ID do Produto',
      'product_id': 'ID do Produto',
      'detail': 'Detalhes',
      'aeItemProperty': 'Propriedades do Item',
      'ae_item_property': 'Propriedades do Item',
      'brand': 'Marca',
      'model': 'Modelo',
      'color': 'Cor',
      'size': 'Tamanho',
      'weight': 'Peso',
      'dimensions': 'Dimensões',
      'material': 'Material',
      'warranty': 'Garantia',
      'battery': 'Bateria',
      'connectivity': 'Conectividade',
      'features': 'Características',
      'compatibility': 'Compatibilidade',
      'package': 'Embalagem',
      'voltage': 'Voltagem',
      'power': 'Potência',
      'frequency': 'Frequência',
      'capacity': 'Capacidade',
      'resolution': 'Resolução',
      'display': 'Display',
      'screen': 'Tela',
      'processor': 'Processador',
      'memory': 'Memória',
      'storage': 'Armazenamento'
    };

    // Verificar tradução direta
    const lowerKey = key.toLowerCase();
    if (translations[lowerKey]) {
      return translations[lowerKey];
    }

    // Verificar tradução exata
    if (translations[key]) {
      return translations[key];
    }

    // Converter snake_case e camelCase para títulos legíveis
    let formatted = key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .trim();

    return formatted;
  }

  formatValue(value: string): string {
    // Dicionário de traduções para valores
    const valueTranslations: { [key: string]: string } = {
      'onSelling': 'À Venda',
      'inStock': 'Em Estoque',
      'outOfStock': 'Sem Estoque',
      'discontinued': 'Descontinuado',
      'BRL': 'Real (R$)',
      'USD': 'Dólar ($)',
      'EUR': 'Euro (€)',
      'CNY': 'Yuan (¥)',
      'true': 'Sim',
      'false': 'Não',
      'yes': 'Sim',
      'no': 'Não',
      'enabled': 'Habilitado',
      'disabled': 'Desabilitado',
      'active': 'Ativo',
      'inactive': 'Inativo'
    };

    // Detectar e tratar conteúdo HTML
    if (value && (value.includes('<div') || value.includes('<span') || value.includes('<p'))) {
      // Extrair texto de tags HTML comuns
      let cleanText = value
        .replace(/<[^>]*>/g, ' ')  // Remove todas as tags HTML
        .replace(/\s+/g, ' ')      // Remove espaços extras
        .trim();
      
      // Se o texto resultante for muito longo, truncar
      if (cleanText.length > 300) {
        cleanText = cleanText.substring(0, 300) + '...';
      }
      
      return cleanText || 'Conteúdo HTML disponível';
    }

    return valueTranslations[value] || value;
  }

  hasVariants(): boolean {
    return !!(this.product?.variants && Array.isArray(this.product.variants) && this.product.variants.length > 0);
  }

  hasVariantsWithPrice(): boolean {
    return !!(this.product?.variants && Array.isArray(this.product.variants) && 
      this.product.variants.some((v: any) => v.price));
  }

  getAvailableStock(): number {
    if (!this.hasVariants()) {
      return this.product?.stock || 0;
    }

    const selectedVariant = this.product?.variants?.find((v: any) => {
      return (!this.selectedSize || v.size === this.selectedSize) &&
             (!this.selectedColor || v.color === this.selectedColor);
    });

    return selectedVariant?.stock || 0;
  }

  getVariantPrice(): number {
    if (!this.hasVariants()) {
      return this.product?.salePrice || this.product?.price || 0;
    }

    const selectedVariant = this.product?.variants?.find((v: any) => {
      return (!this.selectedSize || v.size === this.selectedSize) &&
             (!this.selectedColor || v.color === this.selectedColor);
    });

    return selectedVariant?.price || this.product?.salePrice || this.product?.price || 0;
  }

  updateImageBasedOnVariant() {
    if (!this.hasVariants() || !this.selectedColor) return;

    const selectedVariant = this.product?.variants?.find((v: any) => 
      v.color === this.selectedColor && v.imageIndex !== undefined
    );

    if (selectedVariant && selectedVariant.imageIndex !== undefined) {
      this.currentSlide = selectedVariant.imageIndex;
    }
  }

  selectVariant(variant: any) {
    if (variant.stock === 0) return; // Don't select out-of-stock variants
    
    this.selectedSize = variant.size || null;
    this.selectedColor = variant.color || null;
    this.updateImageBasedOnVariant();
  }

  // === MÉTODOS PARA FRETE ===
  
  /**
   * Valida formato do CEP
   */
  isValidCep(cep: string): boolean {
    if (!cep) return false;
    const cleanCep = cep.replace(/\D/g, '');
    return cleanCep.length === 8;
  }

  /**
   * Formata CEP durante a digitação
   */
  formatCep(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length > 5) {
      value = value.substring(0, 5) + '-' + value.substring(5, 8);
    }
    this.shippingCep = value;
  }

  /**
   * Calcula frete para usuário logado
   */
  async calculateShippingForUser() {
    if (!this.userAddress) return;
    
    this.isCalculatingShipping = true;
    this.shippingError = '';
    this.shippingResult = null;

    try {
      const cartValue = this.getVariantPrice() * this.quantity;
      const weight = this.product?.weight || 0.5;

      const response = await this.apiService.post<ShippingResult>('/shipping/quote', {
        cep: this.userAddress.zipCode,
        cartValue,
        weight
      }).toPromise();

      if (response) {
        this.shippingResult = response;
        this.shippingCalculated = true;
      }

    } catch (error: any) {
      this.shippingError = error.error?.message || 'Erro ao calcular frete';
    } finally {
      this.isCalculatingShipping = false;
    }
  }

  /**
   * Calcula frete com CEP manual
   */
  async calculateShipping() {
    if (!this.isValidCep(this.shippingCep)) return;

    this.isCalculatingShipping = true;
    this.shippingError = '';
    this.shippingResult = null;

    try {
      const cartValue = this.getVariantPrice() * this.quantity;
      const weight = this.product?.weight || 0.5;
      const cleanCep = this.shippingCep.replace(/\D/g, '');

      const response = await this.apiService.post<ShippingResult>('/shipping/quote', {
        cep: cleanCep,
        cartValue,
        weight
      }).toPromise();

      if (response) {
        this.shippingResult = response;
        this.shippingCalculated = true;
      }

    } catch (error: any) {
      this.shippingError = error.error?.message || 'Erro ao calcular frete';
    } finally {
      this.isCalculatingShipping = false;
    }
  }
}
