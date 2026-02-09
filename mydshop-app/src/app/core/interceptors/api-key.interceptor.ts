/**
 * 🔒 HTTP Interceptor para adicionar API Key
 * 
 * Adiciona automaticamente o header 'x-api-key' em todas as requisições
 */

import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable()
export class ApiKeyInterceptor implements HttpInterceptor {

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Adicionar API Key para requisições à nossa API (local ou produção)
    const isApiRequest = 
      request.url.startsWith('/api') || 
      request.url.includes('localhost:3000') ||
      request.url.includes('mydshop.com.br/api');
      
    if (isApiRequest) {
      request = request.clone({
        setHeaders: {
          'x-api-key': environment.apiKey
        }
      });
    }

    return next.handle(request);
  }
}
