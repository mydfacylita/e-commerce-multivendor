import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { CartPage } from './cart.page';
import { ImageUrlPipe } from '../../shared/pipes/image-url.pipe';

const routes: Routes = [
  { path: '', component: CartPage }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    ImageUrlPipe
  ],
  declarations: [CartPage]
})
export class CartPageModule {}
