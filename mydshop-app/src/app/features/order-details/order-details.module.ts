import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { OrderDetailsPage } from './order-details.page';
import { ImageUrlPipe } from '../../shared/pipes/image-url.pipe';

const routes: Routes = [
  {
    path: '',
    component: OrderDetailsPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    ImageUrlPipe
  ],
  declarations: [OrderDetailsPage]
})
export class OrderDetailsPageModule {}
