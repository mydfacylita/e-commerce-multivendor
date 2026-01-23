import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { CategoriesPage } from './categories.page';
import { ImageUrlPipe } from '../../shared/pipes/image-url.pipe';

const routes: Routes = [
  { path: '', component: CategoriesPage }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    ImageUrlPipe
  ],
  declarations: [CategoriesPage]
})
export class CategoriesPageModule {}
