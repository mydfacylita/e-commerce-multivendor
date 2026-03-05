import Link from 'next/link'
import { Metadata } from 'next'
import { FiBriefcase } from 'react-icons/fi'

export const metadata: Metadata = {
  title: 'Carreiras | MYDSHOP',
  description: 'Trabalhe conosco na MYDSHOP. Veja as oportunidades de carreira disponíveis.',
}

export default function CarreirasPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-50 rounded-full mb-6">
        <FiBriefcase size={32} className="text-primary-600" />
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-3">Trabalhe Conosco</h1>
      <p className="text-gray-500 text-lg mb-8">
        Fazemos parte de um marketplace em crescimento e estamos sempre em busca de talentos.
      </p>

      <div className="bg-gray-50 border rounded-xl p-8 mb-8">
        <p className="text-gray-600 text-base">
          No momento <strong>não temos vagas abertas</strong>, mas você pode nos enviar seu currículo
          para ficar em nosso banco de talentos.
        </p>
      </div>

      <Link
        href="/contato"
        className="inline-block bg-primary-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors"
      >
        Enviar Currículo
      </Link>

      <p className="text-sm text-gray-400 mt-6">
        Envie uma mensagem pelo formulário de contato com o assunto "Currículo" e anexe seu LinkedIn ou portfólio.
      </p>
    </main>
  )
}
