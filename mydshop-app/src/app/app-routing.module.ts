import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

const routes: Routes = [
  // Página inicial
  {
    path: '',
    redirectTo: 'tabs/home',
    pathMatch: 'full'
  },
  
  // Tabs principais (Home, Categorias, Carrinho, Perfil)
  {
    path: 'tabs',
    loadChildren: () => import('./features/tabs/tabs.module').then(m => m.TabsPageModule)
  },
  
  // Autenticação
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule)
  },
  
  // Produto detalhes
  {
    path: 'product/:id',
    loadChildren: () => import('./features/product/product.module').then(m => m.ProductPageModule)
  },
  
  // Busca
  {
    path: 'search',
    loadChildren: () => import('./features/search/search.module').then(m => m.SearchPageModule)
  },
  
  // Checkout (requer autenticação)
  {
    path: 'checkout',
    loadChildren: () => import('./features/checkout/checkout.module').then(m => m.CheckoutPageModule),
    canActivate: [AuthGuard]
  },
  
  // Pedidos (requer autenticação)
  {
    path: 'orders',
    loadChildren: () => import('./features/orders/orders.module').then(m => m.OrdersPageModule),
    canActivate: [AuthGuard]
  },
  
  // Fallback
  {
    path: '**',
    redirectTo: 'tabs/home'
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
