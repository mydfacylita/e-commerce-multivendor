'use client'

import { FiFileText } from 'react-icons/fi'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default function NotasFiscaisPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Notas Fiscais</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center text-gray-500">
          <FiFileText className="mx-auto text-5xl mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">Em breve</h3>
          <p className="text-sm">Esta página está em desenvolvimento.</p>
          <p className="text-sm mt-2">Aqui você poderá gerenciar a emissão e controle de notas fiscais (NFe).</p>
        </div>
      </div>
    </div>
  )
}
