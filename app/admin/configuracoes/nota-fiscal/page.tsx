'use client'

import { useState, useEffect } from 'react'
import { FiFileText, FiSave, FiAlertCircle, FiCheckCircle, FiUpload, FiPlus, FiTrash2, FiEdit2 } from 'react-icons/fi'

// Regra de tributação por tipo de operação
interface TaxRule {
  id: string
  nome: string
  tipoOperacao: 'interna' | 'interestadual' | 'exportacao'
  ufDestino?: string  // Vazio = todas UFs daquele tipo
  naturezaOperacao: string  // Natureza da operação para este tipo
  origem: string      // Origem do produto (0-7)
  cfop: string
  cstIcms: string     // CST (2 dígitos) ou CSOSN (3 dígitos)
  aliquotaIcms: string
  reducaoBaseIcms?: string  // Para CST 20, 70
  cstPis: string
  aliquotaPis: string
  cstCofins: string
  aliquotaCofins: string
  ativo: boolean
}

interface NFConfig {
  // Emissor
  emitenteCnpj: string
  emitenteRazaoSocial: string
  emitenteNomeFantasia: string
  emitenteInscricaoEstadual: string
  emitenteRegimeTributario: string
  emitenteCrt: string

  // Endereço
  emitenteLogradouro: string
  emitenteNumero: string
  emitenteComplemento: string
  emitenteBairro: string
  emitenteCidade: string
  codigoMunicipio: string
  emitenteEstado: string
  emitenteCep: string

  // Configurações de emissão
  serieNfe: string
  cfopPadrao: string
  naturezaOperacao: string
  ambiente: 'homologacao' | 'producao'

  // Tributação padrão
  cstPadrao: string
  aliquotaIcms: string
  cstPis: string
  aliquotaPis: string
  cstCofins: string
  aliquotaCofins: string

  // Provedor (fixo em SEFAZ)
  provedor: 'sefaz'
  sefazEstado: string
  sefazAmbiente: 'homologacao' | 'producao'

  // Certificado Digital
  certificadoTipo: 'A1' | 'A3' | ''
  certificadoArquivo: string
  certificadoSenha: string
  certificadoValidade: string
}

export default function NotaFiscalConfigPage() {
  const [mounted, setMounted] = useState(false)
  const [config, setConfig] = useState<NFConfig>({
    emitenteCnpj: '',
    emitenteRazaoSocial: '',
    emitenteNomeFantasia: '',
    emitenteInscricaoEstadual: '',
    emitenteRegimeTributario: '1',
    emitenteCrt: '1',
    emitenteLogradouro: '',
    emitenteNumero: '',
    emitenteComplemento: '',
    emitenteBairro: '',
    emitenteCidade: '',
    codigoMunicipio: '',
    emitenteEstado: '',
    emitenteCep: '',
    serieNfe: '1',
    cfopPadrao: '5102',
    naturezaOperacao: 'VENDA DE MERCADORIA',
    ambiente: 'homologacao',
    cstPadrao: '00',
    aliquotaIcms: '18',
    cstPis: '01',
    aliquotaPis: '1.65',
    cstCofins: '01',
    aliquotaCofins: '7.60',
    provedor: 'sefaz',
    sefazEstado: 'MA',
    sefazAmbiente: 'homologacao',
    certificadoTipo: '',
    certificadoArquivo: '',
    certificadoSenha: '',
    certificadoValidade: '',
  })

  // Regras de tributação dinâmicas
  const [taxRules, setTaxRules] = useState<TaxRule[]>([
    {
      id: '1',
      nome: 'Venda Interna (dentro do estado)',
      tipoOperacao: 'interna',
      naturezaOperacao: 'VENDA DE MERCADORIA',
      origem: '0',  // Nacional
      cfop: '5102',
      cstIcms: '00',
      aliquotaIcms: '18',
      cstPis: '01',
      aliquotaPis: '1.65',
      cstCofins: '01',
      aliquotaCofins: '7.60',
      ativo: true
    },
    {
      id: '2',
      nome: 'Venda Interestadual (fora do estado)',
      tipoOperacao: 'interestadual',
      naturezaOperacao: 'VENDA DE MERCADORIA ADQUIRIDA OU RECEBIDA DE TERCEIROS',
      origem: '0',  // Nacional
      cfop: '6102',
      cstIcms: '00',
      aliquotaIcms: '12',
      cstPis: '01',
      aliquotaPis: '1.65',
      cstCofins: '01',
      aliquotaCofins: '7.60',
      ativo: true
    },
    {
      id: '3',
      nome: 'Exportação',
      tipoOperacao: 'exportacao',
      naturezaOperacao: 'EXPORTACAO DE MERCADORIA',
      origem: '0',  // Nacional
      cfop: '7101',
      cstIcms: '41',
      aliquotaIcms: '0',
      cstPis: '08',
      aliquotaPis: '0',
      cstCofins: '08',
      aliquotaCofins: '0',
      ativo: true
    }
  ])
  const [editingRule, setEditingRule] = useState<TaxRule | null>(null)
  const [showRuleModal, setShowRuleModal] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [certificadoFile, setCertificadoFile] = useState<File | null>(null)

  // --- Configuração NF-e por Filial ---
  const [branches, setBranches] = useState<any[]>([])
  const [selectedBranch, setSelectedBranch] = useState<any>(null)
  const [branchNfConfig, setBranchNfConfig] = useState<any>({})
  const [showBranchModal, setShowBranchModal] = useState(false)
  const [branchCertFile, setBranchCertFile] = useState<File | null>(null)
  const [savingBranch, setSavingBranch] = useState(false)
  const [branchMessage, setBranchMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const REGRAS_PADRAO_FILIAL: TaxRule[] = [
    { id: '1', nome: 'Venda Interna (mesmo estado)', tipoOperacao: 'interna', naturezaOperacao: 'VENDA DE MERCADORIA', origem: '0', cfop: '5102', cstIcms: '00', aliquotaIcms: '18', cstPis: '01', aliquotaPis: '1.65', cstCofins: '01', aliquotaCofins: '7.60', ativo: true },
    { id: '2', nome: 'Venda Interestadual (outro estado)', tipoOperacao: 'interestadual', naturezaOperacao: 'VENDA DE MERCADORIA ADQUIRIDA OU RECEBIDA DE TERCEIROS', origem: '0', cfop: '6102', cstIcms: '00', aliquotaIcms: '12', cstPis: '01', aliquotaPis: '1.65', cstCofins: '01', aliquotaCofins: '7.60', ativo: true },
    { id: '3', nome: 'Exportação', tipoOperacao: 'exportacao', naturezaOperacao: 'EXPORTACAO DE MERCADORIA', origem: '0', cfop: '7102', cstIcms: '41', aliquotaIcms: '0', cstPis: '08', aliquotaPis: '0', cstCofins: '08', aliquotaCofins: '0', ativo: true },
  ]
  const [branchTaxRules, setBranchTaxRules] = useState<TaxRule[]>(REGRAS_PADRAO_FILIAL)
  const [editingBranchRule, setEditingBranchRule] = useState<TaxRule | null>(null)
  const [showBranchRuleModal, setShowBranchRuleModal] = useState(false)

  useEffect(() => {
    setMounted(true)
    loadConfig()
    loadBranches()
  }, [])

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/admin/configuracoes/nota-fiscal')
      if (res.ok) {
        const data = await res.json()
        if (data.config) {
          setConfig({ ...config, ...data.config })
        }
        if (data.taxRules && data.taxRules.length > 0) {
          setTaxRules(data.taxRules)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      // Se tem arquivo de certificado, fazer upload primeiro
      let certificadoPath = config.certificadoArquivo
      if (certificadoFile) {
        const formData = new FormData()
        formData.append('certificado', certificadoFile)
        
        const uploadRes = await fetch('/api/admin/configuracoes/nota-fiscal/certificado', {
          method: 'POST',
          body: formData,
        })

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          certificadoPath = uploadData.path
        } else {
          throw new Error('Erro ao fazer upload do certificado')
        }
      }

      const res = await fetch('/api/admin/configuracoes/nota-fiscal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...config, 
          certificadoArquivo: certificadoPath,
          taxRules: taxRules  // Incluir regras de tributação
        }),
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' })
      } else {
        const error = await res.json()
        setMessage({ type: 'error', text: error.message || 'Erro ao salvar' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao salvar configurações' })
    } finally {
      setSaving(false)
    }
  }

  // Funções para gerenciar regras de tributação
  const handleAddRule = () => {
    setEditingRule({
      id: Date.now().toString(),
      nome: '',
      tipoOperacao: 'interna',
      naturezaOperacao: 'VENDA DE MERCADORIA',
      origem: '0',  // Nacional
      cfop: '5102',
      cstIcms: '00',
      aliquotaIcms: '18',
      cstPis: '01',
      aliquotaPis: '1.65',
      cstCofins: '01',
      aliquotaCofins: '7.60',
      ativo: true
    })
    setShowRuleModal(true)
  }

  const handleEditRule = (rule: TaxRule) => {
    setEditingRule({ ...rule })
    setShowRuleModal(true)
  }

  const handleSaveRule = () => {
    if (!editingRule) return
    
    const existingIndex = taxRules.findIndex(r => r.id === editingRule.id)
    if (existingIndex >= 0) {
      const updated = [...taxRules]
      updated[existingIndex] = editingRule
      setTaxRules(updated)
    } else {
      setTaxRules([...taxRules, editingRule])
    }
    setShowRuleModal(false)
    setEditingRule(null)
  }

  const handleDeleteRule = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta regra?')) {
      setTaxRules(taxRules.filter(r => r.id !== id))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCertificadoFile(file)
      setConfig({ ...config, certificadoArquivo: file.name })
    }
  }

  // --- Funções de filiais ---
  const loadBranches = async () => {
    try {
      const res = await fetch('/api/admin/company-branches')
      if (res.ok) {
        const data = await res.json()
        setBranches(data.branches || data || [])
      }
    } catch (error) {
      console.error('Erro ao carregar filiais:', error)
    }
  }

  const openBranchConfig = async (branch: any) => {
    setSelectedBranch(branch)
    setBranchNfConfig({})
    setBranchMessage(null)
    setBranchCertFile(null)
    setBranchTaxRules(REGRAS_PADRAO_FILIAL)
    try {
      const res = await fetch(`/api/admin/company-branches/${branch.id}/nfe-config`)
      if (res.ok) {
        const data = await res.json()
        setBranchNfConfig(data)
        if (data.taxRules && data.taxRules.length > 0) {
          setBranchTaxRules(data.taxRules)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar config da filial:', error)
    }
    setShowBranchModal(true)
  }

  const saveBranchConfig = async () => {
    if (!selectedBranch) return
    setSavingBranch(true)
    setBranchMessage(null)
    try {
      if (branchCertFile) {
        const formData = new FormData()
        formData.append('certificado', branchCertFile)
        const uploadRes = await fetch(`/api/admin/company-branches/${selectedBranch.id}/nfe-config`, {
          method: 'POST',
          body: formData,
        })
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          setBranchNfConfig((prev: any) => ({ ...prev, nfCertificadoArquivo: uploadData.path, nfCertificadoValidade: uploadData.validade }))
        }
      }
      const res = await fetch(`/api/admin/company-branches/${selectedBranch.id}/nfe-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...branchNfConfig, taxRules: branchTaxRules }),
      })
      if (res.ok) {
        setBranchMessage({ type: 'success', text: 'Configurações da filial salvas com sucesso!' })
        loadBranches()
      } else {
        const err = await res.json()
        setBranchMessage({ type: 'error', text: err.error || 'Erro ao salvar' })
      }
    } catch (error: any) {
      setBranchMessage({ type: 'error', text: error.message || 'Erro ao salvar configurações da filial' })
    } finally {
      setSavingBranch(false)
    }
  }

  if (!mounted || loading) {
    return <div className="p-6">Carregando...</div>
  }

  return (
    <div className="p-6" suppressHydrationWarning>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FiFileText className="w-8 h-8" />
          Configurações de Nota Fiscal Eletrônica
        </h1>
        <p className="text-gray-600 mt-1">Configure os dados para emissão de NF-e</p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {message.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto">
            ×
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 space-y-8">
          {/* Dados do Emissor */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Dados do Emissor</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">CNPJ *</label>
                <input
                  type="text"
                  value={config.emitenteCnpj}
                  onChange={(e) => setConfig({ ...config, emitenteCnpj: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Inscrição Estadual *</label>
                <input
                  type="text"
                  value={config.emitenteInscricaoEstadual}
                  onChange={(e) => setConfig({ ...config, emitenteInscricaoEstadual: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Razão Social *</label>
                <input
                  type="text"
                  value={config.emitenteRazaoSocial}
                  onChange={(e) => setConfig({ ...config, emitenteRazaoSocial: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Nome Fantasia</label>
                <input
                  type="text"
                  value={config.emitenteNomeFantasia}
                  onChange={(e) => setConfig({ ...config, emitenteNomeFantasia: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Regime Tributário *</label>
                <select
                  value={config.emitenteRegimeTributario}
                  onChange={(e) => setConfig({ ...config, emitenteRegimeTributario: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="1">Simples Nacional</option>
                  <option value="2">Simples Nacional - Excesso</option>
                  <option value="3">Regime Normal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CRT *</label>
                <select
                  value={config.emitenteCrt}
                  onChange={(e) => setConfig({ ...config, emitenteCrt: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="1">Simples Nacional</option>
                  <option value="2">Simples Nacional - Excesso</option>
                  <option value="3">Regime Normal</option>
                </select>
              </div>
            </div>
          </div>

          {/* Endereço do Emissor */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Endereço do Emissor</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Logradouro *</label>
                <input
                  type="text"
                  value={config.emitenteLogradouro}
                  onChange={(e) => setConfig({ ...config, emitenteLogradouro: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Número *</label>
                <input
                  type="text"
                  value={config.emitenteNumero}
                  onChange={(e) => setConfig({ ...config, emitenteNumero: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Complemento</label>
                <input
                  type="text"
                  value={config.emitenteComplemento}
                  onChange={(e) => setConfig({ ...config, emitenteComplemento: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bairro *</label>
                <input
                  type="text"
                  value={config.emitenteBairro}
                  onChange={(e) => setConfig({ ...config, emitenteBairro: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CEP *</label>
                <input
                  type="text"
                  value={config.emitenteCep}
                  onChange={(e) => setConfig({ ...config, emitenteCep: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="00000-000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cidade *</label>
                <input
                  type="text"
                  value={config.emitenteCidade}
                  onChange={(e) => setConfig({ ...config, emitenteCidade: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Código IBGE do Município *
                  <span className="text-xs text-gray-500 ml-2">(7 dígitos)</span>
                </label>
                <input
                  type="text"
                  value={config.codigoMunicipio}
                  onChange={(e) => setConfig({ ...config, codigoMunicipio: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="2111300"
                  maxLength={7}
                />
                <p className="text-xs text-gray-500 mt-1">
                  São Luís/MA: 2111300 | Consulte em{' '}
                  <a 
                    href="https://www.ibge.gov.br/explica/codigos-dos-municipios.php" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    IBGE
                  </a>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Estado *</label>
                <input
                  type="text"
                  value={config.emitenteEstado}
                  onChange={(e) => setConfig({ ...config, emitenteEstado: e.target.value.toUpperCase() })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="MA"
                  maxLength={2}
                />
              </div>
            </div>
          </div>

          {/* Configurações de Emissão */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Configurações de Emissão</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Série NF-e *</label>
                <input
                  type="text"
                  value={config.serieNfe}
                  onChange={(e) => setConfig({ ...config, serieNfe: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ambiente *</label>
                <select
                  value={config.ambiente}
                  onChange={(e) => setConfig({ ...config, ambiente: e.target.value as any })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="homologacao">Homologação (Testes)</option>
                  <option value="producao">Produção</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CFOP Padrão *</label>
                <select
                  value={config.cfopPadrao}
                  onChange={(e) => setConfig({ ...config, cfopPadrao: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="5102">5102 - Venda dentro do estado</option>
                  <option value="6102">6102 - Venda fora do estado</option>
                  <option value="5405">5405 - Venda de mercadoria (Simples Nacional)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Natureza da Operação *</label>
                <input
                  type="text"
                  value={config.naturezaOperacao}
                  onChange={(e) => setConfig({ ...config, naturezaOperacao: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Regras de Tributação */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Regras de Tributação</h2>
                <p className="text-sm text-gray-500">Configure diferentes tributações para cada tipo de operação</p>
              </div>
              <button
                onClick={handleAddRule}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <FiPlus /> Nova Regra
              </button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CFOP</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Origem + CST</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ICMS</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PIS/COFINS</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {taxRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{rule.nome}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          rule.tipoOperacao === 'interna' ? 'bg-blue-100 text-blue-800' :
                          rule.tipoOperacao === 'interestadual' ? 'bg-purple-100 text-purple-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {rule.tipoOperacao === 'interna' ? '🏠 Interna' :
                           rule.tipoOperacao === 'interestadual' ? '🚚 Interestadual' :
                           '🌍 Exportação'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">{rule.cfop}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="font-mono">{rule.origem || '0'}{rule.cstIcms}</span>
                        <span className="text-gray-400 ml-1 text-xs">
                          ({rule.origem || '0'}=Origem)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{rule.aliquotaIcms}%</td>
                      <td className="px-4 py-3 text-sm">{rule.aliquotaPis}% / {rule.aliquotaCofins}%</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${rule.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {rule.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-2">
                          <button onClick={() => handleEditRule(rule)} className="text-blue-600 hover:text-blue-800">
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteRule(rule.id)} className="text-red-600 hover:text-red-800">
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">💡 Como funciona:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>Origem:</strong> 0=Nacional, 1=Import.direta, 2=Import.mercado interno, 3-7=Outros</li>
                <li>• <strong>CST (Regime Normal):</strong> 2 dígitos após origem (00-90)</li>
                <li>• <strong>CSOSN (Simples Nacional):</strong> 3 dígitos após origem (101-900)</li>
                <li>• <strong>Venda Interna:</strong> Cliente no mesmo estado (CFOP 5xxx)</li>
                <li>• <strong>Venda Interestadual:</strong> Cliente em outro estado (CFOP 6xxx)</li>
                <li>• <strong>Exportação:</strong> Cliente em outro país (CFOP 7xxx)</li>
                <li>• O sistema seleciona automaticamente a regra com base no endereço do cliente</li>
              </ul>
            </div>
          </div>

          {/* Integração SEFAZ */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Integração Direta com SEFAZ</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Estado (UF) *</label>
                <select
                  value={config.sefazEstado}
                  onChange={(e) => setConfig({ ...config, sefazEstado: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="MA">MA - Maranhão</option>
                  <option value="AC">AC - Acre</option>
                  <option value="AL">AL - Alagoas</option>
                  <option value="AP">AP - Amapá</option>
                  <option value="AM">AM - Amazonas</option>
                  <option value="BA">BA - Bahia</option>
                  <option value="CE">CE - Ceará</option>
                  <option value="DF">DF - Distrito Federal</option>
                  <option value="ES">ES - Espírito Santo</option>
                  <option value="GO">GO - Goiás</option>
                  <option value="MT">MT - Mato Grosso</option>
                  <option value="MS">MS - Mato Grosso do Sul</option>
                  <option value="MG">MG - Minas Gerais</option>
                  <option value="PA">PA - Pará</option>
                  <option value="PB">PB - Paraíba</option>
                  <option value="PR">PR - Paraná</option>
                  <option value="PE">PE - Pernambuco</option>
                  <option value="PI">PI - Piauí</option>
                  <option value="RJ">RJ - Rio de Janeiro</option>
                  <option value="RN">RN - Rio Grande do Norte</option>
                  <option value="RS">RS - Rio Grande do Sul</option>
                  <option value="RO">RO - Rondônia</option>
                  <option value="RR">RR - Roraima</option>
                  <option value="SC">SC - Santa Catarina</option>
                  <option value="SP">SP - São Paulo</option>
                  <option value="SE">SE - Sergipe</option>
                  <option value="TO">TO - Tocantins</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ambiente SEFAZ *</label>
                <select
                  value={config.sefazAmbiente}
                  onChange={(e) => setConfig({ ...config, sefazAmbiente: e.target.value as any })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="homologacao">Homologação (Testes)</option>
                  <option value="producao">Produção</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  ⚠️ Sempre inicie em homologação
                </p>
              </div>
            </div>
          </div>

          {/* Certificado Digital */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Certificado Digital</h2>
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Importante:</strong> O certificado digital A1 (.pfx) é necessário para assinar as NF-e.
                  Mantenha a senha do certificado em segurança.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tipo de Certificado *</label>
                <select
                  value={config.certificadoTipo}
                  onChange={(e) => setConfig({ ...config, certificadoTipo: e.target.value as any })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">Selecione...</option>
                  <option value="A1">A1 (arquivo .pfx)</option>
                  <option value="A3">A3 (token/cartão)</option>
                </select>
              </div>

              {config.certificadoTipo === 'A1' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Arquivo do Certificado (.pfx) *</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept=".pfx,.p12"
                        onChange={handleFileChange}
                        className="hidden"
                        id="certificado-upload"
                      />
                      <label
                        htmlFor="certificado-upload"
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer"
                      >
                        <FiUpload />
                        Escolher arquivo
                      </label>
                      {config.certificadoArquivo && (
                        <span className="text-sm text-gray-600">{config.certificadoArquivo}</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Senha do Certificado *</label>
                    <input
                      type="password"
                      value={config.certificadoSenha}
                      onChange={(e) => setConfig({ ...config, certificadoSenha: e.target.value })}
                      className="w-full p-2 border rounded-lg"
                      placeholder="Senha do arquivo .pfx"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Validade do Certificado</label>
                    <input
                      type="date"
                      value={config.certificadoValidade}
                      onChange={(e) => setConfig({ ...config, certificadoValidade: e.target.value })}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50"
          >
            <FiSave />
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </div>

      {/* ════════ CONFIGURAÇÃO NF-e POR FILIAL ════════ */}
      <div className="mt-8 bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Configuração NF-e por Empresa / Filial</h2>
          <p className="text-sm text-gray-500 mt-1">Cada filial e galpão pode ter seu próprio certificado digital e configurações fiscais independentes</p>
        </div>
        <div className="p-6">
          {branches.length === 0 ? (
            <p className="text-gray-500 text-sm">
              Nenhuma filial cadastrada. Acesse{' '}
              <a href="/admin/configuracoes/empresa" className="text-primary-600 underline">Configurações da Empresa</a>{' '}
              para cadastrar filiais e galpões.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-sm font-medium">Nome / Razão Social</th>
                    <th className="px-4 py-3 text-sm font-medium">Código</th>
                    <th className="px-4 py-3 text-sm font-medium">CNPJ</th>
                    <th className="px-4 py-3 text-sm font-medium">UF</th>
                    <th className="px-4 py-3 text-sm font-medium">Série NF-e</th>
                    <th className="px-4 py-3 text-sm font-medium">Ambiente</th>
                    <th className="px-4 py-3 text-sm font-medium">Certificado</th>
                    <th className="px-4 py-3 text-sm font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {branches.map((branch: any) => (
                    <tr key={branch.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{branch.name || branch.razaoSocial || '—'}</td>
                      <td className="px-4 py-3 text-sm font-mono">{branch.code || '—'}</td>
                      <td className="px-4 py-3 text-sm font-mono">{branch.cnpj || '—'}</td>
                      <td className="px-4 py-3 text-sm">{branch.state || '—'}</td>
                      <td className="px-4 py-3 text-sm">{branch.nfSerie || <span className="text-gray-400 text-xs">não config.</span>}</td>
                      <td className="px-4 py-3 text-sm">
                        {branch.nfAmbiente ? (
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            branch.nfAmbiente === 'producao'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {branch.nfAmbiente === 'producao' ? '✅ Produção' : '🧪 Homologação'}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {branch.nfCertificadoArquivo ? (
                          <span className="text-green-600 text-xs">✅ Configurado</span>
                        ) : (
                          <span className="text-orange-500 text-xs">⚠️ Sem certificado</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => openBranchConfig(branch)}
                          className="flex items-center gap-1 px-3 py-1 text-xs bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
                        >
                          <FiEdit2 className="w-3 h-3" />
                          Configurar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal configuração NF-e por filial */}
      {showBranchModal && selectedBranch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold">NF-e: {selectedBranch.name || selectedBranch.razaoSocial}</h3>
              <button onClick={() => setShowBranchModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              {branchMessage && (
                <div className={`flex items-center gap-2 p-3 rounded-lg ${
                  branchMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}>
                  {branchMessage.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
                  {branchMessage.text}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Série NF-e</label>
                  <input
                    type="text"
                    value={branchNfConfig.nfSerie || ''}
                    onChange={(e) => setBranchNfConfig({ ...branchNfConfig, nfSerie: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    placeholder="Ex: 1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ambiente</label>
                  <select
                    value={branchNfConfig.nfAmbiente || 'homologacao'}
                    onChange={(e) => setBranchNfConfig({ ...branchNfConfig, nfAmbiente: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="homologacao">🧪 Homologação (Testes)</option>
                    <option value="producao">✅ Produção</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Natureza da Operação</label>
                <input
                  type="text"
                  value={branchNfConfig.nfNaturezaOperacao || ''}
                  onChange={(e) => setBranchNfConfig({ ...branchNfConfig, nfNaturezaOperacao: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Ex: VENDA DE MERCADORIA"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CRT — Código de Regime Tributário</label>
                <select
                  value={branchNfConfig.nfCrt || '1'}
                  onChange={(e) => setBranchNfConfig({ ...branchNfConfig, nfCrt: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="1">1 — Simples Nacional</option>
                  <option value="2">2 — Simples Nacional (excesso de sublimite)</option>
                  <option value="3">3 — Regime Normal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Senha do Certificado</label>
                <input
                  type="password"
                  value={branchNfConfig.nfCertificadoSenha || ''}
                  onChange={(e) => setBranchNfConfig({ ...branchNfConfig, nfCertificadoSenha: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Deixe em branco para não alterar"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Certificado Digital (.pfx / .p12)</label>
                {branchNfConfig.nfCertificadoArquivo && (
                  <p className="text-sm text-green-600 mb-1">✅ Certificado configurado: {branchNfConfig.nfCertificadoArquivo.split('/').pop()}</p>
                )}
                {branchNfConfig.nfCertificadoValidade && (
                  <p className="text-xs text-gray-500 mb-2">Validade: {new Date(branchNfConfig.nfCertificadoValidade).toLocaleDateString('pt-BR')}</p>
                )}
                <label className="flex items-center gap-2 cursor-pointer px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-400 w-fit">
                  <FiUpload className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {branchCertFile ? branchCertFile.name : 'Selecionar certificado .pfx'}
                  </span>
                  <input
                    type="file"
                    accept=".pfx,.p12"
                    className="hidden"
                    onChange={(e) => setBranchCertFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              {/* Regras de Tributação da Filial */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-800">Regras de Tributação</h4>
                    <p className="text-xs text-gray-500">CFOP e tributação por tipo de operação desta filial</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newId = Date.now().toString()
                      setEditingBranchRule({ id: newId, nome: '', tipoOperacao: 'interna', naturezaOperacao: 'VENDA DE MERCADORIA', origem: '0', cfop: '5102', cstIcms: '00', aliquotaIcms: '0', cstPis: '01', aliquotaPis: '1.65', cstCofins: '01', aliquotaCofins: '7.60', ativo: true })
                      setShowBranchRuleModal(true)
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    <FiPlus className="w-3.5 h-3.5" /> Nova Regra
                  </button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">CFOP</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">CST ICMS</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Alíq. ICMS</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {branchTaxRules.map((rule) => (
                        <tr key={rule.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              rule.tipoOperacao === 'interna' ? 'bg-blue-100 text-blue-800' :
                              rule.tipoOperacao === 'interestadual' ? 'bg-purple-100 text-purple-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {rule.tipoOperacao === 'interna' ? '🏠 Interna' :
                               rule.tipoOperacao === 'interestadual' ? '🚚 Interestadual' : '🌍 Exportação'}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono font-semibold">{rule.cfop}</td>
                          <td className="px-3 py-2 font-mono">{rule.origem || '0'}{rule.cstIcms}</td>
                          <td className="px-3 py-2">{rule.aliquotaIcms}%</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${rule.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                              {rule.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => { setEditingBranchRule(rule); setShowBranchRuleModal(true) }}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <FiEdit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setBranchTaxRules(branchTaxRules.filter(r => r.id !== rule.id))}
                                className="text-red-500 hover:text-red-700"
                              >
                                <FiTrash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {branchTaxRules.length === 0 && (
                        <tr><td colSpan={6} className="px-3 py-4 text-center text-gray-400 text-sm">Nenhuma regra configurada</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowBranchModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={saveBranchConfig}
                disabled={savingBranch}
                className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50"
              >
                <FiSave />
                {savingBranch ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar regra de tributação da FILIAL */}
      {showBranchRuleModal && editingBranchRule && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="text-base font-bold">
                {branchTaxRules.find(r => r.id === editingBranchRule.id) ? 'Editar Regra' : 'Nova Regra'} — {selectedBranch?.name}
              </h3>
              <button onClick={() => setShowBranchRuleModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome da Regra *</label>
                <input
                  type="text"
                  value={editingBranchRule.nome}
                  onChange={(e) => setEditingBranchRule({ ...editingBranchRule, nome: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Ex: Venda Interna SP"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo de Operação *</label>
                  <select
                    value={editingBranchRule.tipoOperacao}
                    onChange={(e) => setEditingBranchRule({ ...editingBranchRule, tipoOperacao: e.target.value as any })}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="interna">🏠 Interna (mesmo estado)</option>
                    <option value="interestadual">🚚 Interestadual (outro estado)</option>
                    <option value="exportacao">🌍 Exportação (exterior)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">CFOP *</label>
                  <select
                    value={editingBranchRule.cfop}
                    onChange={(e) => setEditingBranchRule({ ...editingBranchRule, cfop: e.target.value })}
                    className="w-full p-2 border rounded-lg font-mono"
                  >
                    <optgroup label="Interna (5xxx)">
                      <option value="5101">5101 — Prod. próprio (industrialização)</option>
                      <option value="5102">5102 — Mercadoria adquirida/recebida de terceiros</option>
                      <option value="5405">5405 — Simples Nacional com ST</option>
                    </optgroup>
                    <optgroup label="Interestadual (6xxx)">
                      <option value="6101">6101 — Prod. próprio (industrialização)</option>
                      <option value="6102">6102 — Mercadoria adquirida/recebida de terceiros</option>
                    </optgroup>
                    <optgroup label="Exportação (7xxx)">
                      <option value="7101">7101 — Prod. próprio</option>
                      <option value="7102">7102 — Mercadoria adquirida de terceiros</option>
                    </optgroup>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Natureza da Operação</label>
                <input
                  type="text"
                  value={editingBranchRule.naturezaOperacao}
                  onChange={(e) => setEditingBranchRule({ ...editingBranchRule, naturezaOperacao: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Ex: VENDA DE MERCADORIA"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Origem</label>
                  <select
                    value={editingBranchRule.origem}
                    onChange={(e) => setEditingBranchRule({ ...editingBranchRule, origem: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="0">0 — Nacional</option>
                    <option value="1">1 — Importado direto</option>
                    <option value="2">2 — Importado merc. interno</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">CST ICMS</label>
                  <select
                    value={editingBranchRule.cstIcms}
                    onChange={(e) => setEditingBranchRule({ ...editingBranchRule, cstIcms: e.target.value })}
                    className="w-full p-2 border rounded-lg font-mono"
                  >
                    <optgroup label="Regime Normal">
                      <option value="00">00 — Tributada integralmente</option>
                      <option value="10">10 — Tributada + ST</option>
                      <option value="20">20 — Com redução de base</option>
                      <option value="40">40 — Isenta</option>
                      <option value="41">41 — Não tributada</option>
                      <option value="60">60 — Cobrado por ST</option>
                    </optgroup>
                    <optgroup label="Simples Nacional (CSOSN)">
                      <option value="101">101 — Crédito de ICMS</option>
                      <option value="102">102 — Sem crédito de ICMS</option>
                      <option value="400">400 — Não obrigado recolhimento</option>
                      <option value="500">500 — ST ou antecipação</option>
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Alíq. ICMS %</label>
                  <input
                    type="number"
                    value={editingBranchRule.aliquotaIcms}
                    onChange={(e) => setEditingBranchRule({ ...editingBranchRule, aliquotaIcms: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    min="0" max="100" step="0.01"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">CST PIS / Alíq.</label>
                  <div className="flex gap-2">
                    <select
                      value={editingBranchRule.cstPis}
                      onChange={(e) => setEditingBranchRule({ ...editingBranchRule, cstPis: e.target.value })}
                      className="flex-1 p-2 border rounded-lg font-mono text-sm"
                    >
                      <option value="01">01 — Tributada cumulativa</option>
                      <option value="02">02 — Tributada não-cumulativa</option>
                      <option value="07">07 — Isenta</option>
                      <option value="08">08 — Sem incidência (exportação)</option>
                    </select>
                    <input
                      type="number"
                      value={editingBranchRule.aliquotaPis}
                      onChange={(e) => setEditingBranchRule({ ...editingBranchRule, aliquotaPis: e.target.value })}
                      className="w-20 p-2 border rounded-lg text-sm"
                      placeholder="%"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">CST COFINS / Alíq.</label>
                  <div className="flex gap-2">
                    <select
                      value={editingBranchRule.cstCofins}
                      onChange={(e) => setEditingBranchRule({ ...editingBranchRule, cstCofins: e.target.value })}
                      className="flex-1 p-2 border rounded-lg font-mono text-sm"
                    >
                      <option value="01">01 — Tributada cumulativa</option>
                      <option value="02">02 — Tributada não-cumulativa</option>
                      <option value="07">07 — Isenta</option>
                      <option value="08">08 — Sem incidência (exportação)</option>
                    </select>
                    <input
                      type="number"
                      value={editingBranchRule.aliquotaCofins}
                      onChange={(e) => setEditingBranchRule({ ...editingBranchRule, aliquotaCofins: e.target.value })}
                      className="w-20 p-2 border rounded-lg text-sm"
                      placeholder="%"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="branchRuleAtivo"
                  checked={editingBranchRule.ativo}
                  onChange={(e) => setEditingBranchRule({ ...editingBranchRule, ativo: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="branchRuleAtivo" className="text-sm font-medium">Regra ativa</label>
              </div>
            </div>
            <div className="p-5 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowBranchRuleModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-100">
                Cancelar
              </button>
              <button
                onClick={() => {
                  const exists = branchTaxRules.find(r => r.id === editingBranchRule.id)
                  if (exists) {
                    setBranchTaxRules(branchTaxRules.map(r => r.id === editingBranchRule.id ? editingBranchRule : r))
                  } else {
                    setBranchTaxRules([...branchTaxRules, editingBranchRule])
                  }
                  setShowBranchRuleModal(false)
                }}
                className="flex items-center gap-2 px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <FiSave className="w-4 h-4" /> Salvar Regra
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar regra de tributação */}
      {showRuleModal && editingRule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-lg font-bold">
                {taxRules.find(r => r.id === editingRule.id) ? 'Editar Regra' : 'Nova Regra de Tributação'}
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome da Regra *</label>
                <input
                  type="text"
                  value={editingRule.nome}
                  onChange={(e) => setEditingRule({ ...editingRule, nome: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Ex: Venda para São Paulo"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo de Operação *</label>
                  <select
                    value={editingRule.tipoOperacao}
                    onChange={(e) => setEditingRule({ ...editingRule, tipoOperacao: e.target.value as any })}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="interna">🏠 Venda Interna (mesmo estado)</option>
                    <option value="interestadual">🚚 Venda Interestadual (outro estado)</option>
                    <option value="exportacao">🌍 Exportação (outro país)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Origem do Produto *</label>
                  <select
                    value={editingRule.origem}
                    onChange={(e) => setEditingRule({ ...editingRule, origem: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="0">0 - Nacional</option>
                    <option value="1">1 - Estrangeira - Importação direta</option>
                    <option value="2">2 - Estrangeira - Adquirida no mercado interno</option>
                    <option value="3">3 - Nacional, com Conteúdo de Importação &gt; 40%</option>
                    <option value="4">4 - Nacional, produção conforme processos produtivos básicos</option>
                    <option value="5">5 - Nacional, com Conteúdo de Importação ≤ 40%</option>
                    <option value="6">6 - Estrangeira - Import. direta, sem similar nacional (CAMEX)</option>
                    <option value="7">7 - Estrangeira - Merc. interno, sem similar nacional (CAMEX)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">UF Destino (opcional)</label>
                <select
                  value={editingRule.ufDestino || ''}
                  onChange={(e) => setEditingRule({ ...editingRule, ufDestino: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                    <option value="">Todas UFs deste tipo</option>
                    <option value="AC">AC - Acre</option>
                    <option value="AL">AL - Alagoas</option>
                    <option value="AP">AP - Amapá</option>
                    <option value="AM">AM - Amazonas</option>
                    <option value="BA">BA - Bahia</option>
                    <option value="CE">CE - Ceará</option>
                    <option value="DF">DF - Distrito Federal</option>
                    <option value="ES">ES - Espírito Santo</option>
                    <option value="GO">GO - Goiás</option>
                    <option value="MA">MA - Maranhão</option>
                    <option value="MT">MT - Mato Grosso</option>
                    <option value="MS">MS - Mato Grosso do Sul</option>
                    <option value="MG">MG - Minas Gerais</option>
                    <option value="PA">PA - Pará</option>
                    <option value="PB">PB - Paraíba</option>
                    <option value="PR">PR - Paraná</option>
                    <option value="PE">PE - Pernambuco</option>
                    <option value="PI">PI - Piauí</option>
                    <option value="RJ">RJ - Rio de Janeiro</option>
                    <option value="RN">RN - Rio Grande do Norte</option>
                    <option value="RS">RS - Rio Grande do Sul</option>
                    <option value="RO">RO - Rondônia</option>
                    <option value="RR">RR - Roraima</option>
                    <option value="SC">SC - Santa Catarina</option>
                    <option value="SP">SP - São Paulo</option>
                    <option value="SE">SE - Sergipe</option>
                    <option value="TO">TO - Tocantins</option>
                  </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">CFOP *</label>
                  <select
                    value={editingRule.cfop}
                    onChange={(e) => setEditingRule({ ...editingRule, cfop: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  >
                    <optgroup label="Operações Internas (5xxx)">
                      <option value="5101">5101 - Venda produção própria</option>
                      <option value="5102">5102 - Venda mercadoria adquirida</option>
                      <option value="5405">5405 - Venda merc. adq. ST</option>
                      <option value="5403">5403 - Venda merc. adq. ST (contribuinte)</option>
                    </optgroup>
                    <optgroup label="Operações Interestaduais (6xxx)">
                      <option value="6101">6101 - Venda produção própria</option>
                      <option value="6102">6102 - Venda mercadoria adquirida</option>
                      <option value="6403">6403 - Venda merc. adq. ST</option>
                      <option value="6404">6404 - Venda merc. ST (consumidor)</option>
                    </optgroup>
                    <optgroup label="Exportação (7xxx)">
                      <option value="7101">7101 - Venda produção própria</option>
                      <option value="7102">7102 - Venda mercadoria adquirida</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">CST/CSOSN *</label>
                  <select
                    value={editingRule.cstIcms}
                    onChange={(e) => setEditingRule({ ...editingRule, cstIcms: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  >
                    <optgroup label="Regime Normal (CST)">
                      <option value="00">00 - Tributada integralmente</option>
                      <option value="10">10 - Tributada e com cobrança do ICMS por ST</option>
                      <option value="20">20 - Com redução de base de cálculo</option>
                      <option value="30">30 - Isenta/não tributada com cobrança de ICMS por ST</option>
                      <option value="40">40 - Isenta</option>
                      <option value="41">41 - Não tributada</option>
                      <option value="50">50 - Com suspensão</option>
                      <option value="51">51 - Com diferimento</option>
                      <option value="60">60 - ICMS cobrado anteriormente por ST</option>
                      <option value="70">70 - Com redução de BC e cobrança de ICMS por ST</option>
                      <option value="90">90 - Outras</option>
                    </optgroup>
                    <optgroup label="Simples Nacional (CSOSN)">
                      <option value="101">101 - Tributada pelo SN com permissão de crédito</option>
                      <option value="102">102 - Tributada pelo SN sem permissão de crédito</option>
                      <option value="103">103 - Isenção do ICMS no SN para faixa de receita</option>
                      <option value="201">201 - Tributada pelo SN com permissão de crédito e ST</option>
                      <option value="202">202 - Tributada pelo SN sem permissão de crédito e ST</option>
                      <option value="203">203 - Isenção do ICMS no SN para faixa de receita e ST</option>
                      <option value="300">300 - Imune</option>
                      <option value="400">400 - Não tributada pelo Simples Nacional</option>
                      <option value="500">500 - ICMS cobrado anteriormente por ST (substituído)</option>
                      <option value="900">900 - Outros</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Campos condicionais para redução de base */}
              {(editingRule.cstIcms === '20' || editingRule.cstIcms === '70') && (
                <div>
                  <label className="block text-sm font-medium mb-1">% Redução Base Cálculo ICMS</label>
                  <input
                    type="text"
                    value={editingRule.reducaoBaseIcms || ''}
                    onChange={(e) => setEditingRule({ ...editingRule, reducaoBaseIcms: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    placeholder="Ex: 33.33"
                  />
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Alíquota ICMS (%)</label>
                  <input
                    type="text"
                    value={editingRule.aliquotaIcms}
                    onChange={(e) => setEditingRule({ ...editingRule, aliquotaIcms: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    placeholder="18"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Alíquota PIS (%)</label>
                  <input
                    type="text"
                    value={editingRule.aliquotaPis}
                    onChange={(e) => setEditingRule({ ...editingRule, aliquotaPis: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    placeholder="1.65"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Alíquota COFINS (%)</label>
                  <input
                    type="text"
                    value={editingRule.aliquotaCofins}
                    onChange={(e) => setEditingRule({ ...editingRule, aliquotaCofins: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    placeholder="7.60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">CST PIS</label>
                  <select
                    value={editingRule.cstPis}
                    onChange={(e) => setEditingRule({ ...editingRule, cstPis: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="01">01 - Operação Tributável</option>
                    <option value="04">04 - Monofásica Revenda Alíquota Zero</option>
                    <option value="05">05 - Operação ST</option>
                    <option value="06">06 - Alíquota Zero</option>
                    <option value="07">07 - Isenta</option>
                    <option value="08">08 - Sem Incidência</option>
                    <option value="09">09 - Suspensão</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">CST COFINS</label>
                  <select
                    value={editingRule.cstCofins}
                    onChange={(e) => setEditingRule({ ...editingRule, cstCofins: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="01">01 - Operação Tributável</option>
                    <option value="04">04 - Monofásica Revenda Alíquota Zero</option>
                    <option value="05">05 - Operação ST</option>
                    <option value="06">06 - Alíquota Zero</option>
                    <option value="07">07 - Isenta</option>
                    <option value="08">08 - Sem Incidência</option>
                    <option value="09">09 - Suspensão</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rule-ativo"
                  checked={editingRule.ativo}
                  onChange={(e) => setEditingRule({ ...editingRule, ativo: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="rule-ativo" className="text-sm font-medium">Regra ativa</label>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => { setShowRuleModal(false); setEditingRule(null) }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveRule}
                disabled={!editingRule.nome}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                Salvar Regra
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
