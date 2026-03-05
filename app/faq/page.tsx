import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Perguntas Frequentes (FAQ) | MYDSHOP',
  description: 'Tire suas dúvidas sobre compras, pagamentos, entregas e devoluções na MYDSHOP.',
}

const faqs = [
  {
    category: 'Pedidos e Pagamento',
    items: [
      {
        q: 'Quais formas de pagamento são aceitas?',
        a: 'Aceitamos cartão de crédito (Visa, Mastercard, Elo, American Express), Pix e boleto bancário. O Pix é compensado instantaneamente e o boleto em até 3 dias úteis.',
      },
      {
        q: 'Posso parcelar minha compra?',
        a: 'Sim! O parcelamento está disponível no cartão de crédito. O número de parcelas e as condições variam conforme o valor do pedido e o vendedor.',
      },
      {
        q: 'Como acompanho meu pedido?',
        a: 'Após a confirmação do pagamento, você receberá um e-mail com o código de rastreamento dos Correios. Você também pode acompanhar diretamente na página de Rastreamento do nosso site.',
      },
    ],
  },
  {
    category: 'Entrega e Frete',
    items: [
      {
        q: 'Qual o prazo de entrega?',
        a: 'O prazo de entrega varia conforme a sua localização e o produto. Calculamos o frete diretamente pelo CEP na página do produto. Produtos com estoque local costumam ser entregues em 3 a 10 dias úteis.',
      },
      {
        q: 'O frete é gratuito?',
        a: 'Alguns produtos e vendedores oferecem frete grátis. O valor do frete é calculado no carrinho antes de você finalizar a compra.',
      },
      {
        q: 'Posso retirar o produto na loja?',
        a: 'Depende do vendedor. Verifique na página do produto se a opção de retirada está disponível.',
      },
    ],
  },
  {
    category: 'Devoluções e Trocas',
    items: [
      {
        q: 'Posso devolver um produto?',
        a: 'Sim. Você tem até 7 dias corridos após o recebimento para solicitar a devolução por arrependimento (Código de Defesa do Consumidor). Para produtos com defeito, o prazo é de 30 dias para produtos não duráveis e 90 dias para duráveis.',
      },
      {
        q: 'Como solicitar uma devolução?',
        a: 'Acesse Minha Conta → Pedidos → selecione o pedido e clique em "Solicitar Devolução". Nossa equipe entrará em contato em até 2 dias úteis.',
      },
    ],
  },
  {
    category: 'Conta e Segurança',
    items: [
      {
        q: 'Como criar uma conta?',
        a: 'Clique em "Entrar" no topo do site e depois em "Criar conta". Preencha seus dados e confirme seu e-mail.',
      },
      {
        q: 'Esqueci minha senha, como recuperar?',
        a: 'Na tela de login, clique em "Esqueci minha senha". Enviaremos um link de recuperação para o e-mail cadastrado.',
      },
      {
        q: 'Meus dados estão seguros?',
        a: 'Sim. Seus dados são protegidos conforme a Lei Geral de Proteção de Dados (LGPD). Não compartilhamos seus dados com terceiros sem sua autorização. Consulte nossa Política de Privacidade para mais detalhes.',
      },
    ],
  },
]

export default function FaqPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Perguntas Frequentes</h1>
      <p className="text-gray-500 mb-10">
        Não encontrou o que procura?{' '}
        <Link href="/contato" className="text-primary-600 hover:underline">
          Entre em contato conosco
        </Link>
        .
      </p>

      <div className="space-y-10">
        {faqs.map((section) => (
          <section key={section.category}>
            <h2 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">
              {section.category}
            </h2>
            <div className="space-y-5">
              {section.items.map((item) => (
                <div key={item.q}>
                  <h3 className="font-medium text-gray-900 mb-1">{item.q}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 p-6 bg-gray-50 rounded-xl border text-center">
        <p className="text-gray-700 font-medium mb-2">Ainda tem dúvidas?</p>
        <p className="text-gray-500 text-sm mb-4">Nossa equipe está pronta para ajudar.</p>
        <Link
          href="/contato"
          className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
        >
          Falar com o suporte
        </Link>
      </div>
    </main>
  )
}
