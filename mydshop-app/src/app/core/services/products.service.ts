/**
 * 📦 PRODUCTS SERVICE
 * 
 * Serviço para busca e listagem de produtos.
 */

import { Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { getImageUrl, getImageUrls } from '../config/api.config';

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  salePrice?: number;
  comparePrice?: number;
  compareAtPrice?: number; // Alias para comparePrice
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
   * Processa URLs de imagens de um produto
   */
  private processProductImages(product: Product): Product {
    return {
      ...product,
      images: getImageUrls(product.images)
    };
  }

  /**
   * Processa URLs de imagens de múltiplos produtos
   */
  private processProductsImages(products: Product[]): Product[] {
    return products.map(p => this.processProductImages(p));
  }

  /**
   * Busca produtos paginados com filtros
   */
  getProducts(filters: ProductFilters = {}): Observable<ProductsResponse> {
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

    return this.api.get<ProductsResponse>('/products/paginated', params).pipe(
      map(response => ({
        ...response,
        products: this.processProductsImages(response.products)
      }))
    );
  }

  /**
   * Busca produtos em destaque
   */
  getFeaturedProducts(limit: number = 8): Observable<ProductsResponse> {
    return this.api.get<ProductsResponse>('/products/paginated', { featured: 'true', limit }).pipe(
      map(response => ({
        ...response,
        products: this.processProductsImages(response.products)
      }))
    );
  }

  /**
   * Busca produto por ID ou slug
   * Usa rota pública /api/products/[id] - NÃO expõe dados sensíveis
   */
  getProduct(idOrSlug: string): Observable<Product> {
    return this.api.get<Product>(`/products/${idOrSlug}`).pipe(
      map(product => this.processProductImages(product))
    );
  }

  /**
   * Busca produtos por texto com filtros
   */
  searchProducts(params: ProductFilters): Observable<ProductsResponse> {
    const queryParams: any = {
      page: params.page || 1,
      limit: params.limit || 20
    };

    if (params.search) queryParams.q = params.search;
    if (params.sortBy) queryParams.sortBy = params.sortBy;
    if (params.minPrice) queryParams.minPrice = params.minPrice;
    if (params.maxPrice) queryParams.maxPrice = params.maxPrice;

    return this.api.get<ProductsResponse>('/products/search', queryParams).pipe(
      map(response => ({
        ...response,
        products: this.processProductsImages(response.products)
      }))
    );
  }

  /**
   * Busca todas as categorias
   */
  getCategories(): Observable<Category[]> {
    return this.api.get<Category[]>('/categories').pipe(
      map(categories => categories.map(cat => ({
        ...cat,
        image: getImageUrl(cat.image)
      })))
    );
  }

  /**
   * Busca produtos de uma categoria
   */
  getProductsByCategory(categoryId: string, page: number = 1): Observable<ProductsResponse> {
    return this.getProducts({ category: categoryId, page });
  }

  /**
   * Busca produtos relacionados
   */
  getRelatedProducts(productId: string, limit: number = 4): Observable<{ products: Product[] }> {
    return this.api.get<{ products: Product[] }>(`/products/${productId}/related`, { limit }).pipe(
      map(response => ({
        ...response,
        products: this.processProductsImages(response.products)
      }))
    );
  }

  /**
   * Busca avaliações de um produto
   */
  getReviews(productId: string, page: number = 1, sortBy: string = 'recent') {
    return this.api.get<ReviewsResponse>(`/products/${productId}/reviews`, { page, sortBy });
  }

  /**
   * Busca avaliações de um produto (alias para compatibilidade)
   */
  getProductReviews(productId: string, page: number = 1, limit: number = 5): Observable<ReviewsResponse> {
    return this.api.get<ReviewsResponse>(`/products/${productId}/reviews`, { page, limit });
  }

  /**
   * Busca múltiplos produtos por IDs
   */
  getProductsByIds(ids: string[]): Observable<Product[]> {
    if (ids.length === 0) return new Observable(obs => { obs.next([]); obs.complete(); });
    
    // Busca cada produto individualmente e combina
    const requests = ids.slice(0, 10).map(id => 
      this.api.get<Product>(`/products/${id}`).pipe(
        map(product => this.processProductImages(product))
      )
    );
    
    return new Observable<Product[]>(observer => {
      Promise.all(requests.map(r => firstValueFrom(r).catch(() => null)))
        .then(products => {
          observer.next(products.filter(p => p !== null) as Product[]);
          observer.complete();
        })
        .catch(err => observer.error(err));
    });
  }

  /**
   * Envia uma avaliação
   */
  submitReview(productId: string, review: ReviewSubmit) {
    return this.api.post<{ message: string }>(`/products/${productId}/reviews`, review);
  }

  /**
   * Marca avaliação como útil
   */
  markReviewHelpful(productId: string, reviewId: string, helpful: boolean = true) {
    return this.api.post<{ message: string; helpfulCount: number }>(`/products/${productId}/reviews/${reviewId}/helpful`, { helpful });
  }

  /**
   * Busca perguntas de um produto
   */
  getQuestions(productId: string, page: number = 1, answered?: boolean) {
    const params: any = { page };
    if (answered !== undefined) params.answered = answered;
    return this.api.get<QuestionsResponse>(`/products/${productId}/questions`, params);
  }

  /**
   * Envia uma pergunta
   */
  submitQuestion(productId: string, question: string) {
    return this.api.post<{ message: string }>(`/products/${productId}/questions`, { question });
  }
}

// Interfaces para Reviews
export interface Review {
  id: string;
  rating: number;
  title?: string;
  comment?: string;
  pros?: string;
  cons?: string;
  images?: string[];
  isVerified: boolean;
  helpfulCount: number;
  sellerReply?: string;
  sellerReplyAt?: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    image?: string;
  };
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export interface ReviewsResponse {
  reviews: Review[];
  stats: ReviewStats;
  total: number;
  page: number;
  totalPages: number;
}

export interface ReviewSubmit {
  rating: number;
  title?: string;
  comment?: string;
  pros?: string;
  cons?: string;
}

// Interfaces para Questions
export interface Question {
  id: string;
  question: string;
  answer?: string;
  answeredAt?: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    image?: string;
  };
}

export interface QuestionStats {
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
}

export interface QuestionsResponse {
  questions: Question[];
  stats: QuestionStats;
  total: number;
  page: number;
  totalPages: number;
}
