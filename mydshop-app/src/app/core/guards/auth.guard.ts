/**
 * 🔒 AUTH GUARD
 * 
 * Guard para proteger rotas que requerem autenticação.
 * Aguarda inicialização do AuthService antes de verificar.
 */

import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean> {
    // 🔐 Aguardar inicialização do storage primeiro
    await this.authService.waitForInit();
    
    const isAuthenticated = await this.authService.checkAuth();
    console.log('🔒 AuthGuard:', state.url, '- Autenticado:', isAuthenticated);

    if (!isAuthenticated) {
      // Salvar URL para redirect após login
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: state.url }
      });
      return false;
    }

    return true;
  }
}
