import Link from 'next/link'
import { FiFacebook, FiInstagram, FiTwitter, FiMail } from 'react-icons/fi'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">E-Shop</h3>
            <p className="text-gray-400">
              Sua loja online completa com os melhores produtos e preços.
            </p>
            <div className="flex space-x-4 mt-4">
              <a href="#" className="hover:text-primary-400">
                <FiFacebook size={20} />
              </a>
              <a href="#" className="hover:text-primary-400">
                <FiInstagram size={20} />
              </a>
              <a href="#" className="hover:text-primary-400">
                <FiTwitter size={20} />
              </a>
              <a href="#" className="hover:text-primary-400">
                <FiMail size={20} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Empresa</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="/sobre" className="hover:text-white">
                  Sobre Nós
                </Link>
              </li>
              <li>
                <Link href="/contato" className="hover:text-white">
                  Contato
                </Link>
              </li>
              <li>
                <Link href="/carreiras" className="hover:text-white">
                  Carreiras
                </Link>
              </li>
              <li>
                <Link href="/vendedor/cadastro" className="hover:text-white font-semibold text-accent-500">
                  🤝 Seja um Parceiro
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Suporte</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="/faq" className="hover:text-white">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/envio" className="hover:text-white">
                  Envio
                </Link>
              </li>
              <li>
                <Link href="/devolucoes" className="hover:text-white">
                  Devoluções
                </Link>
              </li>
              <li>
                <Link href="/rastreamento" className="hover:text-white">
                  Rastreamento
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Newsletter</h4>
            <p className="text-gray-400 mb-4">
              Receba nossas ofertas e novidades
            </p>
            <form className="flex">
              <input
                type="email"
                placeholder="Seu e-mail"
                className="flex-1 px-4 py-2 rounded-l-md text-gray-900"
              />
              <button className="bg-primary-600 px-4 py-2 rounded-r-md hover:bg-primary-700">
                Enviar
              </button>
            </form>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2026 E-Shop. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
