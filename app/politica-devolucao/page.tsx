'use client'

import { Clock, AlertTriangle, Package } from 'lucide-react'

export default function PoliticaDevolucaoPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Política de Cancelamento e Devoluções – MYDSHOP</h1>
        <p className="text-gray-600">
          Entenda seus direitos e como proceder com cancelamentos e devoluções
        </p>
      </div>

      {/* 1. Cancelamento de Pedidos */}
      <div className="mb-8 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">1. Cancelamento de Pedidos</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <p><strong>1.1.</strong> O cliente pode solicitar o cancelamento de um pedido antes do envio sem qualquer custo adicional.</p>
            <p><strong>1.2.</strong> Para cancelar, o cliente deve entrar em contato pelo e-mail ou canal de atendimento da MYDSHOP, informando o número do pedido.</p>
            <p><strong>1.3.</strong> Caso o pedido já tenha sido enviado, o cancelamento não poderá ser realizado. Nesse caso, o cliente poderá solicitar a devolução conforme as regras abaixo.</p>
          </div>
        </div>
      </div>

      {/* 2. Direito de Arrependimento */}
      <div className="mb-8 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">2. Direito de Arrependimento</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <p><strong>2.1.</strong> O cliente tem o direito de desistir da compra no prazo de <strong>7 dias corridos</strong> a contar do recebimento do produto, conforme previsto no Código de Defesa do Consumidor.</p>
            <p><strong>2.2.</strong> Para exercer o direito de arrependimento, o cliente deve comunicar a MYDSHOP pelo e-mail ou formulário de contato, mencionando o número do pedido e a intenção de devolver o produto.</p>
            <p><strong>2.3.</strong> O produto deve ser devolvido em sua embalagem original, sem indícios de uso, com todos os acessórios, manuais, etiquetas e nota fiscal.</p>
          </div>
        </div>
      </div>

      {/* 3. Devolução por Defeito ou Divergência */}
      <div className="mb-8 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">3. Devolução por Defeito ou Divergência</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <p><strong>3.1.</strong> Produtos com defeito ou que não correspondam ao pedido podem ser devolvidos em até <strong>30 dias</strong> após o recebimento.</p>
            <p><strong>3.2.</strong> Antes de autorizar a devolução, a MYDSHOP poderá solicitar fotos ou vídeos que comprovem o problema.</p>
            <p><strong>3.3.</strong> Após análise e confirmação do defeito ou erro, a MYDSHOP realizará a troca ou o reembolso conforme a escolha do cliente.</p>
          </div>
        </div>
      </div>

      {/* 4. Procedimento de Devolução */}
      <div className="mb-8 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">4. Procedimento de Devolução</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <p><strong>4.1.</strong> Para iniciar uma devolução, o cliente deve solicitar a autorização pelo canal de atendimento da MYDSHOP.</p>
            <p><strong>4.2.</strong> A devolução só será aceita mediante autorização prévia e envio dentro do prazo estabelecido.</p>
            <p><strong>4.3.</strong> A devolução deve ser feita por meio dos correios ou transportadora, conforme instruções fornecidas no processo de autorização.</p>
          </div>
        </div>
      </div>

      {/* 5. Reembolso */}
      <div className="mb-8 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">5. Reembolso</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <p><strong>5.1.</strong> O reembolso será realizado após o recebimento e a conferência do produto devolvido.</p>
            <p><strong>5.2.</strong> O valor será estornado pelo mesmo meio de pagamento utilizado na compra.</p>
            <p><strong>5.3.</strong> Em caso de pagamento por cartão de crédito, o estorno será processado conforme a administradora do cartão, podendo levar alguns dias para refletir na fatura.</p>
          </div>
        </div>
      </div>

      {/* 6. Itens Não Elegíveis para Devolução */}
      <div className="mb-8 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">6. Itens Não Elegíveis para Devolução</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <p><strong>6.1.</strong> Produtos personalizados ou confeccionados sob medida, quando legais e aplicáveis, só poderão ser devolvidos em caso de defeito.</p>
            <p><strong>6.2.</strong> Itens que tenham sinais evidentes de uso ou que não estejam em conformidade com as condições de devolução poderão ser recusados.</p>
          </div>
        </div>
      </div>

      {/* 7. Disposições Gerais */}
      <div className="mb-8 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">7. Disposições Gerais</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <p><strong>7.1.</strong> A MYDSHOP reserva-se o direito de alterar esta política quando necessário, sendo a versão mais atualizada sempre disponível no site.</p>
            <p><strong>7.2.</strong> Quaisquer dúvidas podem ser esclarecidas pelo e-mail de atendimento ao cliente.</p>
          </div>
        </div>
      </div>

      {/* Resumo Rápido */}
      <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-blue-800">📋 Resumo Rápido</h2>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="text-center p-4 bg-white rounded-lg border border-blue-100">
            <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <h3 className="font-semibold text-blue-800">Arrependimento</h3>
            <p className="text-blue-700">7 dias corridos</p>
          </div>
          <div className="text-center p-4 bg-white rounded-lg border border-blue-100">
            <AlertTriangle className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <h3 className="font-semibold text-blue-800">Defeito/Erro</h3>
            <p className="text-blue-700">30 dias</p>
          </div>
          <div className="text-center p-4 bg-white rounded-lg border border-blue-100">
            <Package className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <h3 className="font-semibold text-blue-800">Cancelamento</h3>
            <p className="text-blue-700">Antes do envio</p>
          </div>
        </div>
      </div>

      {/* Contato */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">💬 Precisa de Ajuda?</h2>
        <p className="mb-4">
          Para solicitar cancelamentos, devoluções ou esclarecer dúvidas sobre esta política, entre em contato conosco:
        </p>
        <div className="space-y-2 text-sm">
          <p><strong>Email:</strong> atendimento@mydshop.com.br</p>
          <p><strong>Horário:</strong> Segunda a sexta, 9h às 18h</p>
        </div>
      </div>
    </div>
  )
}