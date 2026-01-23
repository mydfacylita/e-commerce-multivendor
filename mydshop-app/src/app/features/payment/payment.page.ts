import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { formatOrderNumber } from '../../shared/utils/order.utils';
import { AppConfigService } from '../../core/services/app-config.service';

interface Order {
  id: string;
  total: number;
  status: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  discount: number;
  description: string;
}

@Component({
  selector: 'app-payment',
  templateUrl: './payment.page.html',
  styleUrls: ['./payment.page.scss'],
  standalone: false
})
export class PaymentPage implements OnInit {
  orderId: string = '';
  orderNumber: string = '';
  order: Order | null = null;
  
  isLoading = true;
  isProcessing = false;
  
  selectedPayment: string | null = null;
  paymentMethods: PaymentMethod[] = [];
  
  // Desconto PIX vindo das configurações
  pixDiscount = 0;
  
  // Dados do cartão de crédito
  cardData = {
    number: '',
    holderName: '',
    expiry: '',
    cvv: '',
    cpf: '',
    installments: 1
  };
  
  // Opções de parcelamento
  installmentOptions: { value: number; label: string }[] = [];
  
  // Total com desconto aplicado
  get totalWithDiscount(): number {
    if (!this.order) return 0;
    const method = this.paymentMethods.find(m => m.id === this.selectedPayment);
    if (method && method.discount > 0) {
      return this.order.total * (1 - method.discount / 100);
    }
    return this.order.total;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private appConfigService: AppConfigService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.orderId = this.route.snapshot.paramMap.get('id') || '';
    this.orderNumber = formatOrderNumber(this.orderId);
    
    this.loadConfig();
    this.loadOrder();
  }

  loadConfig() {
    this.appConfigService.config$.subscribe(config => {
      this.pixDiscount = config.ecommerce?.pixDiscount ?? 0;
      
      this.paymentMethods = [
        { 
          id: 'pix', 
          name: 'PIX', 
          icon: 'qr-code-outline', 
          discount: this.pixDiscount,
          description: 'Pagamento instantâneo'
        },
        { 
          id: 'boleto', 
          name: 'Boleto Bancário', 
          icon: 'barcode-outline', 
          discount: 0,
          description: 'Vencimento em 3 dias úteis'
        },
        { 
          id: 'credit', 
          name: 'Cartão de Crédito', 
          icon: 'card-outline', 
          discount: 0,
          description: 'Parcele em até 12x'
        }
      ];
    });
  }

  async loadOrder() {
    this.isLoading = true;
    
    try {
      const response = await firstValueFrom(
        this.apiService.get<any>(`/orders/${this.orderId}`)
      );
      
      this.order = {
        id: response.id,
        total: response.total,
        status: response.status
      };
      
      // Se já está pago, redirecionar para detalhes
      if (response.status !== 'PENDING') {
        this.router.navigate(['/order-details', this.orderId]);
        return;
      }
      
    } catch (error) {
      console.error('Erro ao carregar pedido:', error);
      const toast = await this.toastController.create({
        message: 'Erro ao carregar pedido',
        duration: 3000,
        color: 'danger'
      });
      toast.present();
      this.router.navigate(['/orders']);
    } finally {
      this.isLoading = false;
    }
  }

  selectPayment(methodId: string) {
    this.selectedPayment = methodId;
    
    // Se selecionou cartão, gerar opções de parcelamento
    if (methodId === 'credit') {
      this.generateInstallmentOptions();
    }
  }

  async processPayment() {
    if (!this.selectedPayment || !this.order) {
      const toast = await this.toastController.create({
        message: 'Selecione uma forma de pagamento',
        duration: 2000,
        color: 'warning'
      });
      toast.present();
      return;
    }

    // Validar e processar cartão de crédito
    if (this.selectedPayment === 'credit') {
      if (!this.validateCardData()) {
        return;
      }
      await this.processCreditCard();
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Processando pagamento...',
      spinner: 'crescent'
    });
    await loading.present();

    this.isProcessing = true;

    try {
      let paymentPayload: any = {
        amount: this.totalWithDiscount,
        description: `Pedido ${this.orderNumber}`,
        type: 'ORDER',
        referenceId: this.orderId,
        paymentMethod: this.selectedPayment
      };

      // Adicionar dados do cartão se for crédito
      if (this.selectedPayment === 'credit') {
        const [expiryMonth, expiryYear] = this.cardData.expiry.split('/');
        paymentPayload.card = {
          number: this.cardData.number.replace(/\s/g, ''),
          holderName: this.cardData.holderName.toUpperCase(),
          expiryMonth: expiryMonth,
          expiryYear: '20' + expiryYear,
          cvv: this.cardData.cvv,
          cpf: this.cardData.cpf.replace(/\D/g, '')
        };
        paymentPayload.installments = this.cardData.installments;
      }

      const paymentResponse = await firstValueFrom(
        this.apiService.post<any>('/payment/create', paymentPayload)
      );

      console.log('💳 Resposta do pagamento:', paymentResponse);

      await loading.dismiss();

      // Salvar dados do pagamento no localStorage (código PIX é muito grande para URL)
      const paymentDataToStore = {
        paymentId: paymentResponse.paymentId,
        status: paymentResponse.status,
        qrCode: paymentResponse.qrCode,
        qrCodeBase64: paymentResponse.qrCodeBase64,
        boletoUrl: paymentResponse.boletoUrl,
        barcode: paymentResponse.barcode,
        dueDate: paymentResponse.dueDate
      };
      
      console.log('💾 Salvando no localStorage:', `payment_${this.orderId}`, paymentDataToStore);
      localStorage.setItem(`payment_${this.orderId}`, JSON.stringify(paymentDataToStore));
      
      // Verificar se foi salvo
      const saved = localStorage.getItem(`payment_${this.orderId}`);
      console.log('✅ Verificação localStorage:', saved ? 'Salvo com sucesso' : 'ERRO ao salvar');

      // Navegar para página de sucesso
      this.router.navigate(['/order-success', this.orderId], {
        queryParams: {
          paymentMethod: this.selectedPayment
        }
      });

    } catch (error: any) {
      await loading.dismiss();
      const toast = await this.toastController.create({
        message: error?.message || 'Erro ao processar pagamento',
        duration: 3000,
        color: 'danger'
      });
      toast.present();
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Processa pagamento com cartão de crédito
   * Usa SDK do Mercado Pago para tokenizar e enviar
   */
  async processCreditCard() {
    const loading = await this.loadingController.create({
      message: 'Processando pagamento...',
      spinner: 'crescent'
    });
    await loading.present();
    this.isProcessing = true;

    try {
      // Separar mês e ano da validade
      const [expMonth, expYear] = this.cardData.expiry.split('/');
      
      // Enviar dados do cartão para o backend processar
      const paymentPayload = {
        amount: this.totalWithDiscount,
        description: `Pedido ${this.orderNumber}`,
        type: 'ORDER',
        referenceId: this.orderId,
        paymentMethod: 'credit_card',
        installments: this.cardData.installments,
        card: {
          number: this.cardData.number.replace(/\s/g, ''),
          holderName: this.cardData.holderName.toUpperCase(),
          expiryMonth: expMonth,
          expiryYear: '20' + expYear,
          cvv: this.cardData.cvv,
          cpf: this.cardData.cpf.replace(/\D/g, '')
        }
      };

      const response = await firstValueFrom(
        this.apiService.post<any>('/payment/create-card', paymentPayload)
      );

      await loading.dismiss();

      if (response.status === 'approved') {
        // Pagamento aprovado
        localStorage.setItem(`payment_${this.orderId}`, JSON.stringify({
          paymentId: response.paymentId,
          status: 'approved'
        }));
        
        this.router.navigate(['/order-success', this.orderId], {
          queryParams: { paymentMethod: 'credit' }
        });
        
      } else if (response.status === 'in_process' || response.status === 'pending') {
        // Pagamento em análise
        const toast = await this.toastController.create({
          message: 'Pagamento em análise. Você será notificado.',
          duration: 3000,
          color: 'warning'
        });
        toast.present();
        this.router.navigate(['/orders']);
        
      } else if (response.status === 'rejected') {
        throw new Error(this.getRejectMessage(response.statusDetail));
      } else {
        throw new Error('Erro ao processar pagamento');
      }

    } catch (error: any) {
      await loading.dismiss();
      const toast = await this.toastController.create({
        message: error?.message || 'Erro ao processar pagamento',
        duration: 4000,
        color: 'danger'
      });
      toast.present();
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Retorna mensagem amigável para erros de cartão
   */
  getRejectMessage(statusDetail: string): string {
    const messages: Record<string, string> = {
      'cc_rejected_bad_filled_card_number': 'Número do cartão incorreto',
      'cc_rejected_bad_filled_date': 'Data de validade incorreta',
      'cc_rejected_bad_filled_other': 'Dados do cartão incorretos',
      'cc_rejected_bad_filled_security_code': 'Código de segurança incorreto',
      'cc_rejected_blacklist': 'Cartão não permitido',
      'cc_rejected_call_for_authorize': 'Ligue para sua operadora para autorizar',
      'cc_rejected_card_disabled': 'Cartão desabilitado',
      'cc_rejected_card_error': 'Erro no cartão. Tente outro',
      'cc_rejected_duplicated_payment': 'Pagamento duplicado',
      'cc_rejected_high_risk': 'Pagamento recusado por segurança',
      'cc_rejected_insufficient_amount': 'Saldo insuficiente',
      'cc_rejected_invalid_installments': 'Parcelas inválidas',
      'cc_rejected_max_attempts': 'Limite de tentativas excedido',
      'cc_rejected_other_reason': 'Pagamento recusado. Tente outro cartão'
    };
    return messages[statusDetail] || 'Pagamento recusado. Tente outro cartão';
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  /**
   * Formata número do cartão com espaços
   */
  formatCardNumber(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    this.cardData.number = value.substring(0, 19);
  }

  /**
   * Formata data de validade MM/AA
   */
  formatExpiry(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    this.cardData.expiry = value;
  }

  /**
   * Formata CPF
   */
  formatCPF(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    this.cardData.cpf = value.substring(0, 14);
  }

  /**
   * Gera opções de parcelamento baseado no total
   */
  generateInstallmentOptions() {
    if (!this.order) return;
    
    const total = this.totalWithDiscount;
    const minInstallment = 5; // R$ 5,00 mínimo por parcela
    const maxInstallments = Math.min(12, Math.floor(total / minInstallment));
    
    this.installmentOptions = [];
    
    for (let i = 1; i <= maxInstallments; i++) {
      const installmentValue = total / i;
      const label = i === 1 
        ? `1x de ${this.formatCurrency(installmentValue)} (à vista)`
        : `${i}x de ${this.formatCurrency(installmentValue)} sem juros`;
      
      this.installmentOptions.push({ value: i, label });
    }
  }

  /**
   * Valida dados do cartão
   */
  validateCardData(): boolean {
    const { number, holderName, expiry, cvv, cpf } = this.cardData;
    
    if (!number || number.replace(/\s/g, '').length < 13) {
      this.showToast('Número do cartão inválido', 'warning');
      return false;
    }
    
    if (!holderName || holderName.length < 3) {
      this.showToast('Digite o nome como está no cartão', 'warning');
      return false;
    }
    
    if (!expiry || expiry.length < 5) {
      this.showToast('Data de validade inválida', 'warning');
      return false;
    }
    
    // Validar se não está expirado
    const [month, year] = expiry.split('/');
    const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
    if (expiryDate < new Date()) {
      this.showToast('Cartão expirado', 'danger');
      return false;
    }
    
    if (!cvv || cvv.length < 3) {
      this.showToast('CVV inválido', 'warning');
      return false;
    }
    
    if (!cpf || cpf.replace(/\D/g, '').length !== 11) {
      this.showToast('CPF inválido', 'warning');
      return false;
    }
    
    return true;
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      color
    });
    toast.present();
  }

  goBack() {
    this.router.navigate(['/order-details', this.orderId]);
  }
}
