'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { 

// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

  FiArrowLeft, FiTruck, FiPackage, FiSave, FiRefreshCw, 
  FiSearch, FiMapPin, FiClock, FiDollarSign, FiCheckCircle,
  FiAlertCircle, FiSettings
} from 'react-icons/fi'

interface CorreiosConfig {
  enabled: boolean
  usuario: string
  senha: string
  codigoAdministrativo: string
  cartaoPostagem: string
  cnpj: string
  cepOrigem: string
  // Porcentagem extra para compensar embalagem
  percentualExtra: number
  // Serviços habilitados
  servicoSedex: boolean
  servicoPac: boolean
  servicoSedex10: boolean
  servicoSedex12: boolean
  servicoSedexHoje: boolean
}

interface QuoteResult {
  servico: string
  codigo: string
  valor: number
  prazo: number
  erro?: string
}

export default function EnviosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testingApi, setTestingApi] = useState(false)
  const [apiTestResult, setApiTestResult] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'config' | 'test' | 'tracking'>('config')
  
  const [config, setConfig] = useState<CorreiosConfig>({
    enabled: false,
    usuario: '',
    senha: '',
    codigoAdministrativo: '',
    cartaoPostagem: '',
    cnpj: '',
    cepOrigem: '',
    percentualExtra: 2,
    servicoSedex: true,
    servicoPac: true,
    servicoSedex10: false,
    servicoSedex12: false,
    servicoSedexHoje: false,
  })

  // Teste de cotação
  const [cepDestino, setCepDestino] = useState('')
  const [peso, setPeso] = useState('0.5')
  const [comprimento, setComprimento] = useState('20')
  const [altura, setAltura] = useState('10')
  const [largura, setLargura] = useState('15')
  const [quoteResults, setQuoteResults] = useState<QuoteResult[]>([])

  // Rastreamento
  const [codigoRastreio, setCodigoRastreio] = useState('')
  const [rastreioResult, setRastreioResult] = useState<any>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      loadConfig()
    }
  }, [status, router])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/config/correios')
      if (response.ok) {
        const data = await response.json()
        if (data.config) {
          setConfig(data.config)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/admin/config/correios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config })
      })

      if (response.ok) {
        toast.success('Configurações salvas com sucesso!')
      } else {
        toast.error('Erro ao salvar configurações')
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast.error('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  const testApiConnection = async () => {
    try {
      setTestingApi(true)
      setApiTestResult(null)
      
      const response = await fetch('/api/admin/config/correios/test-api', {
        method: 'POST'
      })
      
      const data = await response.json()
      setApiTestResult(data)
      
      if (data.success) {
        toast.success('API dos Correios funcionando!')
      } else {
        toast.error(data.message || 'Erro ao testar API')
      }
    } catch (error) {
      console.error('Erro ao testar API:', error)
      toast.error('Erro ao testar conexão com API')
    } finally {
      setTestingApi(false)
    }
  }

  const testQuote = async () => {
    if (!cepDestino || cepDestino.length < 8) {
      toast.error('Informe um CEP de destino válido')
      return
    }

    try {
      setTesting(true)
      setQuoteResults([])
      
      const response = await fetch('/api/shipping/correios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cepOrigem: config.cepOrigem,
          cepDestino: cepDestino.replace(/\D/g, ''),
          peso: parseFloat(peso),
          comprimento: parseInt(comprimento),
          altura: parseInt(altura),
          largura: parseInt(largura),
          valor: 100 // Valor declarado para teste
        })
      })

      const data = await response.json()
      
      if (data.resultados) {
        setQuoteResults(data.resultados)
        toast.success('Cotação realizada!')
      } else if (data.error) {
        toast.error(data.error)
      }
    } catch (error) {
      console.error('Erro na cotação:', error)
      toast.error('Erro ao consultar frete')
    } finally {
      setTesting(false)
    }
  }

  const trackPackage = async () => {
    if (!codigoRastreio || codigoRastreio.length < 13) {
      toast.error('Informe um código de rastreio válido')
      return
    }

    try {
      setTesting(true)
      setRastreioResult(null)
      
      const response = await fetch(`/api/shipping/tracking?codigo=${codigoRastreio}`)
      const data = await response.json()
      
      if (data.eventos) {
        setRastreioResult(data)
        toast.success('Rastreamento encontrado!')
      } else if (data.error) {
        toast.error(data.error)
      }
    } catch (error) {
      console.error('Erro no rastreamento:', error)
      toast.error('Erro ao rastrear encomenda')
    } finally {
      setTesting(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link 
            href="/admin/integracao"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FiTruck className="text-yellow-600" />
              Correios
            </h1>
            <p className="text-gray-600">Configure integração com os Correios para cotação e rastreamento</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'config' 
              ? 'bg-yellow-600 text-white' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          <FiSettings size={18} />
          Configuração
        </button>
        <button
          onClick={() => setActiveTab('test')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'test' 
              ? 'bg-yellow-600 text-white' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          <FiDollarSign size={18} />
          Testar Cotação
        </button>
        <button
          onClick={() => setActiveTab('tracking')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'tracking' 
              ? 'bg-yellow-600 text-white' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          <FiSearch size={18} />
          Rastrear
        </button>
      </div>

      {/* Tab: Configuração */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {/* Ativar/Desativar */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Integração Correios</h3>
                <p className="text-sm text-gray-600">
                  Ative para usar a API dos Correios na cotação de frete
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
              </label>
            </div>
          </div>

          {/* Credenciais */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <FiPackage className="text-yellow-600" />
              Credenciais Correios
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Para usar a API oficial dos Correios, você precisa de um contrato comercial.
              <a 
                href="https://www.correios.com.br/encomendas-logistica/grandes-volumes-e-ecommerce" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-yellow-600 hover:underline ml-1"
              >
                Saiba mais
              </a>
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Usuário</label>
                <input
                  type="text"
                  value={config.usuario}
                  onChange={(e) => setConfig({ ...config, usuario: e.target.value })}
                  placeholder="Usuário do contrato"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Senha</label>
                <input
                  type="password"
                  value={config.senha}
                  onChange={(e) => setConfig({ ...config, senha: e.target.value })}
                  placeholder="Senha do contrato"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Código Administrativo</label>
                <input
                  type="text"
                  value={config.codigoAdministrativo}
                  onChange={(e) => setConfig({ ...config, codigoAdministrativo: e.target.value })}
                  placeholder="Ex: 08082650"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cartão de Postagem</label>
                <input
                  type="text"
                  value={config.cartaoPostagem}
                  onChange={(e) => setConfig({ ...config, cartaoPostagem: e.target.value })}
                  placeholder="Número do cartão"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CNPJ</label>
                <input
                  type="text"
                  value={config.cnpj}
                  onChange={(e) => setConfig({ ...config, cnpj: e.target.value })}
                  placeholder="00.000.000/0001-00"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CEP de Origem</label>
                <input
                  type="text"
                  value={config.cepOrigem}
                  onChange={(e) => setConfig({ ...config, cepOrigem: e.target.value })}
                  placeholder="00000-000"
                  className="w-full px-3 py-2 border rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">CEP de onde saem as encomendas</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Percentual Extra (%)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={config.percentualExtra}
                  onChange={(e) => setConfig({ ...config, percentualExtra: parseFloat(e.target.value) || 0 })}
                  placeholder="2"
                  className="w-full px-3 py-2 border rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">Acréscimo no frete para compensar embalagem mais pesada</p>
              </div>
            </div>
          </div>

          {/* Serviços */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <FiTruck className="text-yellow-600" />
              Serviços Disponíveis
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Selecione quais serviços dos Correios serão oferecidos aos clientes
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.servicoPac}
                  onChange={(e) => setConfig({ ...config, servicoPac: e.target.checked })}
                  className="w-5 h-5 text-yellow-600"
                />
                <div>
                  <p className="font-medium">PAC</p>
                  <p className="text-xs text-gray-500">Econômico (5-12 dias)</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.servicoSedex}
                  onChange={(e) => setConfig({ ...config, servicoSedex: e.target.checked })}
                  className="w-5 h-5 text-yellow-600"
                />
                <div>
                  <p className="font-medium">SEDEX</p>
                  <p className="text-xs text-gray-500">Expresso (1-3 dias)</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.servicoSedex10}
                  onChange={(e) => setConfig({ ...config, servicoSedex10: e.target.checked })}
                  className="w-5 h-5 text-yellow-600"
                />
                <div>
                  <p className="font-medium">SEDEX 10</p>
                  <p className="text-xs text-gray-500">Entrega até 10h</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.servicoSedex12}
                  onChange={(e) => setConfig({ ...config, servicoSedex12: e.target.checked })}
                  className="w-5 h-5 text-yellow-600"
                />
                <div>
                  <p className="font-medium">SEDEX 12</p>
                  <p className="text-xs text-gray-500">Entrega até 12h</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.servicoSedexHoje}
                  onChange={(e) => setConfig({ ...config, servicoSedexHoje: e.target.checked })}
                  className="w-5 h-5 text-yellow-600"
                />
                <div>
                  <p className="font-medium">SEDEX Hoje</p>
                  <p className="text-xs text-gray-500">No mesmo dia</p>
                </div>
              </label>
            </div>
          </div>

          {/* Info sem contrato */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <FiAlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-medium text-blue-800">Não tem contrato com os Correios?</h4>
                <p className="text-sm text-blue-700 mt-1">
                  O sistema pode usar uma API pública para cotação (sem necessidade de contrato).
                  Deixe os campos de credenciais em branco e a cotação funcionará normalmente,
                  porém com valores de tabela balcão (sem desconto comercial).
                </p>
              </div>
            </div>
          </div>

          {/* Salvar */}
          <div className="flex justify-end">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="px-6 py-3 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <FiRefreshCw className="animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <FiSave />
                  Salvar Configurações
                </>
              )}
            </button>
            
            <button
              onClick={testApiConnection}
              disabled={testingApi || !config.enabled}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {testingApi ? (
                <>
                  <FiRefreshCw className="animate-spin" />
                  Testando API...
                </>
              ) : (
                <>
                  <FiCheckCircle />
                  Testar Conexão API
                </>
              )}
            </button>
          </div>
          
          {/* Resultado do teste da API */}
          {apiTestResult && (
            <div className={`mt-4 p-4 rounded-lg ${apiTestResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h4 className="font-bold mb-2 flex items-center gap-2">
                {apiTestResult.success ? (
                  <><FiCheckCircle className="text-green-600" /> API Funcionando</>
                ) : (
                  <><FiAlertCircle className="text-red-600" /> Erro na API</>
                )}
              </h4>
              {apiTestResult.results && (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={apiTestResult.results.autenticacao?.status === 'sucesso' ? 'text-green-600' : 'text-red-600'}>
                      {apiTestResult.results.autenticacao?.status === 'sucesso' ? '✅' : '❌'}
                    </span>
                    <span>Autenticação: {apiTestResult.results.autenticacao?.mensagem}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={apiTestResult.results.cotacao?.status === 'sucesso' ? 'text-green-600' : 'text-yellow-600'}>
                      {apiTestResult.results.cotacao?.status === 'sucesso' ? '✅' : '⚠️'}
                    </span>
                    <span>Cotação: {apiTestResult.results.cotacao?.mensagem}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: Testar Cotação */}
      {activeTab === 'test' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <FiDollarSign className="text-green-600" />
              Testar Cotação de Frete
            </h3>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">CEP de Origem</label>
                <input
                  type="text"
                  value={config.cepOrigem}
                  readOnly
                  className="w-full px-3 py-2 border rounded-md bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CEP de Destino *</label>
                <input
                  type="text"
                  value={cepDestino}
                  onChange={(e) => setCepDestino(e.target.value)}
                  placeholder="00000-000"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Peso (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={peso}
                  onChange={(e) => setPeso(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Comprimento (cm)</label>
                <input
                  type="number"
                  value={comprimento}
                  onChange={(e) => setComprimento(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Altura (cm)</label>
                <input
                  type="number"
                  value={altura}
                  onChange={(e) => setAltura(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Largura (cm)</label>
                <input
                  type="number"
                  value={largura}
                  onChange={(e) => setLargura(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>

            <button
              onClick={testQuote}
              disabled={testing || !config.cepOrigem}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {testing ? (
                <>
                  <FiRefreshCw className="animate-spin" />
                  Consultando...
                </>
              ) : (
                <>
                  <FiSearch />
                  Consultar Frete
                </>
              )}
            </button>
          </div>

          {/* Resultados */}
          {quoteResults.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold mb-4">Resultados da Cotação</h3>
              <div className="space-y-3">
                {quoteResults.map((result, index) => (
                  <div 
                    key={index}
                    className={`p-4 rounded-lg border ${result.erro ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {result.erro ? (
                          <FiAlertCircle className="text-red-600" size={24} />
                        ) : (
                          <FiCheckCircle className="text-green-600" size={24} />
                        )}
                        <div>
                          <p className="font-bold">{result.servico}</p>
                          <p className="text-sm text-gray-600">Código: {result.codigo}</p>
                        </div>
                      </div>
                      {!result.erro && (
                        <div className="text-right">
                          <p className="text-xl font-bold text-green-700">
                            R$ {result.valor.toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <FiClock size={14} />
                            {result.prazo} dias úteis
                          </p>
                        </div>
                      )}
                    </div>
                    {result.erro && (
                      <p className="text-sm text-red-600 mt-2">{result.erro}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Rastreamento */}
      {activeTab === 'tracking' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <FiSearch className="text-blue-600" />
              Rastrear Encomenda
            </h3>
            
            <div className="flex gap-4 mb-6">
              <input
                type="text"
                value={codigoRastreio}
                onChange={(e) => setCodigoRastreio(e.target.value.toUpperCase())}
                placeholder="Ex: AA123456789BR"
                className="flex-1 px-3 py-2 border rounded-md uppercase"
              />
              <button
                onClick={trackPackage}
                disabled={testing}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {testing ? (
                  <FiRefreshCw className="animate-spin" />
                ) : (
                  <FiSearch />
                )}
                Rastrear
              </button>
            </div>

            {/* Resultado do rastreamento */}
            {rastreioResult && (
              <div className="border rounded-lg p-4">
                <h4 className="font-bold mb-4">
                  Objeto: {rastreioResult.codigo}
                </h4>
                <div className="space-y-4">
                  {rastreioResult.eventos?.map((evento: any, index: number) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        {index < rastreioResult.eventos.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-200 mt-1"></div>
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-medium">{evento.descricao}</p>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <FiMapPin size={12} />
                          {evento.local}
                        </p>
                        <p className="text-xs text-gray-500">
                          {evento.data} - {evento.hora}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
