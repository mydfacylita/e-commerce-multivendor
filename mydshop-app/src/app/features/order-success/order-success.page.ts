import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { Clipboard } from '@capacitor/clipboard';
import { firstValueFrom, interval, Subscription } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { formatOrderNumber } from '../../shared/utils/order.utils';
import * as QRCode from 'qrcode';

interface PaymentData {
  paymentId: string;
  status: string;
  paymentMethod?: string;
  // PIX
  qrCode?: string;
  qrCodeBase64?: string;
  // Boleto
  boletoUrl?: string;
  barcode?: string;
  boletoNumber?: string;
  dueDate?: string;
}

@Component({
  selector: 'app-order-success',
  templateUrl: './order-success.page.html',
  styleUrls: ['./order-success.page.scss'],
  standalone: false
})
export class OrderSuccessPage implements OnInit, OnDestroy {
  orderId: string = '';
  orderNumber: string = '';
  paymentMethod: string = '';
  paymentData: PaymentData | null = null;
  
  // QR Code gerado localmente
  localQrCodeDataUrl: string = '';
  
  // Status do pagamento
  paymentStatus: 'pending' | 'approved' | 'rejected' = 'pending';
  isCheckingStatus = false;
  statusCheckInterval?: Subscription;
  
  // Timer para expiração (PIX)
  expiresAt?: Date;
  timeRemaining: string = '';
  timerInterval?: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    // Obter dados da rota
    this.orderId = this.route.snapshot.paramMap.get('id') || '';
    this.orderNumber = formatOrderNumber(this.orderId);
    
    // Dados de pagamento passados via queryParams
    this.paymentMethod = this.route.snapshot.queryParamMap.get('paymentMethod') || '';
    
    // Tentar ler dados do pagamento do localStorage primeiro (código PIX é muito grande para URL)
    const storedPaymentData = localStorage.getItem(`payment_${this.orderId}`);
    console.log('🔍 localStorage key:', `payment_${this.orderId}`);
    console.log('🔍 localStorage data:', storedPaymentData);
    
    if (storedPaymentData) {
      try {
        this.paymentData = JSON.parse(storedPaymentData);
        console.log('✅ PaymentData carregado do localStorage:', this.paymentData);
        // NÃO limpar imediatamente - manter por 30 minutos para caso de refresh
        // O dado será sobrescrito quando gerar novo pagamento
      } catch (e) {
        console.error('Erro ao parsear paymentData do localStorage:', e);
      }
    }
    
    // Fallback: tentar ler da URL (para compatibilidade)
    if (!this.paymentData) {
      const paymentDataStr = this.route.snapshot.queryParamMap.get('paymentData');
      if (paymentDataStr) {
        try {
          this.paymentData = JSON.parse(paymentDataStr);
          console.log('✅ PaymentData carregado da URL:', this.paymentData);
        } catch (e) {
          console.error('Erro ao parsear paymentData da URL:', e);
        }
      }
    }
    
    // Se ainda não tem dados e é PIX/Boleto, tentar gerar novo pagamento
    if (!this.paymentData && (this.paymentMethod === 'pix' || this.paymentMethod === 'boleto')) {
      console.log('⚠️ Sem dados de pagamento, redirecionando para página de pagamento');
      this.router.navigate(['/payment', this.orderId]);
      return;
    }
    
    console.log('📦 Order Success:', {
      orderId: this.orderId,
      orderNumber: this.orderNumber,
      paymentMethod: this.paymentMethod,
      paymentData: this.paymentData,
      hasQrCode: !!this.paymentData?.qrCode,
      qrCodeLength: this.paymentData?.qrCode?.length
    });
    
    // Gerar QR Code localmente se tiver código PIX
    if (this.paymentMethod === 'pix' && this.paymentData?.qrCode) {
      await this.generateLocalQrCode();
    }
    
    // Configurar timer para PIX (expira em 30 min)
    if (this.paymentMethod === 'pix' && this.paymentData) {
      this.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      this.startExpirationTimer();
    }
    
    // Iniciar verificação de status para PIX e Boleto
    if (this.paymentMethod === 'pix' || this.paymentMethod === 'boleto') {
      this.startStatusCheck();
    }
    
    // Se for cartão aprovado, já está pago
    if (this.paymentMethod === 'credit' || this.paymentMethod === 'debit') {
      if (this.paymentData?.status === 'approved') {
        this.paymentStatus = 'approved';
      }
    }
  }

  ngOnDestroy() {
    this.stopStatusCheck();
    this.stopExpirationTimer();
  }

  /**
   * Inicia verificação periódica do status do pagamento
   */
  startStatusCheck() {
    // Verificar a cada 5 segundos
    this.statusCheckInterval = interval(5000).subscribe(() => {
      this.checkPaymentStatus();
    });
    
    // Verificar imediatamente também
    this.checkPaymentStatus();
  }

  stopStatusCheck() {
    if (this.statusCheckInterval) {
      this.statusCheckInterval.unsubscribe();
      this.statusCheckInterval = undefined;
    }
  }

  /**
   * Verifica status do pagamento
   */
  async checkPaymentStatus() {
    if (this.isCheckingStatus || this.paymentStatus === 'approved') return;
    
    this.isCheckingStatus = true;
    
    try {
      interface StatusResponse {
        orderId: string;
        status: string;
        paymentStatus: string;
        paid: boolean;
        rejected: boolean;
        message?: string;
      }
      
      const response = await firstValueFrom(
        this.apiService.getPublic<StatusResponse>(`/payment/check-status/${this.orderId}`)
      ) as StatusResponse;
      
      if (response.paid) {
        this.paymentStatus = 'approved';
        this.stopStatusCheck();
        this.stopExpirationTimer();
        
        // Mostrar toast de sucesso
        const toast = await this.toastController.create({
          message: 'Pagamento confirmado! 🎉',
          duration: 3000,
          color: 'success',
          position: 'top'
        });
        await toast.present();
      } else if (response.rejected) {
        this.paymentStatus = 'rejected';
        this.stopStatusCheck();
        this.stopExpirationTimer();
        
        // Mostrar toast de erro
        const toast = await this.toastController.create({
          message: 'Pagamento não aprovado. Tente novamente.',
          duration: 4000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    } finally {
      this.isCheckingStatus = false;
    }
  }

  /**
   * Timer de expiração do PIX
   */
  startExpirationTimer() {
    this.updateTimeRemaining();
    this.timerInterval = setInterval(() => {
      this.updateTimeRemaining();
    }, 1000);
  }

  stopExpirationTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
  }

  updateTimeRemaining() {
    if (!this.expiresAt) return;
    
    const now = new Date();
    const diff = this.expiresAt.getTime() - now.getTime();
    
    if (diff <= 0) {
      this.timeRemaining = 'Expirado';
      this.stopExpirationTimer();
      return;
    }
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    this.timeRemaining = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Copia código PIX para área de transferência
   */
  async copyPixCode() {
    if (!this.paymentData?.qrCode) return;
    
    try {
      await Clipboard.write({
        string: this.paymentData.qrCode
      });
      
      const toast = await this.toastController.create({
        message: 'Código copiado! Cole no seu app de banco.',
        duration: 2500,
        color: 'success',
        position: 'bottom'
      });
      await toast.present();
    } catch (error) {
      // Fallback para web
      try {
        await navigator.clipboard.writeText(this.paymentData.qrCode);
        const toast = await this.toastController.create({
          message: 'Código copiado!',
          duration: 2000,
          color: 'success'
        });
        await toast.present();
      } catch (e) {
        console.error('Erro ao copiar:', e);
      }
    }
  }

  /**
   * Copia código de barras do boleto
   */
  async copyBoletoCode() {
    const code = this.paymentData?.barcode || this.paymentData?.boletoNumber;
    if (!code) return;
    
    try {
      await Clipboard.write({
        string: code
      });
      
      const toast = await this.toastController.create({
        message: 'Código do boleto copiado!',
        duration: 2500,
        color: 'success',
        position: 'bottom'
      });
      await toast.present();
    } catch (error) {
      // Fallback
      try {
        await navigator.clipboard.writeText(code);
        const toast = await this.toastController.create({
          message: 'Código copiado!',
          duration: 2000,
          color: 'success'
        });
        await toast.present();
      } catch (e) {
        console.error('Erro ao copiar:', e);
      }
    }
  }

  /**
   * Abre link do boleto em nova aba
   */
  openBoletoLink() {
    if (this.paymentData?.boletoUrl) {
      window.open(this.paymentData.boletoUrl, '_blank');
    }
  }

  /**
   * Navega para meus pedidos
   */
  goToOrders() {
    this.router.navigate(['/orders']);
  }

  /**
   * Volta para a home
   */
  goToHome() {
    this.router.navigate(['/tabs/home']);
  }

  /**
   * Retorna título baseado no status
   */
  getStatusTitle(): string {
    switch (this.paymentStatus) {
      case 'approved':
        return 'Pagamento Confirmado!';
      case 'rejected':
        return 'Pagamento não aprovado';
      default:
        if (this.paymentMethod === 'pix') {
          return 'Aguardando Pagamento';
        } else if (this.paymentMethod === 'boleto') {
          return 'Boleto Gerado';
        } else {
          return 'Pedido Realizado!';
        }
    }
  }

  /**
   * Retorna ícone baseado no status
   */
  getStatusIcon(): string {
    switch (this.paymentStatus) {
      case 'approved':
        return 'checkmark-circle';
      case 'rejected':
        return 'close-circle';
      default:
        if (this.paymentMethod === 'pix') {
          return 'qr-code';
        } else if (this.paymentMethod === 'boleto') {
          return 'barcode';
        } else {
          return 'bag-check';
        }
    }
  }

  /**
   * Retorna cor baseada no status
   */
  getStatusColor(): string {
    switch (this.paymentStatus) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'danger';
      default:
        return 'primary';
    }
  }

  /**
   * Gera QR Code localmente usando a biblioteca qrcode
   */
  async generateLocalQrCode(): Promise<void> {
    if (!this.paymentData?.qrCode) {
      console.log('❌ Sem código PIX para gerar QR');
      return;
    }
    
    try {
      console.log('🔄 Gerando QR Code localmente...');
      this.localQrCodeDataUrl = await QRCode.toDataURL(this.paymentData.qrCode, {
        width: 280,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      console.log('✅ QR Code gerado com sucesso:', this.localQrCodeDataUrl.substring(0, 50) + '...');
    } catch (error) {
      console.error('❌ Erro ao gerar QR Code localmente:', error);
      // Fallback para API externa
      this.localQrCodeDataUrl = '';
    }
  }

  /**
   * Gera URL para QR Code via API externa
   */
  getQrCodeUrl(): string {
    if (!this.paymentData?.qrCode) return '';
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(this.paymentData.qrCode)}`;
    console.log('🔲 QR Code URL:', url);
    return url;
  }

  /**
   * Handler para erro ao carregar QR Code
   */
  onQrCodeError(event: Event) {
    console.error('❌ Erro ao carregar QR Code:', event);
    console.log('📋 Dados do pagamento:', this.paymentData);
  }
}
