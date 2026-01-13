import { Component } from '@angular/core';
import { BenefitItem } from '../shared/components/benefits-bar/benefits-bar.component';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {
  // Exemplo de customização dos benefícios se necessário
  customBenefits: BenefitItem[] = [
    { icon: 'car-outline', text: 'Entrega rápida em todo Brasil' },
    { icon: 'shield-checkmark-outline', text: 'Compra 100% protegida' },
    { icon: 'card-outline', text: 'Parcele em até 12x sem juros' }
  ];

  constructor() {}

}
