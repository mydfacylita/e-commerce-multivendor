import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { ProfilePage } from './profile.page';
import { ImageUrlPipe } from '../../shared/pipes/image-url.pipe';

const routes: Routes = [
  { path: '', component: ProfilePage },
  { 
    path: 'edit', 
    loadChildren: () => import('./edit/edit-profile.module').then(m => m.EditProfilePageModule) 
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
  declarations: [ProfilePage]
})
export class ProfilePageModule {}
