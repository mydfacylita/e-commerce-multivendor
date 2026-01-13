import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { CartService, CartItem } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { AppConfigService } from '../../core/services/app-config.service';

interface ShippingOption {
  id: string;
  name: string;
  price: number;
  days: number;
}

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.page.html',
  styleUrls: ['./checkout.page.scss'],
  standalone: false
})
export class CheckoutPage implements OnInit {
  currentStep = 1;
  addressForm: FormGroup;
  paymentForm: FormGroup;
  
  cartItems: CartItem[] = [];
  subtotal = 0;
  shipping = 0;
  discount = 0;
  total = 0;
  
  // Endereços do usuário
  userAddresses: Array<{
    id: string;
    label?: string;
    street: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city: string;
    state: string;
    zipCode: string;
    isDefault: boolean;
  }> = [];
  selectedAddressId: string | null = null;
  showAddressForm = false;
  isLoadingAddresses = false;
  
  shippingOptions: ShippingOption[] = [];
  selectedShipping: ShippingOption | null = null;
  
  paymentMethods: Array<{ id: string; name: string; icon: string; discount: number }> = [];
  selectedPayment: string | null = null;
  
  // Descontos de pagamento (vindos das configurações do admin)
  pixDiscount = 0;
  paymentDiscount = 0;
  
  installments = [
    { value: 1, label: '1x sem juros' },
    { value: 2, label: '2x sem juros' },
    { value: 3, label: '3x sem juros' },
    { value: 6, label: '6x sem juros' },
    { value: 12, label: '12x com juros' }
  ];
  
  isLoadingShipping = false;
  isProcessing = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private cartService: CartService,
    private authService: AuthService,
    private apiService: ApiService,
    private appConfigService: AppConfigService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    this.addressForm = this.formBuilder.group({
      zipCode: ['', [Validators.required, Validators.pattern(/^\d{5}-?\d{3}$/)]],
      street: ['', [Validators.required]],
      number: ['', [Validators.required]],
      complement: [''],
      neighborhood: ['', [Validators.required]],
      city: ['', [Validators.required]],
      state: ['', [Validators.required, Validators.maxLength(2)]]
    });
    
    this.paymentForm = this.formBuilder.group({
      cardNumber: [''],
      cardName: [''],
      cardExpiry: [''],
      cardCvv: [''],
      installments: [1],
      cpf: ['', [Validators.required]]
    });
  }

  ngOnInit() {
    this.loadPaymentConfig();
    this.loadCart();
    this.loadUserAddresses();
  }
  
  /**
   * Carrega configurações de pagamento do admin
   */
  loadPaymentConfig() {
    // Subscrever ao Observable para receber config atualizada
    this.appConfigService.config$.subscribe(config => {
      // Pegar descontos configurados no admin
      this.pixDiscount = config.ecommerce?.pixDiscount ?? 0;
      
      // Montar métodos de pagamento com descontos dinâmicos
      this.paymentMethods = [
        { id: 'pix', name: 'PIX', icon: 'qr-code-outline', discount: this.pixDiscount },
        { id: 'boleto', name: 'Boleto Bancário', icon: 'barcode-outline', discount: 0 },
        { id: 'credit', name: 'Cartão de Crédito', icon: 'card-outline', discount: 0 },
        { id: 'debit', name: 'Cartão de Débito', icon: 'card-outline', discount: 0 }
      ];
      
      console.log('💳 Configurações de pagamento atualizadas:', {
        pixDiscount: this.pixDiscount,
        source: config.version ? 'servidor' : 'cache'
      });
      
      // Recalcular total se já tiver método selecionado
      if (this.selectedPayment) {
        this.updateTotal();
      }
    });
    
    // Forçar reload das configurações do servidor
    this.appConfigService.loadConfig().subscribe();
  }

  loadCart() {
    this.cartService.cart$.subscribe(cart => {
      this.cartItems = cart.items;
      this.subtotal = cart.subtotal;
      this.discount = cart.discount;
      this.updateTotal();
    });
    
    if (this.cartItems.length === 0) {
      this.router.navigate(['/tabs/cart']);
    }
  }

  /**
   * Carrega todos os endereços do usuário
   */
  async loadUserAddresses() {
    this.isLoadingAddresses = true;
    
    try {
      interface AddressResponse {
        addresses: Array<{
          id: string;
          label?: string;
          street: string;
          number?: string;
          complement?: string;
          neighborhood?: string;
          city: string;
          state: string;
          zipCode: string;
          isDefault: boolean;
        }>;
        defaultAddress: {
          id: string;
          label?: string;
          street: string;
          number?: string;
          complement?: string;
          neighborhood?: string;
          city: string;
          state: string;
          zipCode: string;
          isDefault: boolean;
        } | null;
      }
      
      const response = await firstValueFrom(
        this.apiService.get<AddressResponse>('/user/address')
      ) as AddressResponse;
      
      console.log('📍 Endereços carregados:', response);
      
      this.userAddresses = response.addresses || [];
      
      if (this.userAddresses.length > 0) {
        // Selecionar o endereço padrão ou o primeiro
        const defaultAddr = this.userAddresses.find(a => a.isDefault) || this.userAddresses[0];
        this.selectedAddressId = defaultAddr.id;
        this.showAddressForm = false;
        
        console.log('📍 Endereço selecionado:', defaultAddr.id);
        
        // Calcular frete do endereço selecionado
        if (defaultAddr.zipCode) {
          await this.loadShippingOptions(defaultAddr.zipCode);
        }
      } else {
        // Sem endereços, mostrar formulário
        this.showAddressForm = true;
      }
    } catch (error) {
      console.log('Erro ao buscar endereços, mostrando formulário');
      this.showAddressForm = true;
    } finally {
      this.isLoadingAddresses = false;
    }
  }

  /**
   * Seleciona um endereço da lista
   */
  async selectAddress(addressId: string) {
    this.selectedAddressId = addressId;
    const address = this.userAddresses.find(a => a.id === addressId);
    
    if (address?.zipCode) {
      await this.loadShippingOptions(address.zipCode);
    }
  }

  /**
   * Retorna o endereço selecionado
   */
  getSelectedAddress() {
    return this.userAddresses.find(a => a.id === this.selectedAddressId);
  }

  /**
   * Verifica se pode prosseguir da etapa de endereço
   */
  canProceedFromAddress(): boolean {
    // Se está mostrando formulário, precisa estar válido
    if (this.showAddressForm) {
      return this.addressForm.valid;
    }
    // Se tem lista de endereços, precisa ter um selecionado
    return !!this.selectedAddressId;
  }

  /**
   * Mostra formulário para novo endereço
   */
  showNewAddressForm() {
    this.showAddressForm = true;
    this.addressForm.reset();
  }

  /**
   * Cancela cadastro de novo endereço
   */
  cancelNewAddress() {
    if (this.userAddresses.length > 0) {
      this.showAddressForm = false;
    }
  }

  /**
   * Salva novo endereço
   */
  async saveNewAddress() {
    if (this.addressForm.invalid) {
      const toast = await this.toastController.create({
        message: 'Preencha todos os campos obrigatórios',
        duration: 2000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Salvando endereço...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const formData = this.addressForm.value;
      
      interface SaveAddressResponse {
        success: boolean;
        address: {
          id: string;
          label?: string;
          street: string;
          number?: string;
          complement?: string;
          neighborhood?: string;
          city: string;
          state: string;
          zipCode: string;
          isDefault: boolean;
        };
      }
      
      const response = await firstValueFrom(
        this.apiService.post<SaveAddressResponse>('/user/address', {
          street: formData.street,
          number: formData.number,
          complement: formData.complement,
          neighborhood: formData.neighborhood,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          isDefault: this.userAddresses.length === 0
        })
      ) as SaveAddressResponse;

      if (response.success) {
        // Adicionar à lista
        this.userAddresses.push(response.address);
        this.selectedAddressId = response.address.id;
        this.showAddressForm = false;
        
        const toast = await this.toastController.create({
          message: 'Endereço salvo com sucesso!',
          duration: 2000,
          color: 'success'
        });
        await toast.present();
      }
    } catch (error) {
      console.error('Erro ao salvar endereço:', error);
      const toast = await this.toastController.create({
        message: 'Erro ao salvar endereço',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      loading.dismiss();
    }
  }

  /**
   * Formata CEP enquanto digita e busca automaticamente quando completo
   */
  onZipCodeInput(event: any) {
    let value = event.target.value?.replace(/\D/g, '') || '';
    
    // Formatar como 00000-000
    if (value.length > 5) {
      value = value.substring(0, 5) + '-' + value.substring(5, 8);
    }
    
    // Atualizar valor formatado
    this.addressForm.patchValue({ zipCode: value }, { emitEvent: false });
    
    // Buscar automaticamente quando CEP completo (8 dígitos)
    const cleanZip = value.replace(/\D/g, '');
    if (cleanZip.length === 8) {
      this.searchZipCode();
    }
  }

  async searchZipCode() {
    const zipCode = this.addressForm.get('zipCode')?.value?.replace(/\D/g, '');
    
    if (!zipCode || zipCode.length !== 8) return;
    
    const loading = await this.loadingController.create({
      message: 'Buscando CEP...',
      spinner: 'crescent'
    });
    await loading.present();
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${zipCode}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        this.addressForm.patchValue({
          street: data.logradouro,
          neighborhood: data.bairro,
          city: data.localidade,
          state: data.uf
        });
        
        // Load shipping options
        await this.loadShippingOptions(zipCode);
      } else {
        const toast = await this.toastController.create({
          message: 'CEP não encontrado',
          duration: 2000,
          color: 'warning'
        });
        toast.present();
      }
    } catch (error) {
      console.error('CEP search error:', error);
    }
    
    loading.dismiss();
  }

  async loadShippingOptions(zipCode: string) {
    this.isLoadingShipping = true;
    
    try {
      // Calcular peso estimado dos itens (300g por item)
      const estimatedWeight = this.cartItems.reduce((sum, item) => sum + (item.quantity * 0.3), 0);
      
      // Interface para resposta da API
      interface ShippingQuoteResponse {
        shippingCost: number;
        deliveryDays: number;
        isFree: boolean;
        message?: string;
        options?: Array<{ id: string; name: string; price: number; days: number }>;
      }
      
      // Chamar API de cálculo de frete
      const response = await firstValueFrom(
        this.apiService.post<ShippingQuoteResponse>('/shipping/quote', {
          cep: zipCode.replace(/\D/g, ''),
          cartValue: this.subtotal,
          weight: estimatedWeight
        })
      ) as ShippingQuoteResponse;

      if (response.options && response.options.length > 0) {
        // Se a API retornar múltiplas opções
        this.shippingOptions = response.options;
      } else {
        // Opção única da API
        this.shippingOptions = [{
          id: response.isFree ? 'free' : 'standard',
          name: response.isFree ? 'Frete Grátis' : (response.message || 'Entrega Padrão'),
          price: response.shippingCost,
          days: response.deliveryDays
        }];
        
        // Se não for frete grátis e valor permite, adicionar opção expressa
        if (!response.isFree && this.subtotal < 199) {
          this.shippingOptions.push({
            id: 'express',
            name: 'Expresso',
            price: response.shippingCost + 15,
            days: Math.max(1, response.deliveryDays - 3)
          });
        }
      }

      // Selecionar primeira opção
      this.selectedShipping = this.shippingOptions[0];
      this.shipping = this.selectedShipping.price;
      this.updateTotal();
      
    } catch (error) {
      console.error('Erro ao calcular frete:', error);
      
      // Fallback: frete grátis acima de R$ 199
      if (this.subtotal >= 199) {
        this.shippingOptions = [{
          id: 'free',
          name: 'Frete Grátis',
          price: 0,
          days: 10
        }];
      } else {
        // Fallback com valores padrão
        this.shippingOptions = [
          { id: 'standard', name: 'Padrão', price: 15.90, days: 7 },
          { id: 'express', name: 'Expresso', price: 29.90, days: 3 }
        ];
      }
      
      this.selectedShipping = this.shippingOptions[0];
      this.shipping = this.selectedShipping.price;
      this.updateTotal();
      
      const toast = await this.toastController.create({
        message: 'Usando frete estimado. Valor final pode variar.',
        duration: 3000,
        color: 'warning'
      });
      await toast.present();
    } finally {
      this.isLoadingShipping = false;
    }
  }

  selectShipping(option: ShippingOption) {
    this.selectedShipping = option;
    this.shipping = option.price;
    this.updateTotal();
  }

  selectPayment(methodId: string) {
    this.selectedPayment = methodId;
    
    // Atualizar total com desconto do método de pagamento
    this.updateTotal();
    
    // Update card validation based on payment method
    if (methodId === 'credit' || methodId === 'debit') {
      this.paymentForm.get('cardNumber')?.setValidators([Validators.required]);
      this.paymentForm.get('cardName')?.setValidators([Validators.required]);
      this.paymentForm.get('cardExpiry')?.setValidators([Validators.required]);
      this.paymentForm.get('cardCvv')?.setValidators([Validators.required]);
    } else {
      this.paymentForm.get('cardNumber')?.clearValidators();
      this.paymentForm.get('cardName')?.clearValidators();
      this.paymentForm.get('cardExpiry')?.clearValidators();
      this.paymentForm.get('cardCvv')?.clearValidators();
    }
    
    this.paymentForm.get('cardNumber')?.updateValueAndValidity();
    this.paymentForm.get('cardName')?.updateValueAndValidity();
    this.paymentForm.get('cardExpiry')?.updateValueAndValidity();
    this.paymentForm.get('cardCvv')?.updateValueAndValidity();
  }

  updateTotal() {
    // Calcular desconto do método de pagamento
    this.paymentDiscount = this.getPaymentDiscount();
    this.total = this.subtotal + this.shipping - this.discount - this.paymentDiscount;
  }
  
  getPaymentDiscount(): number {
    const method = this.paymentMethods.find(m => m.id === this.selectedPayment);
    if (method && method.discount > 0) {
      return (this.subtotal * method.discount) / 100;
    }
    return 0;
  }

  formatCardNumber(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    value = value.substring(0, 16);
    value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    this.paymentForm.patchValue({ cardNumber: value });
  }

  formatCardExpiry(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    value = value.substring(0, 4);
    if (value.length > 2) {
      value = value.substring(0, 2) + '/' + value.substring(2);
    }
    this.paymentForm.patchValue({ cardExpiry: value });
  }

  formatCpf(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    value = value.substring(0, 11);
    if (value.length > 9) {
      value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (value.length > 6) {
      value = value.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (value.length > 3) {
      value = value.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    }
    this.paymentForm.patchValue({ cpf: value });
  }

  goToStep(step: number) {
    if (step === 2) {
      // Validar endereço
      if (this.showAddressForm) {
        // Se está no formulário, precisa salvar primeiro
        if (this.addressForm.invalid) {
          Object.keys(this.addressForm.controls).forEach(key => {
            this.addressForm.get(key)?.markAsTouched();
          });
          this.showToast('Preencha o endereço corretamente', 'warning');
          return;
        }
        // Salvar endereço antes de continuar
        this.saveNewAddress().then(() => {
          if (!this.showAddressForm) {
            this.currentStep = step;
          }
        });
        return;
      } else if (!this.selectedAddressId) {
        this.showToast('Selecione um endereço de entrega', 'warning');
        return;
      }
    }
    
    if (step === 3 && !this.selectedShipping) {
      this.showToast('Selecione uma opção de frete', 'warning');
      return;
    }
    
    this.currentStep = step;
  }

  nextStep() {
    this.goToStep(this.currentStep + 1);
  }

  prevStep() {
    this.goToStep(this.currentStep - 1);
  }

  async processPayment() {
    if (!this.selectedPayment) {
      this.showToast('Selecione uma forma de pagamento', 'warning');
      return;
    }
    
    if (this.paymentForm.invalid) {
      Object.keys(this.paymentForm.controls).forEach(key => {
        this.paymentForm.get(key)?.markAsTouched();
      });
      return;
    }
    
    const loading = await this.loadingController.create({
      message: 'Processando pagamento...',
      spinner: 'crescent'
    });
    await loading.present();
    
    this.isProcessing = true;
    
    try {
      // Obter endereço selecionado ou do formulário
      const selectedAddress = this.getSelectedAddress();
      const addressData = selectedAddress || this.addressForm.value;
      
      const orderData = {
        items: this.cartItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          size: item.size,
          color: item.color
        })),
        address: {
          id: selectedAddress?.id,
          street: addressData.street,
          number: addressData.number,
          complement: addressData.complement,
          neighborhood: addressData.neighborhood,
          city: addressData.city,
          state: addressData.state,
          zipCode: addressData.zipCode
        },
        shipping: {
          method: this.selectedShipping?.id,
          price: this.shipping
        },
        payment: {
          method: this.selectedPayment,
          cpf: this.paymentForm.get('cpf')?.value?.replace(/\D/g, ''),
          installments: this.paymentForm.get('installments')?.value
        },
        totals: {
          subtotal: this.subtotal,
          shipping: this.shipping,
          discount: this.discount,
          paymentDiscount: this.paymentDiscount,
          total: this.total
        }
      };
      
      const response = await firstValueFrom(this.apiService.post<any>('/orders', orderData));
      
      await loading.dismiss();
      
      // Clear cart after successful order
      this.cartService.clearCart();
      
      // Navigate to order confirmation
      this.router.navigate(['/order-success', response.orderId], {
        queryParams: {
          paymentMethod: this.selectedPayment,
          paymentData: JSON.stringify(response.paymentData)
        }
      });
      
    } catch (error: any) {
      await loading.dismiss();
      this.showToast(error?.message || 'Erro ao processar pagamento', 'danger');
    }
    
    this.isProcessing = false;
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    toast.present();
  }

  goBack() {
    if (this.currentStep > 1) {
      this.prevStep();
    } else {
      this.router.navigate(['/tabs/cart']);
    }
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }
}
