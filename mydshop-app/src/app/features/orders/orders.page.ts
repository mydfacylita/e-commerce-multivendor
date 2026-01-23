import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';
import { ApiService } from '../../core/services/api.service';
import { formatOrderNumber } from '../../shared/utils/order.utils';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  size?: string;
  color?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  total: number;
  items: OrderItem[];
  tracking?: {
    code: string;
    carrier: string;
    url: string;
  };
}

@Component({
  selector: 'app-orders',
  templateUrl: './orders.page.html',
  styleUrls: ['./orders.page.scss'],
  standalone: false
})
export class OrdersPage implements OnInit {
  orders: Order[] = [];
  filteredOrders: Order[] = [];
  isLoading = true;
  selectedFilter = 'all';
  
  filters = [
    { value: 'all', label: 'Todos' },
    { value: 'pending', label: 'Pendentes' },
    { value: 'processing', label: 'Em andamento' },
    { value: 'shipped', label: 'Enviados' },
    { value: 'delivered', label: 'Entregues' }
  ];

  constructor(
    private router: Router,
    private apiService: ApiService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.loadOrders();
  }

  async loadOrders() {
    this.isLoading = true;
    
    this.apiService.get<{ orders: any[] }>('/orders').subscribe({
      next: (response) => {
        // Mapear dados da API para o formato esperado
        this.orders = (response.orders || []).map(order => this.mapOrder(order));
        this.applyFilter();
        this.isLoading = false;
      },
      error: async (error) => {
        this.isLoading = false;
        const toast = await this.toastController.create({
          message: 'Erro ao carregar pedidos',
          duration: 3000,
          color: 'danger'
        });
        toast.present();
      }
    });
  }
  
  /**
   * Mapeia pedido da API para formato do frontend
   */
  private mapOrder(apiOrder: any): Order {
    // Parsear imagens do produto (pode ser JSON string)
    const parseImages = (images: any): string => {
      if (!images) return 'assets/placeholder.png';
      try {
        const parsed = typeof images === 'string' ? JSON.parse(images) : images;
        return Array.isArray(parsed) ? parsed[0] : parsed;
      } catch {
        return typeof images === 'string' ? images : 'assets/placeholder.png';
      }
    };
    
    return {
      id: apiOrder.id,
      orderNumber: formatOrderNumber(apiOrder.id),
      status: apiOrder.status,
      statusLabel: this.getStatusLabel(apiOrder.status),
      createdAt: apiOrder.createdAt,
      total: apiOrder.total,
      items: (apiOrder.items || []).map((item: any) => ({
        id: item.id,
        name: item.product?.name || 'Produto',
        price: item.price,
        quantity: item.quantity,
        image: parseImages(item.product?.images),
        size: item.selectedSize,
        color: item.selectedColor
      })),
      tracking: apiOrder.trackingCode ? {
        code: apiOrder.trackingCode,
        carrier: apiOrder.shippingCarrier || 'Correios',
        url: `https://www.linkcorreios.com.br/?id=${apiOrder.trackingCode}`
      } : undefined
    };
  }
  
  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'PENDING': 'Pendente',
      'PAID': 'Pago',
      'PROCESSING': 'Em processamento',
      'SHIPPED': 'Enviado',
      'DELIVERED': 'Entregue',
      'CANCELLED': 'Cancelado',
      'REFUNDED': 'Reembolsado'
    };
    return labels[status] || status;
  }

  async doRefresh(event: any) {
    await this.loadOrders();
    event.target.complete();
  }

  selectFilter(filter: string) {
    this.selectedFilter = filter;
    this.applyFilter();
  }

  applyFilter() {
    if (this.selectedFilter === 'all') {
      this.filteredOrders = this.orders;
    } else {
      this.filteredOrders = this.orders.filter(order => order.status === this.selectedFilter);
    }
  }

  openOrder(order: Order) {
    this.router.navigate(['/order-details', order.id]);
  }

  async trackOrder(order: Order, event: Event) {
    event.stopPropagation();
    
    if (!order.tracking) {
      const toast = await this.toastController.create({
        message: 'Código de rastreio não disponível ainda',
        duration: 2000,
        color: 'warning'
      });
      toast.present();
      return;
    }
    
    // Open tracking URL
    window.open(order.tracking.url, '_blank');
  }

  async cancelOrder(order: Order, event: Event) {
    event.stopPropagation();
    
    const alert = await this.alertController.create({
      header: 'Cancelar Pedido',
      message: `Tem certeza que deseja cancelar o pedido #${order.orderNumber}?`,
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
            
            this.apiService.post(`/orders/${order.id}/cancel`, {}).subscribe({
              next: async () => {
                await loading.dismiss();
                const toast = await this.toastController.create({
                  message: 'Pedido cancelado com sucesso',
                  duration: 2000,
                  color: 'success'
                });
                toast.present();
                this.loadOrders();
              },
              error: async (error) => {
                await loading.dismiss();
                const toast = await this.toastController.create({
                  message: error?.message || 'Erro ao cancelar pedido',
                  duration: 3000,
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

  async reorder(order: Order, event: Event) {
    event.stopPropagation();
    
    const loading = await this.loadingController.create({
      message: 'Adicionando produtos ao carrinho...',
      spinner: 'crescent'
    });
    await loading.present();
    
    // TODO: Add items to cart via CartService
    
    await loading.dismiss();
    this.router.navigate(['/tabs/cart']);
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'pending': 'warning',
      'processing': 'primary',
      'shipped': 'tertiary',
      'delivered': 'success',
      'cancelled': 'danger'
    };
    return colors[status] || 'medium';
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'pending': 'time-outline',
      'processing': 'cog-outline',
      'shipped': 'rocket-outline',
      'delivered': 'checkmark-circle-outline',
      'cancelled': 'close-circle-outline'
    };
    return icons[status] || 'help-circle-outline';
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  goBack() {
    this.router.navigate(['/tabs/profile']);
  }
}
