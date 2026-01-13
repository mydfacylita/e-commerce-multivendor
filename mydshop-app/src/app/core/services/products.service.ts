/**
 * 📦 PRODUCTS SERVICE
 * 
 * Serviço para busca e listagem de produtos.
 */

import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  salePrice?: number;
  comparePrice?: number;
  images: string[];
  stock: number;
  featured: boolean;
  categoryId: string;
  category?: string;
  brand?: string;
  model?: string;
  gtin?: string;
  mpn?: string;
  sizes?: string[];
  colors?: string[];
  specifications?: Record<string, string>;
  attributes?: Record<string, string>;
  variants?: any[];
  technicalSpecs?: Record<string, string>;
  sizeType?: string;
  sizeCategory?: string;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
    weightWithPackage?: number;
  };
  weight?: number;
  rating?: number;
  reviewCount?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: string;
  children?: Category[];
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ProductFilters {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'popular';
  page?: number;
  limit?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductsService {

  constructor(private api: ApiService) {}

  /**
   * Busca produtos paginados com filtros
   */
  getProducts(filters: ProductFilters = {}) {
    const params: any = {
      page: filters.page || 1,
      limit: filters.limit || 12
    };

    if (filters.category) params.category = filters.category;
    if (filters.search) params.search = filters.search;
    if (filters.featured) params.featured = 'true';
    if (filters.minPrice) params.minPrice = filters.minPrice;
    if (filters.maxPrice) params.maxPrice = filters.maxPrice;
    if (filters.sortBy) params.sortBy = filters.sortBy;

    return this.api.get<ProductsResponse>('/products/paginated', params);
  }

  /**
   * Busca produtos em destaque
   */
  getFeaturedProducts(limit: number = 8) {
    return this.api.get<ProductsResponse>('/products/paginated', { featured: 'true', limit });
  }

  /**
   * Busca produto por ID ou slug
   * Usa rota pública /api/products/[id] - NÃO expõe dados sensíveis
   */
  getProduct(idOrSlug: string) {
    return this.api.get<Product>(`/products/${idOrSlug}`);
  }

  /**
   * Busca produtos por texto com filtros
   */
  searchProducts(params: ProductFilters) {
    const queryParams: any = {
      page: params.page || 1,
      limit: params.limit || 20
    };

    if (params.search) queryParams.q = params.search;
    if (params.sortBy) queryParams.sortBy = params.sortBy;
    if (params.minPrice) queryParams.minPrice = params.minPrice;
    if (params.maxPrice) queryParams.maxPrice = params.maxPrice;

    return this.api.get<ProductsResponse>('/products/search', queryParams);
  }

  /**
   * Busca todas as categorias
   */
  getCategories() {
    return this.api.get<Category[]>('/categories');
  }

  /**
   * Busca produtos de uma categoria
   */
  getProductsByCategory(categoryId: string, page: number = 1) {
    return this.getProducts({ category: categoryId, page });
  }

  /**
   * Busca produtos relacionados
   */
  getRelatedProducts(productId: string, limit: number = 4) {
    return this.api.get<{ products: Product[] }>(`/products/${productId}/related`, { limit });
  }
}
