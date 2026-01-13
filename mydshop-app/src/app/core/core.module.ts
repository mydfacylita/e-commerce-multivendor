/**
 * 🔧 CORE MODULE
 * 
 * Módulo que contém todos os serviços e guards core do app.
 * Importado apenas uma vez no AppModule.
 */

import { NgModule, Optional, SkipSelf } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

// Services
import { ApiService } from './services/api.service';
import { AuthService } from './services/auth.service';
import { StorageService } from './services/storage.service';
import { CartService } from './services/cart.service';
import { ProductsService } from './services/products.service';
import { AppConfigService } from './services/app-config.service';

// Guards
import { AuthGuard } from './guards/auth.guard';

@NgModule({
  imports: [
    CommonModule,
    HttpClientModule
  ],
  providers: [
    ApiService,
    AuthService,
    StorageService,
    CartService,
    ProductsService,
    AppConfigService,
    AuthGuard
  ]
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    if (parentModule) {
      throw new Error('CoreModule já foi carregado. Importe apenas no AppModule.');
    }
  }
}
