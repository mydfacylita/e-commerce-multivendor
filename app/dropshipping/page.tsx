import Link from 'next/link';
import { FiShoppingBag, FiShoppingCart, FiPackage, FiRefreshCw } from 'react-icons/fi';

export default function DropshippingOptionsPage() {
  return (
    <div className="max-w-4xl mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8 text-center">Escolha o Fornecedor Dropshipping</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-red-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">AliExpress</h3>
            <FiShoppingCart size={32} />
          </div>
          <p className="text-sm mb-4 opacity-90">
            Importe produtos do AliExpress
          </p>
          <Link
            href="/admin/integracao/aliexpress"
            className="block bg-white text-orange-600 text-center py-2 rounded-md font-semibold hover:bg-orange-50"
          >
            Selecionar
          </Link>
        </div>
        <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Amazon</h3>
            <FiPackage size={32} />
          </div>
          <p className="text-sm mb-4 opacity-90">
            Em breve integração com Amazon
          </p>
          <button
            disabled
            className="w-full bg-white/50 text-white text-center py-2 rounded-md font-semibold cursor-not-allowed"
          >
            Em breve
          </button>
        </div>
        <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Shopee</h3>
            <FiRefreshCw size={32} />
          </div>
          <p className="text-sm mb-4 opacity-90">
            Em breve integração com Shopee
          </p>
          <button
            disabled
            className="w-full bg-white/50 text-white text-center py-2 rounded-md font-semibold cursor-not-allowed"
          >
            Em breve
          </button>
        </div>
      </div>
    </div>
  );
}
