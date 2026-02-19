import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { FiArrowLeft, FiPackage, FiTruck, FiUser, FiMapPin, FiMessageCircle, FiShoppingBag, FiDollarSign } from 'react-icons/fi'
import SendToSupplierButton from '@/components/admin/SendToSupplierButton'
import UpdateOrderStatusButton from '@/components/admin/UpdateOrderStatusButton'
import ResetSupplierStatusButton from '@/components/admin/ResetSupplierStatusButton'
import AliExpressOrderStatus from '@/components/admin/AliExpressOrderStatus'
import { formatOrderNumber } from '@/lib/order'
import ClientDate from '@/components/admin/ClientDate'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function AdminOrderDetailPage({
  params,
}: {
  params: { id: string }
}) {
  // Primeiro, buscar o pedido principal
  const mainOrderRaw = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      user: true,
      items: {
        include: {
          product: {
            include: {
              supplier: true,
              seller: {
                select: {
                  id: true,
                  userId: true,
                  storeName: true,
                  storeSlug: true,
                  cpf: true,
                  cnpj: true,
                  razaoSocial: true,
                  nomeFantasia: true,
                  banco: true,
                  agencia: true,
                  conta: true,
                  chavePix: true,
                  user: {
                    select: {
                      name: true,
                      email: true,
                      phone: true,
                    }
                  }
                },
              },
            },
          },
        },
      },
    },
  })

  if (!mainOrderRaw) {
    notFound()
  }

  // Filtrar itens: ADM vê apenas itens ADM e DROP (não vê itens STOCK de vendedor)
  const filterAdmItems = (items: typeof mainOrderRaw.items) => {
    return items.filter(item => 
      item.itemType === 'DROPSHIPPING' || 
      (item.itemType === 'STOCK' && !item.sellerId) ||
      (!item.itemType && !item.sellerId)
    )
  }

  const mainOrder = {
    ...mainOrderRaw,
    items: filterAdmItems(mainOrderRaw.items)
  }

  // Se o pedido faz parte de um grupo híbrido, buscar todos os sub-pedidos
  let allOrders: (typeof mainOrder)[] = [mainOrder]
  let isHybridOrder = false
  let parentOrderId = mainOrder.parentOrderId

  if (parentOrderId) {
    // Buscar todos os sub-pedidos com o mesmo parentOrderId
    const siblingOrders = await prisma.order.findMany({
      where: {
        parentOrderId: parentOrderId,
        id: { not: mainOrder.id } // Excluir o pedido já carregado
      },
      include: {
        user: true,
        items: {
          include: {
            product: {
              include: {
                supplier: true,
                seller: {
                  select: {
                    id: true,
                    userId: true,
                    storeName: true,
                    storeSlug: true,
                    cpf: true,
                    cnpj: true,
                    razaoSocial: true,
                    nomeFantasia: true,
                    banco: true,
                    agencia: true,
                    conta: true,
                    chavePix: true,
                    user: {
                      select: {
                        name: true,
                        email: true,
                        phone: true,
                      }
                    }
                  },
                },
              },
            },
          },
        },
      },
    })

    // Aplicar filtro de itens ADM aos siblingOrders também
    const filteredSiblingOrders = siblingOrders.map(order => ({
      ...order,
      items: order.items.filter(item => 
        item.itemType === 'DROPSHIPPING' || 
        (item.itemType === 'STOCK' && !item.sellerId) ||
        (!item.itemType && !item.sellerId)
      )
    }))

    allOrders = [mainOrder, ...filteredSiblingOrders]
    isHybridOrder = allOrders.length > 1
  }

  // Combinar todos os itens de todos os sub-pedidos
  const allItems = allOrders.flatMap(o => o.items)
  
  // Calcular totais combinados
  const combinedTotal = allOrders.reduce((sum, o) => sum + o.total, 0)
  const combinedShippingCost = allOrders.reduce((sum, o) => sum + (o.shippingCost || 0), 0)
  
  // Buscar embalagem se houver packagingBoxId
  const packagingBox = mainOrder.packagingBoxId 
    ? await prisma.packagingBox.findUnique({
        where: { id: mainOrder.packagingBoxId }
      })
    : null
  
  // Usar o primeiro pedido como referência principal
  const order = {
    ...mainOrder,
    items: allItems,
    total: combinedTotal,
    shippingCost: combinedShippingCost,
    packagingBox,
    // Adicionar informações híbridas
    isHybrid: isHybridOrder,
    subOrders: allOrders,
    parentOrderId: parentOrderId
  }

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      PENDING: 'bg-gray-100 text-gray-800',
      PROCESSING: 'bg-yellow-100 text-yellow-800',
      SHIPPED: 'bg-blue-100 text-blue-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    }
    return colorMap[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      PENDING: 'Pendente',
      PROCESSING: 'Processando',
      SHIPPED: 'Enviado',
      DELIVERED: 'Entregue',
      CANCELLED: 'Cancelado',
    }
    return statusMap[status] || status
  }

  // Função para formatar endereço (parse JSON se necessário)
  const formatShippingAddress = (address: string | null): string => {
    if (!address) return 'Endereço não informado'
    
    try {
      const parsed = JSON.parse(address)
      
      if (parsed.formatted) {
        return parsed.formatted
      }
      
      const parts = []
      if (parsed.street) parts.push(parsed.street)
      if (parsed.number && parsed.number !== 'SN') parts.push(parsed.number)
      if (parsed.complement) parts.push(parsed.complement)
      if (parsed.neighborhood) parts.push(parsed.neighborhood)
      if (parsed.city) parts.push(parsed.city)
      if (parsed.state) parts.push(parsed.state)
      if (parsed.zipCode) parts.push(`CEP: ${parsed.zipCode.replace(/(\d{5})(\d{3})/, '$1-$2')}`)
      
      return parts.join(', ') || address
    } catch {
      return address
    }
  }

  // Agrupar itens por fornecedor
  const itemsBySupplier = order.items.reduce((acc, item) => {
    const supplierId = item.product.supplierId || 'sem-fornecedor'
    const supplierName = item.product.supplier?.name || 'Sem fornecedor'
    
    if (!acc[supplierId]) {
      acc[supplierId] = {
        id: supplierId,
        name: supplierName,
        supplier: item.product.supplier,
        items: [],
        subtotal: 0,
      }
    }
    
    acc[supplierId].items.push(item)
    acc[supplierId].subtotal += item.price * item.quantity
    
    return acc
  }, {} as Record<string, any>)

  // Identificar vendedores envolvidos (DROP)
  const sellers = order.items
    .filter(item => item.itemType === 'DROPSHIPPING' && item.product.seller)
    .reduce((acc, item) => {
      const sellerId = item.product.sellerId!
      if (!acc[sellerId]) {
        acc[sellerId] = {
          seller: item.product.seller!,
          items: [],
          totalCommission: 0,
        }
      }
      acc[sellerId].items.push(item)
      // Comissão = preço * quantidade * taxa de comissão
      const commission = item.price * item.quantity * (item.product.dropshippingCommission || 0) / 100
      acc[sellerId].totalCommission += commission
      return acc
    }, {} as Record<string, any>)

  // Calcular custos e receitas (usando costPrice salvo no pedido)
  const itemsCostDetails = order.items.map(item => {
    // Prioridade: supplierCost > costPrice salvo no item > 70% do preço de venda
    const unitCost = item.supplierCost || item.costPrice || (item.price * 0.7)
    const totalCost = unitCost * item.quantity
    const hasRealCost = !!(item.supplierCost || item.costPrice)
    
    return {
      productId: item.productId,
      productName: item.product.name,
      unitCost,
      totalCost,
      hasRealCost,
      quantity: item.quantity,
      salePrice: item.price, // Preço de venda salvo no pedido
      // Dados da embalagem
      weight: item.product.weightWithPackage || item.product.weight,
      length: item.product.lengthWithPackage || item.product.length,
      width: item.product.widthWithPackage || item.product.width,
      height: item.product.heightWithPackage || item.product.height,
    }
  })
  
  const itemsCost = itemsCostDetails.reduce((sum, item) => sum + item.totalCost, 0)
  const hasAllRealCosts = itemsCostDetails.every(item => item.hasRealCost)
  
  // Custo da embalagem
  const packagingCost = order.packagingBox?.cost || 0

  const totalCommissions = Object.values(sellers).reduce((sum: number, s: any) => sum + s.totalCommission, 0)
  
  // Cálculo correto da receita líquida:
  // Total do pedido - Custo dos produtos - Custo da embalagem - Comissões DROP
  // Nota: O frete é receita (cobrado do cliente), não é descontado
  const totalCosts = itemsCost + packagingCost + totalCommissions
  const platformRevenue = order.total - totalCosts

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/pedidos"
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <FiArrowLeft size={24} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">
                Pedido {formatOrderNumber(order.parentOrderId || order.marketplaceOrderId || order.id)}
              </h1>
              {order.isHybrid && (
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
                  🔄 Híbrido ({order.subOrders.length} sub-pedidos)
                </span>
              )}
            </div>
            <p className="text-gray-600 mt-1">
              {order.marketplaceName && `Via ${order.marketplaceName} • `}
              Criado em <ClientDate date={order.createdAt} />
            </p>
            {order.isHybrid && (
              <div className="flex gap-2 mt-2">
                {order.subOrders.map((subOrder: any, idx: number) => {
                  const hasADM = subOrder.items.some((i: any) => (i.itemType === 'STOCK' || !i.itemType) && !i.sellerId)
                  const hasVendedor = subOrder.items.some((i: any) => (i.itemType === 'STOCK' || !i.itemType) && i.sellerId)
                  const hasDrop = subOrder.items.some((i: any) => i.itemType === 'DROPSHIPPING')
                  const tipo = hasADM ? 'ADM' : hasVendedor ? 'Vendedor' : hasDrop ? 'DROP' : 'Outro'
                  const cor = hasADM ? 'bg-green-100 text-green-700' : hasVendedor ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                  return (
                    <span key={subOrder.id} className={`px-2 py-0.5 rounded text-xs font-medium ${cor}`}>
                      {formatOrderNumber(subOrder.id)} ({tipo})
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {order.status !== 'CANCELLED' && (
            <>
              <UpdateOrderStatusButton orderId={order.id} currentStatus={order.status} />
              {order.sentToSupplier && (
                <ResetSupplierStatusButton orderId={order.id} />
              )}
              <SendToSupplierButton 
                orderId={order.id} 
                sentToSupplier={order.sentToSupplier}
              />
            </>
          )}
          {order.status === 'CANCELLED' && (
            <div className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold">
              ❌ Pedido Cancelado - Sem ações disponíveis
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações do Cliente */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-primary-100 rounded-lg">
              <FiUser className="text-primary-600" size={24} />
            </div>
            <h2 className="text-xl font-bold">Cliente</h2>
          </div>
          <div className="space-y-2">
            <p className="font-semibold">{order.buyerName || order.user?.name || 'N/A'}</p>
            <p className="text-gray-600">{order.buyerEmail || order.user?.email || 'N/A'}</p>
            {order.buyerPhone && (
              <p className="text-gray-600">📱 {order.buyerPhone}</p>
            )}
            {order.buyerCpf && (
              <p className="text-gray-600">CPF: {order.buyerCpf}</p>
            )}
            {order.paymentMethod && (
              <p className="text-sm text-gray-500 mt-2">
                Pagamento: <span className="font-semibold">{order.paymentMethod.toUpperCase()}</span>
              </p>
            )}
          </div>
        </div>

        {/* Endereço de Entrega */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FiMapPin className="text-blue-600" size={24} />
            </div>
            <h2 className="text-xl font-bold">Endereço</h2>
          </div>
          <p className="text-gray-600 whitespace-pre-line">
            {formatShippingAddress(order.shippingAddress)}
          </p>
          <p className="text-sm text-gray-500 mt-3">
            Frete: <span className="font-semibold">
              {order.shippingCost && order.shippingCost > 0 
                ? `R$ ${order.shippingCost.toFixed(2)}` 
                : '🎁 Frete Grátis'}
            </span>
            {order.deliveryDays && (
              <span className="ml-2 text-gray-600">({order.deliveryDays} dias úteis)</span>
            )}
          </p>
        </div>

        {/* Status e Rastreio */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <FiTruck className="text-green-600" size={24} />
            </div>
            <h2 className="text-xl font-bold">Status</h2>
          </div>
          <div className="space-y-3">
            <div>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                {getStatusText(order.status)}
              </span>
            </div>
            {order.trackingCode && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Código de Rastreio</p>
                <p className="font-mono font-semibold">{order.trackingCode}</p>
              </div>
            )}
            {order.sentToSupplier && order.sentToSupplierAt && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Enviado ao fornecedor</p>
                <p className="text-sm">
                  <ClientDate date={order.sentToSupplierAt} />
                </p>
              </div>
            )}
            {order.cancelReason && (
              <div className="mt-3 p-3 bg-red-50 rounded-lg">
                <p className="text-sm font-semibold text-red-800 mb-1">Motivo do Cancelamento</p>
                <p className="text-sm text-red-700">{order.cancelReason}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Mensagens do Comprador */}
      {order.buyerMessages && (
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <FiMessageCircle className="text-purple-600" size={24} />
            </div>
            <h2 className="text-xl font-bold">Mensagens do Comprador</h2>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 whitespace-pre-line text-gray-700">
            {order.buyerMessages}
          </div>
        </div>
      )}

      {/* Cards de Vendedores (Dropshipping) */}
      {Object.keys(sellers).length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <FiShoppingBag className="text-indigo-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Vendedores (Dropshipping)</h2>
              <p className="text-sm text-gray-600">Produtos vendidos através de dropshipping</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {Object.values(sellers).map((sellerData: any) => (
              <div key={sellerData.seller.id} className="border rounded-lg p-4 bg-gradient-to-br from-indigo-50 to-white">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      👤 {sellerData.seller.storeName}
                    </h3>
                    <p className="text-sm text-gray-600">{sellerData.seller.user?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Comissão Total</p>
                    <p className="text-lg font-bold text-green-600">
                      R$ {sellerData.totalCommission.toFixed(2)}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t">
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium">📧 {sellerData.seller.user?.email || 'N/A'}</p>
                  </div>
                  {sellerData.seller.user?.phone && (
                    <div>
                      <p className="text-xs text-gray-500">Telefone</p>
                      <p className="text-sm font-medium">📱 {sellerData.seller.user.phone}</p>
                    </div>
                  )}
                  {(sellerData.seller.cpf || sellerData.seller.cnpj) && (
                    <div>
                      <p className="text-xs text-gray-500">CPF/CNPJ</p>
                      <p className="text-sm font-medium">{sellerData.seller.cpf || sellerData.seller.cnpj}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-500">Produtos DROP</p>
                    <p className="text-sm font-medium">📦 {sellerData.items.length} {sellerData.items.length === 1 ? 'item' : 'itens'}</p>
                  </div>
                </div>

                {/* Lista de produtos do vendedor */}
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-500 mb-2">Produtos deste vendedor:</p>
                  <div className="space-y-1">
                    {sellerData.items.map((item: any) => {
                      const commission = item.price * item.quantity * (item.product.dropshippingCommission || 0) / 100
                      return (
                        <div key={item.id} className="flex justify-between text-sm bg-white rounded px-2 py-1">
                          <span>📦 {item.product.name} (x{item.quantity})</span>
                          <span className="text-green-600 font-medium">
                            +R$ {commission.toFixed(2)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumo Financeiro Detalhado */}
      <div className="mt-6 bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-emerald-100 rounded-lg">
            <FiDollarSign className="text-emerald-600" size={24} />
          </div>
          <h2 className="text-xl font-bold">Análise Financeira</h2>
        </div>
        
        <div className="space-y-3">
          {/* Receita Bruta */}
          <div className="flex justify-between items-center pb-3 border-b">
            <span className="text-gray-700">💰 Receita Bruta (Produtos)</span>
            <span className="font-bold text-lg">
              R$ {(order.total - (order.shippingCost || 0) + (order.discountAmount || 0)).toFixed(2)}
            </span>
          </div>

          {order.shippingCost > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-gray-700">🚚 Frete</span>
              <span className="font-semibold">
                R$ {order.shippingCost.toFixed(2)}
              </span>
            </div>
          )}

          {/* Cupom e Desconto */}
          {order.couponCode && (
            <div className="flex justify-between items-center text-purple-600">
              <span>🎟️ Cupom: <span className="font-mono font-bold">{order.couponCode}</span></span>
              <span className="font-semibold">
                - R$ {(order.discountAmount || 0).toFixed(2)}
              </span>
            </div>
          )}

          {/* Desconto sem cupom (PIX, Boleto, etc) */}
          {!order.couponCode && (order.discountAmount || 0) > 0 && (
            <div className="flex justify-between items-center text-green-600">
              <span>💸 Desconto ({order.paymentType === 'pix' ? 'PIX' : order.paymentType === 'boleto' ? 'Boleto' : 'Pagamento'})</span>
              <span className="font-semibold">
                - R$ {(order.discountAmount || 0).toFixed(2)}
              </span>
            </div>
          )}

          {/* Comissões DROP */}
          {totalCommissions > 0 && (
            <div className="flex justify-between items-center text-orange-600">
              <span>📦 Comissões Dropshipping ({Object.keys(sellers).length} {Object.keys(sellers).length === 1 ? 'vendedor' : 'vendedores'})</span>
              <span className="font-semibold">
                - R$ {totalCommissions.toFixed(2)}
              </span>
            </div>
          )}

          {/* Custo dos Produtos - Detalhado */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-red-600">
              <span>🏭 Custo dos Produtos {hasAllRealCosts ? '' : '(estimado)'}</span>
              <span className="font-semibold">
                - R$ {itemsCost.toFixed(2)}
              </span>
            </div>
            
            {/* Detalhamento por produto */}
            <div className="ml-4 space-y-1 text-xs text-gray-600">
              {itemsCostDetails.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start border-l-2 border-gray-200 pl-2">
                  <div>
                    <span className="font-medium">{item.productName.substring(0, 30)}{item.productName.length > 30 ? '...' : ''}</span>
                    <span className="text-gray-400 ml-1">x{item.quantity}</span>
                    {!item.hasRealCost && <span className="text-orange-500 ml-1">(~)</span>}
                    {/* Dimensões do produto */}
                    {(item.weight || item.length || item.width || item.height) && (
                      <div className="text-gray-400 flex gap-2">
                        {item.weight && <span>⚖️ {item.weight}kg</span>}
                        {item.length && item.width && item.height && (
                          <span>📐 {item.length}x{item.width}x{item.height}cm</span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="whitespace-nowrap">
                    R$ {item.unitCost.toFixed(2)} = R$ {item.totalCost.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Embalagem utilizada */}
          {order.packagingBox && (
            <div className="flex justify-between items-center text-red-600">
              <div className="flex items-center gap-2">
                <span>📦 Embalagem:</span>
                <span className="font-bold">{order.packagingBox.code}</span>
                <span className="text-sm text-gray-500">({order.packagingBox.name} - {order.packagingBox.outerLength}x{order.packagingBox.outerWidth}x{order.packagingBox.outerHeight}cm)</span>
              </div>
              <span className="font-semibold">
                - R$ {packagingCost.toFixed(2)}
              </span>
            </div>
          )}

          {/* Total de Custos */}
          <div className="flex justify-between items-center text-gray-700 pt-2 border-t border-gray-200">
            <span className="font-medium">📊 Total de Custos</span>
            <span className="font-semibold">
              - R$ {totalCosts.toFixed(2)}
            </span>
          </div>

          {/* Receita Líquida da Plataforma */}
          <div className="flex justify-between items-center pt-3 border-t-2 border-emerald-200">
            <span className="font-bold text-emerald-700">💎 Receita Líquida Plataforma</span>
            <span className="font-bold text-xl text-emerald-600">
              R$ {platformRevenue.toFixed(2)}
            </span>
          </div>

          {/* Total Recebido */}
          <div className="flex justify-between items-center pt-3 border-t-2 bg-gradient-to-r from-primary-50 to-transparent -mx-6 px-6 py-3 rounded">
            <span className="font-bold text-lg">🏆 Total do Pedido</span>
            <span className="font-bold text-2xl text-primary-600">
              R$ {order.total.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Observação */}
        {!hasAllRealCosts && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
            💡 <strong>Nota:</strong> Produtos marcados com (~) têm custo estimado em 70% do preço de venda. 
            Para valores precisos, configure o custo real no cadastro de cada produto.
          </div>
        )}
      </div>

      {/* Itens por Fornecedor */}
      <div className="mt-6 space-y-6">
        {/* Status AliExpress (se houver pedido AliExpress) */}
        {order.supplierOrderId && order.items.some(item => 
          item.product.supplier?.name?.toLowerCase().includes('aliexpress')
        ) && (
          <AliExpressOrderStatus 
            orderId={order.id}
            aliexpressOrderId={order.supplierOrderId}
          />
        )}

        {Object.values(itemsBySupplier).map((supplierGroup: any) => (
          <div key={supplierGroup.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <FiPackage className="text-orange-600" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{supplierGroup.name}</h2>
                  {supplierGroup.supplier && (
                    <p className="text-sm text-gray-600">
                      {supplierGroup.supplier.apiUrl ? '🟢 API Integrada' : '🟡 Envio Manual'}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Subtotal</p>
                <p className="text-2xl font-bold text-primary-600">
                  R$ {supplierGroup.subtotal.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Produto</th>
                    <th className="text-left py-3 px-4 font-semibold">Variações</th>
                    <th className="text-left py-3 px-4 font-semibold">Tipo</th>
                    <th className="text-left py-3 px-4 font-semibold">SKU Fornecedor</th>
                    <th className="text-center py-3 px-4 font-semibold">Qtd</th>
                    <th className="text-right py-3 px-4 font-semibold">Preço Un.</th>
                    <th className="text-right py-3 px-4 font-semibold">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierGroup.items.map((item: any) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-semibold">{item.product.name}</p>
                        {item.product.seller && (
                          <p className="text-xs text-indigo-600 mt-1">
                            👤 Vendedor: {item.product.seller.storeName}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {item.selectedSize && (
                            <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded font-medium mr-1">
                              📐 Tamanho: {item.selectedSize}
                            </span>
                          )}
                          {item.selectedColor && (
                            <span className="inline-block px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded font-medium">
                              🎨 Cor: {item.selectedColor}
                            </span>
                          )}
                          {!item.selectedSize && !item.selectedColor && (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {item.itemType === 'DROPSHIPPING' ? (
                          <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded font-semibold">
                            📦 DROP
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-700 rounded font-semibold">
                            🏪 ADM
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-mono text-sm">
                          {item.product.supplierSku || 'N/A'}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-3 py-1 bg-gray-100 rounded-full font-semibold">
                          {item.quantity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        R$ {item.price.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        R$ {(item.price * item.quantity).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Instruções de envio manual */}
            {supplierGroup.supplier && !supplierGroup.supplier.apiUrl && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="font-semibold text-yellow-800 mb-2">📋 Envio Manual Necessário</p>
                <p className="text-sm text-yellow-700">
                  Este fornecedor não possui API integrada. Acesse o painel do fornecedor e crie
                  o pedido manualmente com os itens listados acima.
                </p>
                {supplierGroup.supplier.website && (
                  <a
                    href={supplierGroup.supplier.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-sm text-blue-600 hover:underline"
                  >
                    Acessar site do fornecedor →
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
