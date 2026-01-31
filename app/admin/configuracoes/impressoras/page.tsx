'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FiPrinter, FiSave, FiRefreshCw, FiPlus, FiTrash2, FiEdit2,
  FiCheck, FiX, FiFileText, FiTag, FiMonitor, FiSettings,
  FiSearch, FiWifi, FiHardDrive, FiDownload, FiAlertCircle
} from 'react-icons/fi'
interface PrinterConfig {
  id: string
  name: string
  type: 'a4' | 'etiqueta' | 'termica'
  driver: 'browser' | 'raw' | 'escpos' | 'zpl'
  connection: 'usb' | 'network' | 'bluetooth' | 'browser'
  ipAddress?: string
  port?: number
  paperWidth?: number // mm
  paperHeight?: number // mm
  dpi?: number
  isDefault: boolean
  isActive: boolean
  purpose: 'nfe' | 'etiqueta' | 'recibo' | 'geral'
  systemPrinter?: boolean // Se é uma impressora detectada do sistema
}

interface LabelFormat {
  id: string
  name: string
  width: number
  height: number
  marginTop: number
  marginLeft: number
  gap: number
  columns: number
  isDefault: boolean
}

interface SystemPrinter {
  name: string
  isDefault: boolean
  status?: string
}

const PRINTER_TYPES = [
  { value: 'a4', label: 'Impressora A4/Laser', icon: '🖨️', description: 'Para NF-e, relatórios e documentos' },
  { value: 'etiqueta', label: 'Impressora de Etiquetas', icon: '🏷️', description: 'Para etiquetas de envio (Zebra, Argox, etc)' },
  { value: 'termica', label: 'Impressora Térmica', icon: '🧾', description: 'Para cupons e recibos' },
]

const PAPER_FORMATS = [
  { name: 'A4', width: 210, height: 297 },
  { name: 'Carta', width: 216, height: 279 },
  { name: 'Etiqueta 100x150mm', width: 100, height: 150 },
  { name: 'Etiqueta 100x125mm', width: 100, height: 125 },
  { name: 'Etiqueta 100x100mm', width: 100, height: 100 },
  { name: 'Etiqueta 80x40mm', width: 80, height: 40 },
  { name: 'Etiqueta 60x40mm', width: 60, height: 40 },
  { name: 'Etiqueta 50x30mm', width: 50, height: 30 },
  { name: 'Bobina 80mm', width: 80, height: 0 },
  { name: 'Bobina 58mm', width: 58, height: 0 },
]

const LABEL_FORMATS: LabelFormat[] = [
  { id: 'correios-100x125', name: 'Correios (100x125mm)', width: 100, height: 125, marginTop: 3, marginLeft: 3, gap: 3, columns: 1, isDefault: true },
  { id: 'correios-100x150', name: 'Correios (100x150mm)', width: 100, height: 150, marginTop: 3, marginLeft: 3, gap: 3, columns: 1, isDefault: false },
  { id: 'produto-50x30', name: 'Produto (50x30mm)', width: 50, height: 30, marginTop: 2, marginLeft: 2, gap: 2, columns: 1, isDefault: false },
  { id: 'gondola-80x40', name: 'Gôndola (80x40mm)', width: 80, height: 40, marginTop: 2, marginLeft: 2, gap: 2, columns: 1, isDefault: false },
]

export default function ImpressorasPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'impressoras' | 'formatos' | 'configuracao'>('impressoras')
  
  const [printers, setPrinters] = useState<PrinterConfig[]>([])
  const [labelFormats, setLabelFormats] = useState<LabelFormat[]>(LABEL_FORMATS)
  const [editingPrinter, setEditingPrinter] = useState<PrinterConfig | null>(null)
  const [showPrinterModal, setShowPrinterModal] = useState(false)
  
  // Impressoras do sistema
  const [systemPrinters, setSystemPrinters] = useState<SystemPrinter[]>([])
  const [detectingPrinters, setDetectingPrinters] = useState(false)
  const [agentStatus, setAgentStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  // Configurações gerais
  const [generalConfig, setGeneralConfig] = useState({
    defaultLabelPrinter: '',
    defaultA4Printer: '',
    defaultReceiptPrinter: '',
    autoprint: false,
    printNfeOnApproval: false,
    printLabelOnGenerate: true,
    labelFormat: 'correios-100x125',
    labelCopies: 1,
    nfeCopies: 1,
    printMethod: 'browser' as 'browser' | 'agent',
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    loadConfig()
    checkPrintAgent()
  }, [session, status, router])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/config/impressoras')
      if (res.ok) {
        const data = await res.json()
        if (data.printers) setPrinters(data.printers)
        if (data.labelFormats) setLabelFormats(data.labelFormats)
        if (data.generalConfig) setGeneralConfig({ ...generalConfig, ...data.generalConfig })
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    } finally {
      setLoading(false)
    }
  }

  // Verifica se o agente de impressão está rodando
  const checkPrintAgent = async () => {
    setAgentStatus('checking')
    try {
      // Tenta conectar no agente local (porta padrão 12345)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      
      const res = await fetch('http://localhost:12345/printers', {
        method: 'GET',
        mode: 'cors',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (res.ok) {
        const data = await res.json()
        setAgentStatus('online')
        if (data.printers) {
          setSystemPrinters(data.printers)
        }
      } else {
        setAgentStatus('offline')
      }
    } catch (error) {
      console.log('Agente offline ou CORS bloqueado:', error)
      setAgentStatus('offline')
      // Tenta detectar via API do sistema (fallback)
      detectBrowserPrinters()
    }
  }

  // Detecta impressoras via JavaScript (limitado)
  const detectBrowserPrinters = () => {
    // O navegador não permite listar impressoras diretamente por segurança
    // Mas podemos sugerir impressoras comuns ou usar window.print()
    const commonPrinters: SystemPrinter[] = [
      { name: 'Impressora Padrão do Sistema', isDefault: true, status: 'Usar diálogo do navegador' },
    ]
    setSystemPrinters(commonPrinters)
  }

  // Detectar impressoras do sistema via agente
  const detectSystemPrinters = async () => {
    setDetectingPrinters(true)
    try {
      if (agentStatus === 'online') {
        const res = await fetch('http://localhost:12345/printers')
        if (res.ok) {
          const data = await res.json()
          setSystemPrinters(data.printers || [])
          toast.success(`${data.printers?.length || 0} impressoras encontradas!`)
        }
      } else {
        // Sem agente, mostrar diálogo de impressão para o usuário ver as impressoras
        toast('Abrindo diálogo de impressão para visualizar impressoras...', { icon: '🖨️' })
        const testWindow = window.open('', '_blank', 'width=400,height=300')
        if (testWindow) {
          testWindow.document.write(`
            <html>
              <head><title>Detectar Impressoras</title></head>
              <body style="font-family: Arial; padding: 20px; text-align: center;">
                <h2>🖨️ Impressoras do Sistema</h2>
                <p>Clique em "Imprimir" e veja as impressoras disponíveis no diálogo.</p>
                <p>Depois feche esta janela.</p>
                <button onclick="window.print()">Abrir Diálogo de Impressão</button>
              </body>
            </html>
          `)
        }
      }
    } catch (error) {
      console.error('Erro ao detectar impressoras:', error)
      toast.error('Erro ao detectar impressoras')
    } finally {
      setDetectingPrinters(false)
    }
  }

  // Adicionar impressora do sistema à lista
  const addSystemPrinter = (systemPrinter: SystemPrinter) => {
    // Detectar tipo baseado no nome
    let type: PrinterConfig['type'] = 'a4'
    let paperWidth = 210
    let paperHeight = 297
    
    const nameLower = systemPrinter.name.toLowerCase()
    if (nameLower.includes('zebra') || nameLower.includes('argox') || nameLower.includes('elgin') || nameLower.includes('etiqueta') || nameLower.includes('label')) {
      type = 'etiqueta'
      paperWidth = 100
      paperHeight = 125
    } else if (nameLower.includes('térmica') || nameLower.includes('termica') || nameLower.includes('epson tm') || nameLower.includes('bematech') || nameLower.includes('cupom')) {
      type = 'termica'
      paperWidth = 80
      paperHeight = 0
    }

    const newPrinter: PrinterConfig = {
      id: `sys-${Date.now()}`,
      name: systemPrinter.name,
      type,
      driver: 'browser',
      connection: 'browser',
      paperWidth,
      paperHeight,
      dpi: 203,
      isDefault: systemPrinter.isDefault || printers.length === 0,
      isActive: true,
      purpose: type === 'etiqueta' ? 'etiqueta' : type === 'termica' ? 'recibo' : 'geral',
      systemPrinter: true
    }

    // Verificar se já existe
    if (printers.some(p => p.name === systemPrinter.name)) {
      toast.error('Esta impressora já está cadastrada')
      return
    }

    setPrinters([...printers, newPrinter])
    toast.success(`Impressora "${systemPrinter.name}" adicionada!`)
  }

  const saveConfig = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/config/impressoras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printers,
          labelFormats,
          generalConfig
        })
      })
      
      if (res.ok) {
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

  const addPrinter = () => {
    setEditingPrinter({
      id: `printer-${Date.now()}`,
      name: '',
      type: 'a4',
      driver: 'browser',
      connection: 'browser',
      paperWidth: 210,
      paperHeight: 297,
      dpi: 203,
      isDefault: printers.length === 0,
      isActive: true,
      purpose: 'geral'
    })
    setShowPrinterModal(true)
  }

  const editPrinter = (printer: PrinterConfig) => {
    setEditingPrinter({ ...printer })
    setShowPrinterModal(true)
  }

  const savePrinter = () => {
    if (!editingPrinter) return
    
    if (!editingPrinter.name.trim()) {
      toast.error('Nome da impressora é obrigatório')
      return
    }

    const existingIndex = printers.findIndex(p => p.id === editingPrinter.id)
    if (existingIndex >= 0) {
      const updated = [...printers]
      updated[existingIndex] = editingPrinter
      setPrinters(updated)
    } else {
      setPrinters([...printers, editingPrinter])
    }
    
    setShowPrinterModal(false)
    setEditingPrinter(null)
    toast.success('Impressora salva!')
  }

  const deletePrinter = (id: string) => {
    if (confirm('Remover esta impressora?')) {
      setPrinters(printers.filter(p => p.id !== id))
      toast.success('Impressora removida')
    }
  }

  const testPrint = async (printer: PrinterConfig) => {
    toast.loading('Preparando teste de impressão...')
    
    // Criar página de teste
    const testHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Teste - ${printer.name}</title>
        <style>
          @page { size: ${printer.paperWidth}mm ${printer.paperHeight || 'auto'}; margin: 5mm; }
          body { font-family: Arial, sans-serif; padding: 10px; }
          .test-box { border: 2px solid #333; padding: 15px; text-align: center; }
          h2 { margin: 0 0 10px; }
          .barcode { font-family: 'Libre Barcode 128', monospace; font-size: 40px; }
        </style>
      </head>
      <body>
        <div class="test-box">
          <h2>🖨️ TESTE DE IMPRESSÃO</h2>
          <p><strong>${printer.name}</strong></p>
          <p>Tipo: ${PRINTER_TYPES.find(t => t.value === printer.type)?.label}</p>
          <p>Papel: ${printer.paperWidth}x${printer.paperHeight || '∞'}mm</p>
          <hr>
          <p style="font-size: 8px;">Texto 8px - Legível?</p>
          <p style="font-size: 10px;">Texto 10px - Legível?</p>
          <p style="font-size: 12px;">Texto 12px - Legível?</p>
          <hr>
          <p>${new Date().toLocaleString('pt-BR')}</p>
        </div>
        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `
    
    // Abrir em nova janela para impressão
    const printWindow = window.open('', '_blank', `width=${printer.paperWidth ? printer.paperWidth * 3 : 400},height=${printer.paperHeight ? printer.paperHeight * 3 : 500}`)
    if (printWindow) {
      printWindow.document.write(testHtml)
      printWindow.document.close()
      toast.dismiss()
      toast.success('Página de teste aberta!')
    } else {
      toast.dismiss()
      toast.error('Popup bloqueado! Permita popups para este site.')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FiPrinter className="text-blue-500" />
            Configuração de Impressoras
          </h1>
          <p className="text-gray-500 mt-1">
            Configure impressoras para etiquetas, NF-e e recibos
          </p>
        </div>
        <button
          onClick={saveConfig}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {saving ? <FiRefreshCw className="animate-spin" /> : <FiSave />}
          Salvar Configurações
        </button>
      </div>

      {/* Status do Agente */}
      <div className={`mb-6 p-4 rounded-lg flex items-center justify-between ${
        agentStatus === 'online' ? 'bg-green-50 border border-green-200' :
        agentStatus === 'offline' ? 'bg-yellow-50 border border-yellow-200' :
        'bg-gray-50 border border-gray-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            agentStatus === 'online' ? 'bg-green-500' :
            agentStatus === 'offline' ? 'bg-yellow-500' :
            'bg-gray-400 animate-pulse'
          }`}></div>
          <div>
            <div className="font-medium">
              {agentStatus === 'online' ? '✅ Agente de Impressão Online' :
               agentStatus === 'offline' ? '⚠️ Modo Navegador (Diálogo de Impressão)' :
               'Verificando agente...'}
            </div>
            <div className="text-sm text-gray-500">
              {agentStatus === 'online' 
                ? 'Impressão direta habilitada' 
                : 'As impressões abrirão o diálogo do sistema para selecionar a impressora'}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={detectSystemPrinters}
            disabled={detectingPrinters}
            className="flex items-center gap-2 px-3 py-2 bg-white border rounded-lg hover:bg-gray-50"
          >
            {detectingPrinters ? <FiRefreshCw className="animate-spin" /> : <FiSearch />}
            Detectar Impressoras
          </button>
          {agentStatus === 'offline' && (
            <a
              href="/downloads/mydshop-print-agent.exe"
              download
              className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <FiDownload />
              Baixar Agente
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('impressoras')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'impressoras' 
              ? 'border-blue-500 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FiPrinter className="inline mr-2" />
          Impressoras
        </button>
        <button
          onClick={() => setActiveTab('formatos')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'formatos' 
              ? 'border-blue-500 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FiTag className="inline mr-2" />
          Formatos de Etiqueta
        </button>
        <button
          onClick={() => setActiveTab('configuracao')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'configuracao' 
              ? 'border-blue-500 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FiSettings className="inline mr-2" />
          Configuração Geral
        </button>
      </div>

      {/* Tab: Impressoras */}
      {activeTab === 'impressoras' && (
        <div className="space-y-6">
          {/* Impressoras Detectadas do Sistema */}
          {systemPrinters.length > 0 && (
            <div className="bg-blue-50 rounded-lg shadow p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FiHardDrive className="text-blue-500" />
                  Impressoras do Sistema
                </h2>
                <button
                  onClick={detectSystemPrinters}
                  disabled={detectingPrinters}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  <FiRefreshCw className={`inline mr-1 ${detectingPrinters ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {systemPrinters.map((sp, index) => {
                  const alreadyAdded = printers.some(p => p.name === sp.name)
                  return (
                    <div 
                      key={index}
                      className={`flex items-center justify-between p-3 bg-white rounded-lg border ${alreadyAdded ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <FiPrinter className="text-gray-400" />
                        <div>
                          <div className="font-medium text-sm">{sp.name}</div>
                          <div className="text-xs text-gray-500">
                            {sp.isDefault && '⭐ Padrão'}
                            {sp.status && ` • ${sp.status}`}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => addSystemPrinter(sp)}
                        disabled={alreadyAdded}
                        className={`text-sm px-2 py-1 rounded ${
                          alreadyAdded 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        {alreadyAdded ? 'Adicionada' : '+ Adicionar'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Lista de Impressoras Configuradas */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Impressoras Configuradas</h2>
              <button
                onClick={addPrinter}
                className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                <FiPlus /> Adicionar Manual
              </button>
            </div>

            {printers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FiPrinter className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Nenhuma impressora configurada</p>
                <p className="text-sm mt-2">Clique em &quot;Detectar Impressoras&quot; ou adicione manualmente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {printers.map((printer) => (
                  <div 
                    key={printer.id}
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      printer.isActive ? 'bg-white' : 'bg-gray-50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">
                        {printer.type === 'a4' ? '🖨️' : printer.type === 'etiqueta' ? '🏷️' : '🧾'}
                      </div>
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {printer.name}
                          {printer.isDefault && (
                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                              Padrão
                            </span>
                          )}
                          {printer.systemPrinter && (
                            <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded">
                              Sistema
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {PRINTER_TYPES.find(t => t.value === printer.type)?.label}
                          {printer.connection === 'network' && ` • ${printer.ipAddress}:${printer.port}`}
                        </div>
                        <div className="text-xs text-gray-400">
                          {printer.paperWidth}x{printer.paperHeight || '∞'}mm • {printer.dpi || 203} DPI
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => testPrint(printer)}
                        className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                      >
                        🖨️ Testar
                      </button>
                      <button
                        onClick={() => editPrinter(printer)}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded"
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        onClick={() => deletePrinter(printer.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info sobre Impressão */}
          <div className="bg-gray-50 rounded-lg p-4 border">
            <h3 className="font-semibold flex items-center gap-2 mb-2">
              <FiAlertCircle className="text-blue-500" />
              Como funciona a impressão?
            </h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>📱 Modo Navegador (padrão):</strong> Ao imprimir, abre o diálogo do sistema onde você seleciona a impressora. Funciona com qualquer impressora instalada no Windows.</p>
              <p><strong>🚀 Modo Agente (impressão direta):</strong> Com o agente instalado, a impressão vai direto para a impressora configurada, sem diálogo. Ideal para alto volume.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Formatos de Etiqueta */}
      {activeTab === 'formatos' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Formatos de Etiqueta</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {labelFormats.map((format) => (
                <div 
                  key={format.id}
                  className={`p-4 border rounded-lg ${format.isDefault ? 'border-blue-500 bg-blue-50' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">{format.name}</div>
                    {format.isDefault && (
                      <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">
                        Padrão
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Tamanho: {format.width}x{format.height}mm</div>
                    <div>Margens: {format.marginTop}mm (topo) / {format.marginLeft}mm (esq)</div>
                    <div>Gap: {format.gap}mm</div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button 
                      onClick={() => {
                        setLabelFormats(labelFormats.map(f => ({
                          ...f,
                          isDefault: f.id === format.id
                        })))
                      }}
                      className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                    >
                      Definir Padrão
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Formatos de Papel */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Formatos de Papel Comuns</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {PAPER_FORMATS.map((format) => (
                <div key={format.name} className="p-3 border rounded-lg text-center">
                  <div className="font-medium">{format.name}</div>
                  <div className="text-sm text-gray-500">
                    {format.width}x{format.height || '∞'}mm
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Configuração Geral */}
      {activeTab === 'configuracao' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Método de Impressão</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  generalConfig.printMethod === 'browser' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="printMethod"
                  value="browser"
                  checked={generalConfig.printMethod === 'browser'}
                  onChange={() => setGeneralConfig({ ...generalConfig, printMethod: 'browser' })}
                  className="hidden"
                />
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🌐</div>
                  <div>
                    <div className="font-medium">Navegador (Diálogo)</div>
                    <div className="text-sm text-gray-500">
                      Abre o diálogo de impressão do sistema para escolher a impressora. 
                      Funciona com qualquer impressora instalada.
                    </div>
                  </div>
                </div>
              </label>
              <label 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  generalConfig.printMethod === 'agent' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                } ${agentStatus !== 'online' ? 'opacity-50' : ''}`}
              >
                <input
                  type="radio"
                  name="printMethod"
                  value="agent"
                  checked={generalConfig.printMethod === 'agent'}
                  onChange={() => setGeneralConfig({ ...generalConfig, printMethod: 'agent' })}
                  disabled={agentStatus !== 'online'}
                  className="hidden"
                />
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🚀</div>
                  <div>
                    <div className="font-medium">Agente (Impressão Direta)</div>
                    <div className="text-sm text-gray-500">
                      Imprime diretamente sem diálogo. Requer o agente de impressão instalado.
                      {agentStatus !== 'online' && <span className="text-red-500 block">⚠️ Agente offline</span>}
                    </div>
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Impressoras Padrão</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Impressora de Etiquetas</label>
                <select
                  value={generalConfig.defaultLabelPrinter}
                  onChange={(e) => setGeneralConfig({ ...generalConfig, defaultLabelPrinter: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">Usar navegador</option>
                  {printers.filter(p => p.type === 'etiqueta').map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Impressora A4 (NF-e)</label>
                <select
                  value={generalConfig.defaultA4Printer}
                  onChange={(e) => setGeneralConfig({ ...generalConfig, defaultA4Printer: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">Usar navegador</option>
                  {printers.filter(p => p.type === 'a4').map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Impressora Térmica (Recibos)</label>
                <select
                  value={generalConfig.defaultReceiptPrinter}
                  onChange={(e) => setGeneralConfig({ ...generalConfig, defaultReceiptPrinter: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">Usar navegador</option>
                  {printers.filter(p => p.type === 'termica').map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Formato de Etiqueta</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Formato Padrão</label>
                <select
                  value={generalConfig.labelFormat}
                  onChange={(e) => setGeneralConfig({ ...generalConfig, labelFormat: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  {labelFormats.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cópias de Etiqueta</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={generalConfig.labelCopies}
                  onChange={(e) => setGeneralConfig({ ...generalConfig, labelCopies: parseInt(e.target.value) || 1 })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Automação de Impressão</h2>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generalConfig.printNfeOnApproval}
                  onChange={(e) => setGeneralConfig({ ...generalConfig, printNfeOnApproval: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300"
                />
                <div>
                  <div className="font-medium">Imprimir NF-e automaticamente</div>
                  <div className="text-sm text-gray-500">Imprime a NF-e assim que for autorizada</div>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generalConfig.printLabelOnGenerate}
                  onChange={(e) => setGeneralConfig({ ...generalConfig, printLabelOnGenerate: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300"
                />
                <div>
                  <div className="font-medium">Imprimir etiqueta ao gerar</div>
                  <div className="text-sm text-gray-500">Imprime a etiqueta assim que for gerada pelo Correios</div>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Cópias de NF-e</h2>
            <div className="max-w-xs">
              <label className="block text-sm font-medium mb-1">Quantidade de Cópias</label>
              <input
                type="number"
                min="1"
                max="5"
                value={generalConfig.nfeCopies}
                onChange={(e) => setGeneralConfig({ ...generalConfig, nfeCopies: parseInt(e.target.value) || 1 })}
                className="w-full p-2 border rounded-lg"
              />
              <p className="text-sm text-gray-500 mt-1">Número de cópias ao imprimir NF-e</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Impressora */}
      {showPrinterModal && editingPrinter && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">
                {printers.find(p => p.id === editingPrinter.id) ? 'Editar' : 'Nova'} Impressora
              </h3>
              <button onClick={() => setShowPrinterModal(false)} className="text-gray-500 hover:text-gray-700">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome da Impressora *</label>
                <input
                  type="text"
                  value={editingPrinter.name}
                  onChange={(e) => setEditingPrinter({ ...editingPrinter, name: e.target.value })}
                  placeholder="Ex: Zebra GC420t"
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <select
                  value={editingPrinter.type}
                  onChange={(e) => {
                    const type = e.target.value as PrinterConfig['type']
                    let width = 210, height = 297
                    if (type === 'etiqueta') { width = 100; height = 125 }
                    if (type === 'termica') { width = 80; height = 0 }
                    setEditingPrinter({ ...editingPrinter, type, paperWidth: width, paperHeight: height })
                  }}
                  className="w-full p-2 border rounded-lg"
                >
                  {PRINTER_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Conexão</label>
                <select
                  value={editingPrinter.connection}
                  onChange={(e) => setEditingPrinter({ ...editingPrinter, connection: e.target.value as PrinterConfig['connection'] })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="browser">🌐 Via Navegador (window.print)</option>
                  <option value="usb">🔌 USB Direto</option>
                  <option value="network">🌐 Rede (IP)</option>
                  <option value="bluetooth">📶 Bluetooth</option>
                </select>
              </div>

              {editingPrinter.connection === 'network' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Endereço IP</label>
                    <input
                      type="text"
                      value={editingPrinter.ipAddress || ''}
                      onChange={(e) => setEditingPrinter({ ...editingPrinter, ipAddress: e.target.value })}
                      placeholder="192.168.1.100"
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Porta</label>
                    <input
                      type="number"
                      value={editingPrinter.port || 9100}
                      onChange={(e) => setEditingPrinter({ ...editingPrinter, port: parseInt(e.target.value) })}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Largura (mm)</label>
                  <input
                    type="number"
                    value={editingPrinter.paperWidth || 100}
                    onChange={(e) => setEditingPrinter({ ...editingPrinter, paperWidth: parseInt(e.target.value) })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Altura (mm)</label>
                  <input
                    type="number"
                    value={editingPrinter.paperHeight || 125}
                    onChange={(e) => setEditingPrinter({ ...editingPrinter, paperHeight: parseInt(e.target.value) })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">DPI</label>
                  <select
                    value={editingPrinter.dpi || 203}
                    onChange={(e) => setEditingPrinter({ ...editingPrinter, dpi: parseInt(e.target.value) })}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value={203}>203 DPI</option>
                    <option value={300}>300 DPI</option>
                    <option value={600}>600 DPI</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Finalidade</label>
                <select
                  value={editingPrinter.purpose}
                  onChange={(e) => setEditingPrinter({ ...editingPrinter, purpose: e.target.value as PrinterConfig['purpose'] })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="geral">Geral</option>
                  <option value="etiqueta">Etiquetas de Envio</option>
                  <option value="nfe">Notas Fiscais</option>
                  <option value="recibo">Recibos/Cupons</option>
                </select>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPrinter.isDefault}
                    onChange={(e) => setEditingPrinter({ ...editingPrinter, isDefault: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Impressora padrão</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPrinter.isActive}
                    onChange={(e) => setEditingPrinter({ ...editingPrinter, isActive: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Ativa</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={() => setShowPrinterModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={savePrinter}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Salvar Impressora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
