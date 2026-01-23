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
  
  // Detalhes do pedido (requer autenticação)
  {
    path: 'order-details/:id',
    loadChildren: () => import('./features/order-details/order-details.module').then(m => m.OrderDetailsPageModule),
    canActivate: [AuthGuard]
  },
  
  // Sucesso do pedido / Pagamento
  {
    path: 'order-success/:id',
    loadChildren: () => import('./features/order-success/order-success.module').then(m => m.OrderSuccessPageModule),
    canActivate: [AuthGuard]
  },
  
  // Página de pagamento (escolher método)
  {
    path: 'payment/:id',
    loadChildren: () => import('./features/payment/payment.module').then(m => m.PaymentPageModule),
    canActivate: [AuthGuard]
  },
  
  // Editar perfil (requer autenticação)
  {
    path: 'profile/edit',
    loadChildren: () => import('./features/profile/edit/edit-profile.module').then(m => m.EditProfilePageModule),
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
