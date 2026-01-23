'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiPackage, FiCopy, FiDownload, FiInfo } from 'react-icons/fi'
import { toast } from 'react-hot-toast'

interface EANCredit {
  id: string
  type: 'OFFICIAL' | 'INTERNAL'
  quantity: number
  used: number
  expiresAt?: string
}

interface EANCode {
  id: string
  code: string
  type: 'OFFICIAL' | 'INTERNAL'
  used: boolean
  productId?: string
  productName?: string
  productSlug?: string
  productActive?: boolean
  createdAt: string
}

interface EANPackage {
  id: string
  name: string
  quantity: number
  price: number
  type: 'OFFICIAL' | 'INTERNAL'
  popular?: boolean
}

export default function VendedorEANPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [myEANs, setMyEANs] = useState<EANCode[]>([])
  const [credits, setCredits] = useState<EANCredit[]>([])
  const [packages, setPackages] = useState<EANPackage[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Carregar pacotes disponíveis
      const resPkgs = await fetch('/api/vendedor/ean/packages')
      if (resPkgs.ok) {
        const dataPkgs = await resPkgs.json()
        setPackages(dataPkgs.packages || [])
      }

      // Carregar EANs disponíveis
      const resEANs = await fetch('/api/vendedor/ean/my-codes')
      if (resEANs.ok) {
        const dataEANs = await resEANs.json()
        setMyEANs(dataEANs.codes || [])
      }

      // Carregar créditos
      const resCredits = await fetch('/api/vendedor/ean/credits')
      if (resCredits.ok) {
        const dataCredits = await resCredits.json()
        setCredits(dataCredits.credits || [])
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestPackage = async (pkg: EANPackage) => {
    if (pkg.price === 0) {
      // Solicitar pacote grátis
      try {
        const res = await fetch('/api/vendedor/ean/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            packageId: pkg.id,
            quantity: pkg.quantity,
            type: pkg.type,
            price: 0
          })
        })

        if (res.ok) {
          toast.success('Solicitação enviada! Aguarde aprovação do administrador.')
          setTimeout(() => loadData(), 2000)
        } else {
          const error = await res.json()
          toast.error(error.message || 'Erro ao solicitar códigos')
        }
      } catch (error) {
        toast.error('Erro ao enviar solicitação')
      }
    } else {
      // Redirecionar para checkout (pagamento)
      router.push(`/vendedor/ean/checkout?package=${pkg.id}`)
    }
  }

  const copyEAN = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success('Código copiado!')
  }

  const downloadEANs = () => {
    const codes = myEANs.filter(e => !e.used).map(e => e.code)
    const content = codes.join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `eans-${new Date().getTime()}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Download iniciado!')
  }

  const totalCredits = credits.reduce((sum, c) => sum + (c.quantity - c.used), 0)
  const usedEANs = myEANs.filter(e => e.productId != null)
  const availableEANs = myEANs.filter(e => e.productId == null)

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FiPackage className="w-8 h-8" />
                <h1 className="text-3xl font-bold">Códigos EAN</h1>
              </div>
              <p className="text-blue-100">Solicite códigos de barras para seus produtos</p>
            </div>
            
            <div className="text-right">
              <p className="text-sm text-blue-100">Disponíveis / Em Uso</p>
              <p className="text-4xl font-bold">{availableEANs.length} / {usedEANs.length}</p>
              <p className="text-xs text-blue-100 mt-1">Total: {myEANs.length}</p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
          <div className="flex gap-3">
            <FiInfo className="text-blue-600 w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 mb-1">📊 Como funciona?</p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>1️⃣ <strong>Escolha o pacote</strong> desejado abaixo</li>
                <li>2️⃣ <strong>Faça o pagamento</strong> (se for pacote pago)</li>
                <li>3️⃣ <strong>Aguarde aprovação</strong> do administrador (até 24h)</li>
                <li>4️⃣ <strong>Receba os códigos</strong> prontos para usar</li>
              </ul>
              <p className="mt-2 text-xs text-blue-700">
                <strong>EAN Interno (200-xxx):</strong> Gratuito, uso no marketplace | 
                <strong className="ml-2">EAN Oficial GS1 (789-xxx):</strong> Pago, válido em qualquer lugar
              </p>
            </div>
          </div>
        </div>

        {/* Packages Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Pacotes Disponíveis</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`bg-white rounded-xl border-2 p-6 hover:shadow-xl transition-all relative ${
                  pkg.popular ? 'border-blue-600' : 'border-gray-200'
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      🔥 MAIS POPULAR
                    </span>
                  </div>
                )}

                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{pkg.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    {Number(pkg.price) === 0 ? (
                      <span className="text-3xl font-bold text-green-600">GRÁTIS</span>
                    ) : (
                      <>
                        <span className="text-sm text-gray-500">R$</span>
                        <span className="text-3xl font-bold text-gray-900">{Number(pkg.price).toFixed(2)}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-green-600">✓</span>
                    <span>{pkg.quantity} códigos EAN</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-green-600">✓</span>
                    <span>
                      {pkg.type === 'OFFICIAL' ? 'Oficial GS1 (789-xxx)' : 'Interno (200-xxx)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-green-600">✓</span>
                    <span>
                      {pkg.type === 'OFFICIAL' ? 'Válido em qualquer lugar' : 'Uso no marketplace'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleRequestPackage(pkg)}
                  className="w-full py-3 px-4 rounded-lg font-medium transition-colors bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {Number(pkg.price) === 0 ? `Solicitar Grátis` : `Comprar por R$ ${Number(pkg.price).toFixed(2)}`}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Meus Códigos EAN */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Meus Códigos EAN</h2>
              <p className="text-sm text-gray-600">
                {availableEANs.length} disponíveis · {usedEANs.length} em uso · {myEANs.length} total
              </p>
            </div>
            {availableEANs.length > 0 && (
              <button
                onClick={downloadEANs}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <FiDownload />
                Baixar Todos
              </button>
            )}
          </div>

          {myEANs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FiPackage className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Você ainda não possui códigos EAN</p>
              <p className="text-sm mt-2">Escolha um pacote acima para começar</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {myEANs.map((ean) => {
                const isUsed = ean.productId != null
                return (
                  <div
                    key={ean.id}
                    className={`flex flex-col bg-gray-50 p-4 rounded-lg border transition-colors ${
                      isUsed 
                        ? 'border-green-300 bg-green-50' 
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <code className="text-sm font-mono font-medium text-gray-800">{ean.code}</code>
                        <p className="text-xs text-gray-500 mt-1">
                          {ean.type === 'OFFICIAL' ? '🏆 Oficial GS1' : '🏪 Interno'}
                        </p>
                      </div>
                      <button
                        onClick={() => copyEAN(ean.code)}
                        className="text-blue-600 hover:text-blue-700 p-2"
                        title="Copiar código"
                      >
                        <FiCopy className="w-5 h-5" />
                      </button>
                    </div>
                    
                    {isUsed ? (
                      <div className="mt-2 pt-2 border-t border-green-200">
                        <p className="text-xs font-medium text-green-700">✓ Em uso</p>
                        <a 
                          href={`/vendedor/produtos/${ean.productSlug}`}
                          className="text-xs text-blue-600 hover:underline mt-1 block truncate"
                          title={ean.productName}
                        >
                          {ean.productName}
                        </a>
                        {!ean.productActive && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">
                            Produto inativo
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500">💤 Disponível</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
