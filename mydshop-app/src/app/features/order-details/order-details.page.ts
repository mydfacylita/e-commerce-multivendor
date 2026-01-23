import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { formatOrderNumber } from '../../shared/utils/order.utils';
import { getApiUrl } from '../../core/config/api.config';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  size?: string;
  color?: string;
}

interface Invoice {
  id: string;
  number: string;
  accessKey: string;
  status: string;
  pdfUrl?: string;
  xmlUrl?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  total: number;
  subtotal: number;
  shippingCost: number;
  discount: number;
  deliveryDays?: number;
  estimatedDeliveryDate?: string;
  shippingMethod?: string;
  shippingCarrier?: string;
  items: OrderItem[];
  shippingAddress: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  tracking?: {
    code: string;
    carrier: string;
    url: string;
  };
  paymentMethod?: string;
  paymentType?: string;
  invoice?: Invoice;
}

@Component({
  selector: 'app-order-details',
  templateUrl: './order-details.page.html',
  styleUrls: ['./order-details.page.scss'],
  standalone: false
})
export class OrderDetailsPage implements OnInit {
  order: Order | null = null;
  isLoading = true;
  orderId: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private authService: AuthService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.orderId = this.route.snapshot.paramMap.get('id') || '';
    if (this.orderId) {
      this.loadOrder();
    }
  }

  async loadOrder() {
    this.isLoading = true;
    
    this.apiService.get<any>(`/orders/${this.orderId}`).subscribe({
      next: (response) => {
        this.order = this.mapOrder(response);
        this.isLoading = false;
      },
      error: async (error) => {
        this.isLoading = false;
        const toast = await this.toastController.create({
          message: 'Erro ao carregar pedido',
          duration: 3000,
          color: 'danger'
        });
        toast.present();
        this.router.navigate(['/orders']);
      }
    });
  }

  private mapOrder(apiOrder: any): Order {
    const parseImages = (images: any): string => {
      if (!images) return 'assets/placeholder.png';
      try {
        const parsed = typeof images === 'string' ? JSON.parse(images) : images;
        return Array.isArray(parsed) ? parsed[0] : parsed;
      } catch {
        return typeof images === 'string' ? images : 'assets/placeholder.png';
      }
    };

    const parseAddress = (address: any) => {
      if (!address) return null;
      try {
        return typeof address === 'string' ? JSON.parse(address) : address;
      } catch {
        return null;
      }
    };

    const address = parseAddress(apiOrder.shippingAddress);

    // Calcula data estimada de entrega baseada na data de aprovação do pagamento (não da criação do pedido)
    const calculateEstimatedDelivery = (baseDate: string, deliveryDays: number): string => {
      const startDate = new Date(baseDate);
      let businessDays = 0;
      const result = new Date(startDate);
      
      while (businessDays < deliveryDays) {
        result.setDate(result.getDate() + 1);
        const dayOfWeek = result.getDay();
        // Conta apenas dias úteis (segunda a sexta)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          businessDays++;
        }
      }
      return result.toISOString();
    };

    // Usa paymentApprovedAt se disponível (pedido já pago), senão usa createdAt
    const deliveryBaseDate = apiOrder.paymentApprovedAt || apiOrder.createdAt;

    return {
      id: apiOrder.id,
      orderNumber: formatOrderNumber(apiOrder.id),
      status: apiOrder.status,
      statusLabel: this.getStatusLabel(apiOrder.status),
      createdAt: apiOrder.createdAt,
      total: apiOrder.total,
      subtotal: apiOrder.subtotal || apiOrder.total,
      shippingCost: apiOrder.shippingCost || 0,
      discount: apiOrder.discountAmount || 0,
      deliveryDays: apiOrder.deliveryDays,
      estimatedDeliveryDate: apiOrder.deliveryDays ? calculateEstimatedDelivery(deliveryBaseDate, apiOrder.deliveryDays) : undefined,
      shippingMethod: apiOrder.shippingMethod,
      shippingCarrier: apiOrder.shippingCarrier,
      items: (apiOrder.items || []).map((item: any) => ({
        id: item.id,
        name: item.product?.name || 'Produto',
        price: item.price,
        quantity: item.quantity,
        image: parseImages(item.product?.images),
        size: item.selectedSize,
        color: item.selectedColor
      })),
      shippingAddress: address || {
        street: '',
        number: '',
        neighborhood: '',
        city: '',
        state: '',
        zipCode: ''
      },
      tracking: apiOrder.trackingCode ? {
        code: apiOrder.trackingCode,
        carrier: apiOrder.shippingCarrier || 'Correios',
        url: `https://www.linkcorreios.com.br/?id=${apiOrder.trackingCode}`
      } : undefined,
      paymentMethod: apiOrder.paymentMethod,
      paymentType: apiOrder.paymentType,
      invoice: apiOrder.invoices && apiOrder.invoices.length > 0 && apiOrder.invoices[0].status === 'ISSUED' ? {
        id: apiOrder.invoices[0].id,
        number: apiOrder.invoices[0].invoiceNumber || apiOrder.invoices[0].number,
        accessKey: apiOrder.invoices[0].accessKey,
        status: apiOrder.invoices[0].status,
        pdfUrl: apiOrder.invoices[0].pdfUrl,
        xmlUrl: apiOrder.invoices[0].xmlUrl
      } : undefined
    };
  }

  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'PENDING': 'Aguardando Pagamento',
      'PAID': 'Pagamento Confirmado',
      'PROCESSING': 'Em Preparação',
      'SHIPPED': 'Enviado',
      'DELIVERED': 'Entregue',
      'CANCELLED': 'Cancelado',
      'REFUNDED': 'Reembolsado'
    };
    return labels[status] || status;
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'PENDING': 'warning',
      'PAID': 'success',
      'PROCESSING': 'primary',
      'SHIPPED': 'tertiary',
      'DELIVERED': 'success',
      'CANCELLED': 'danger',
      'REFUNDED': 'medium'
    };
    return colors[status] || 'medium';
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'PENDING': 'time-outline',
      'PAID': 'checkmark-circle-outline',
      'PROCESSING': 'cube-outline',
      'SHIPPED': 'airplane-outline',
      'DELIVERED': 'checkmark-done-outline',
      'CANCELLED': 'close-circle-outline',
      'REFUNDED': 'arrow-undo-outline'
    };
    return icons[status] || 'help-outline';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  formatDeliveryDate(date: string): string {
    return new Date(date).toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long'
    });
  }

  getShippingLabel(): string {
    if (!this.order) return '';
    
    if (this.order.shippingMethod === 'EXPRESS' || this.order.shippingMethod?.toLowerCase().includes('express')) {
      return 'Expresso';
    }
    if (this.order.shippingCarrier) {
      return this.order.shippingCarrier;
    }
    if (this.order.shippingMethod) {
      const methods: Record<string, string> = {
        'SEDEX': 'SEDEX',
        'PAC': 'PAC',
        'EXPRESS': 'Expresso',
        'STANDARD': 'Padrão',
        'FREE': 'Grátis'
      };
      return methods[this.order.shippingMethod] || this.order.shippingMethod;
    }
    return 'Correios';
  }

  getPaymentMethodLabel(): string {
    if (!this.order) return '';
    
    const paymentType = this.order.paymentType || this.order.paymentMethod || '';
    const labels: Record<string, string> = {
      'PIX': 'Pago via PIX',
      'pix': 'Pago via PIX',
      'CREDIT_CARD': 'Cartão de Crédito',
      'credit_card': 'Cartão de Crédito',
      'DEBIT_CARD': 'Cartão de Débito',
      'debit_card': 'Cartão de Débito',
      'BOLETO': 'Boleto Bancário',
      'boleto': 'Boleto Bancário',
      'account_money': 'Mercado Pago'
    };
    return labels[paymentType] || paymentType;
  }

  getPaymentIcon(): string {
    if (!this.order) return 'card-outline';
    
    const paymentType = this.order.paymentType || this.order.paymentMethod || '';
    if (paymentType.toLowerCase().includes('pix')) return 'qr-code-outline';
    if (paymentType.toLowerCase().includes('credit')) return 'card-outline';
    if (paymentType.toLowerCase().includes('debit')) return 'card-outline';
    if (paymentType.toLowerCase().includes('boleto')) return 'barcode-outline';
    return 'wallet-outline';
  }

  getDiscountLabel(): string {
    if (!this.order) return '';
    
    const paymentType = this.order.paymentType || this.order.paymentMethod || '';
    if (paymentType.toLowerCase().includes('pix')) return '(PIX)';
    return '';
  }

  async trackOrder() {
    if (!this.order?.tracking) {
      const toast = await this.toastController.create({
        message: 'Código de rastreio não disponível ainda',
        duration: 2000,
        color: 'warning'
      });
      toast.present();
      return;
    }
    
    window.open(this.order.tracking.url, '_blank');
  }

  async copyTrackingCode() {
    if (this.order?.tracking?.code) {
      await navigator.clipboard.writeText(this.order.tracking.code);
      const toast = await this.toastController.create({
        message: 'Código copiado!',
        duration: 1500,
        color: 'success'
      });
      toast.present();
    }
  }

  async cancelOrder() {
    if (!this.order || !['PENDING', 'PAID'].includes(this.order.status)) {
      const toast = await this.toastController.create({
        message: 'Este pedido não pode ser cancelado',
        duration: 2000,
        color: 'warning'
      });
      toast.present();
      return;
    }

    const alert = await this.alertController.create({
      header: 'Cancelar Pedido',
      message: `Tem certeza que deseja cancelar o pedido #${this.order.orderNumber}?`,
      buttons: [
        {
          text: 'Não',
          role: 'cancel'
        },
        {
          text: 'Sim, Cancelar',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Cancelando pedido...',
              spinner: 'crescent'
            });
            await loading.present();

            this.apiService.post(`/orders/${this.order!.id}/cancel`, {}).subscribe({
              next: async () => {
                await loading.dismiss();
                const toast = await this.toastController.create({
                  message: 'Pedido cancelado com sucesso',
                  duration: 2000,
                  color: 'success'
                });
                toast.present();
                this.loadOrder();
              },
              error: async () => {
                await loading.dismiss();
                const toast = await this.toastController.create({
                  message: 'Erro ao cancelar pedido',
                  duration: 2000,
                  color: 'danger'
                });
                toast.present();
              }
            });
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Navega para a página de pagamento
   */
  goToPayment() {
    if (!this.order) return;
    // Navegar para página de seleção de pagamento
    this.router.navigate(['/payment', this.order.id]);
  }

  /**
   * Abre o DANFE (PDF da NF-e)
   */
  async openDanfe() {
    if (!this.order?.invoice?.id) {
      const toast = await this.toastController.create({
        message: 'DANFE não disponível',
        duration: 2000,
        color: 'warning'
      });
      toast.present();
      return;
    }
    
    // Usar getApiUrl() que resolve corretamente para Capacitor
    const danfeUrl = `${getApiUrl()}/invoices/${this.order.invoice.id}/danfe?token=${this.order.id}`;
    console.log('📄 Abrindo DANFE:', danfeUrl);
    
    // Usar Capacitor Browser no nativo, window.open no web
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url: danfeUrl, toolbarColor: '#f97316' });
    } else {
      window.open(danfeUrl, '_blank');
    }
  }

  /**
   * Abre o XML da NF-e
   */
  async openXml() {
    if (!this.order?.invoice?.id) {
      const toast = await this.toastController.create({
        message: 'XML não disponível',
        duration: 2000,
        color: 'warning'
      });
      toast.present();
      return;
    }
    
    // Usar getApiUrl() que resolve corretamente para Capacitor
    const xmlUrl = `${getApiUrl()}/invoices/${this.order.invoice.id}/xml?token=${this.order.id}`;
    console.log('📄 Abrindo XML:', xmlUrl);
    
    // Usar Capacitor Browser no nativo, window.open no web
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url: xmlUrl, toolbarColor: '#f97316' });
    } else {
      window.open(xmlUrl, '_blank');
    }
  }

  /**
   * Copia a chave de acesso da NF-e
   */
  async copyAccessKey() {
    if (this.order?.invoice?.accessKey) {
      await navigator.clipboard.writeText(this.order.invoice.accessKey);
      const toast = await this.toastController.create({
        message: 'Chave de acesso copiada!',
        duration: 1500,
        color: 'success'
      });
      toast.present();
    }
  }

  goBack() {
    this.router.navigate(['/orders']);
  }
}
