/**
 * 🔌 API SERVICE
 * 
 * Serviço central para comunicação com o backend MYDSHOP.
 * Gerencia requisições HTTP, tokens e tratamento de erros.
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, from } from 'rxjs';
import { catchError, retry, switchMap, finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { StorageService } from './storage.service';
import { getApiUrl, logApiConfig } from '../config/api.config';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  total?: number;
  page?: number;
  totalPages?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly isLoading = new BehaviorSubject<boolean>(false);
  private apiUrl: string;
  
  // Observable para componentes que querem mostrar loading
  public isLoading$ = this.isLoading.asObservable();

  constructor(
    private http: HttpClient,
    private storage: StorageService
  ) {
    // Configuração centralizada - definida uma vez
    this.apiUrl = getApiUrl();
    logApiConfig();
  }

  /**
   * Retorna a URL base da API
   */
  private getBaseUrl(): string {
    return this.apiUrl;
  }

  /**
   * Cria headers com token de autenticação e API Key
   */
  private async getHeaders(): Promise<HttpHeaders> {
    const token = await this.storage.get(environment.auth.tokenKey);
    console.log('🔐 API Headers - Token:', token ? 'Presente' : 'Ausente');
    
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-api-key': environment.apiKey
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  /**
   * Trata erros de requisição
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Ocorreu um erro inesperado';

    if (error.error instanceof ErrorEvent) {
      // Erro client-side
      errorMessage = error.error.message;
    } else {
      // Erro server-side
      switch (error.status) {
        case 0:
          errorMessage = 'Sem conexão com o servidor. Verifique sua internet.';
          break;
        case 400:
          errorMessage = error.error?.message || 'Dados inválidos';
          break;
        case 401:
          errorMessage = 'Sessão expirada. Faça login novamente.';
          // Limpar token e redirecionar para login
          this.storage.remove(environment.auth.tokenKey);
          break;
        case 403:
          errorMessage = 'Você não tem permissão para esta ação';
          break;
        case 404:
          errorMessage = 'Recurso não encontrado';
          break;
        case 429:
          errorMessage = 'Muitas requisições. Aguarde um momento.';
          break;
        case 500:
          errorMessage = 'Erro interno do servidor';
          break;
        case 503:
          errorMessage = 'Serviço temporariamente indisponível';
          break;
        default:
          errorMessage = error.error?.message || error.error?.error || errorMessage;
      }
    }

    console.error('[API Error]', error.status, errorMessage);
    return throwError(() => ({ message: errorMessage, status: error.status }));
  }

  /**
   * GET request
   */
  get<T>(endpoint: string, params?: any): Observable<T> {
    this.isLoading.next(true);
    
    return from(this.getHeaders()).pipe(
      switchMap(headers => {
        let httpParams = new HttpParams();
        if (params) {
          Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
              httpParams = httpParams.set(key, params[key].toString());
            }
          });
        }

        return this.http.get<T>(`${this.getBaseUrl()}${endpoint}`, { headers, params: httpParams });
      }),
      retry(1),
      finalize(() => this.isLoading.next(false)),
      catchError((error) => this.handleError(error))
    );
  }

  /**
   * POST request
   */
  post<T>(endpoint: string, data: any): Observable<T> {
    this.isLoading.next(true);

    return from(this.getHeaders()).pipe(
      switchMap(headers => {
        return this.http.post<T>(`${this.getBaseUrl()}${endpoint}`, data, { headers });
      }),
      finalize(() => this.isLoading.next(false)),
      catchError((error) => this.handleError(error))
    );
  }

  /**
   * PUT request
   */
  put<T>(endpoint: string, data: any): Observable<T> {
    this.isLoading.next(true);

    return from(this.getHeaders()).pipe(
      switchMap(headers => {
        return this.http.put<T>(`${this.getBaseUrl()}${endpoint}`, data, { headers });
      }),
      finalize(() => this.isLoading.next(false)),
      catchError((error) => this.handleError(error))
    );
  }

  /**
   * PATCH request
   */
  patch<T>(endpoint: string, data: any): Observable<T> {
    this.isLoading.next(true);

    return from(this.getHeaders()).pipe(
      switchMap(headers => {
        return this.http.patch<T>(`${this.getBaseUrl()}${endpoint}`, data, { headers });
      }),
      finalize(() => this.isLoading.next(false)),
      catchError((error) => this.handleError(error))
    );
  }

  /**
   * DELETE request
   */
  delete<T>(endpoint: string): Observable<T> {
    this.isLoading.next(true);

    return from(this.getHeaders()).pipe(
      switchMap(headers => {
        return this.http.delete<T>(`${this.getBaseUrl()}${endpoint}`, { headers });
      }),
      finalize(() => this.isLoading.next(false)),
      catchError((error) => this.handleError(error))
    );
  }

  /**
   * GET request público (sem autenticação)
   * Útil para verificar status de pagamento, etc.
   */
  getPublic<T>(endpoint: string, params?: any): Observable<T> {
    this.isLoading.next(true);
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-api-key': environment.apiKey
    });

    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }

    return this.http.get<T>(`${this.getBaseUrl()}${endpoint}`, { headers, params: httpParams }).pipe(
      retry(1),
      finalize(() => this.isLoading.next(false)),
      catchError((error) => this.handleError(error))
    );
  }

  /**
   * Upload de arquivo
   */
  upload<T>(endpoint: string, file: File, fieldName: string = 'file'): Observable<T> {
    this.isLoading.next(true);

    return from(this.storage.get(environment.auth.tokenKey)).pipe(
      switchMap(token => {
        let headers = new HttpHeaders();
        if (token) {
          headers = headers.set('Authorization', `Bearer ${token}`);
        }

        const formData = new FormData();
        formData.append(fieldName, file, file.name);

        return this.http.post<T>(`${this.getBaseUrl()}${endpoint}`, formData, { headers });
      }),
      finalize(() => this.isLoading.next(false)),
      catchError((error) => this.handleError(error))
    );
  }
}
