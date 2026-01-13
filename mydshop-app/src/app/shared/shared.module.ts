import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

import { BenefitsBarComponent } from './components/benefits-bar/benefits-bar.component';

@NgModule({
  declarations: [
    BenefitsBarComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule
  ],
  exports: [
    BenefitsBarComponent,
    CommonModule,
    IonicModule,
    FormsModule
  ]
})
export class SharedModule { }