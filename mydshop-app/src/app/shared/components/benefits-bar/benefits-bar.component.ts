import { Component, Input } from '@angular/core';

export interface BenefitItem {
  icon: string;
  text: string;
}

@Component({
  selector: 'app-benefits-bar',
  templateUrl: './benefits-bar.component.html',
  styleUrls: ['./benefits-bar.component.scss'],
  standalone: false
})
export class BenefitsBarComponent {
  @Input() benefits: BenefitItem[] = [
    { icon: 'car-outline', text: 'Frete grátis acima de R$ 99' },
    { icon: 'shield-checkmark-outline', text: 'Compra rápida & segura' },
    { icon: 'thumbs-up-outline', text: 'Satisfação garantida' }
  ];

  @Input() showAnimation: boolean = true;
}