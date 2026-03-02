'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FiSettings, FiImage, FiShoppingCart, FiTool, FiGlobe, FiMail,
  FiSave, FiRefreshCw, FiUpload, FiTrash2, FiPlus, FiX,
  FiServer, FiLock, FiUser, FiSend, FiCheck, FiAlertCircle,
  FiPercent, FiDollarSign
} from 'react-icons/fi'
interface ConfigItem {
  key: string
  value: any
  category: string
  label: string
  description?: string
  type: string
  options?: { value: string; label: string }[]
}

const CATEGORIES = [
  { id: 'geral', name: 'Geral', icon: FiSettings, description: 'Configurações básicas do site' },
  { id: 'aparencia', name: 'Aparência', icon: FiImage, description: 'Banners, cores e visual' },
  { id: 'loading', name: 'Loading/Mascote', icon: FiRefreshCw, description: 'Tela de carregamento e mascote festivo' },
  { id: 'social', name: 'Redes Sociais', icon: FiGlobe, description: 'Links para redes sociais' },
  { id: 'ecommerce', name: 'E-commerce', icon: FiShoppingCart, description: 'Frete, pagamentos e vendas' },
  { id: 'carne', name: 'Carnê / Financiamento', icon: FiDollarSign, description: 'Juros, multas e contrato do carnê' },
  { id: 'impostos', name: 'Impostos', icon: FiPercent, description: 'Taxas de importação e ICMS' },
  { id: 'manutencao', name: 'Manutenção', icon: FiTool, description: 'Modo manutenção e avisos' },
  { id: 'seo', name: 'SEO', icon: FiGlobe, description: 'Meta tags e otimização' },
  { id: 'email', name: 'E-mail', icon: FiMail, description: 'Servidor SMTP e envio' },
]

// Configurações padrão para inicializar
const DEFAULT_CONFIGS: ConfigItem[] = [
  // Geral
  { key: 'site.name', value: 'MYDSHOP', category: 'geral', label: 'Nome do Site', type: 'text' },
  { key: 'site.title', value: 'MYDSHOP - Marketplace Online', category: 'geral', label: 'Título da Página', type: 'text', description: 'Título que aparece na aba do navegador' },
  { key: 'site.description', value: 'Seu marketplace online', category: 'geral', label: 'Descrição', type: 'textarea' },
  { key: 'site.email', value: 'contato@mydshop.com.br', category: 'geral', label: 'E-mail de Contato', type: 'text' },
  { key: 'site.phone', value: '(99) 99999-9999', category: 'geral', label: 'Telefone', type: 'text' },
  { key: 'site.whatsapp', value: '', category: 'geral', label: 'WhatsApp', type: 'text', description: 'Número com código do país. Ex: 5511999999999' },
  { key: 'site.cnpj', value: '', category: 'geral', label: 'CNPJ', type: 'text', description: 'CNPJ da empresa' },
  { key: 'site.address', value: '', category: 'geral', label: 'Endereço', type: 'textarea', description: 'Endereço completo da empresa' },
  
  // Aparência
  { key: 'appearance.primaryColor', value: '#3B82F6', category: 'aparencia', label: 'Cor Primária', type: 'color' },
  { key: 'appearance.secondaryColor', value: '#F97316', category: 'aparencia', label: 'Cor Secundária', type: 'color' },
  { key: 'appearance.backgroundColor', value: '#F3F4F6', category: 'aparencia', label: 'Cor de Fundo', type: 'color', description: 'Cor de fundo das páginas (padrão: cinza claro)' },
  { key: 'appearance.zoom', value: 100, category: 'aparencia', label: 'Zoom do Site (%)', type: 'number', description: 'Escala visual do site (80-120). Ex: 80 = site menor, 100 = normal, 120 = site maior' },
  { key: 'appearance.logo', value: '/logo-animated.svg', category: 'aparencia', label: 'Logo', type: 'image' },
  { key: 'appearance.favicon', value: '/favicon.svg', category: 'aparencia', label: 'Favicon', type: 'image', description: 'Ícone do site (aparece na aba do navegador)' },
  // Carrossel / Banners
  { key: 'appearance.carouselSlides', value: [], category: 'aparencia', label: 'Slides do Carrossel', type: 'carousel', description: 'Configure os slides do carrossel da página inicial' },
  
  // Redes Sociais
  { key: 'social.facebook', value: '', category: 'social', label: 'Facebook', type: 'text', description: 'URL completa do Facebook' },
  { key: 'social.instagram', value: '', category: 'social', label: 'Instagram', type: 'text', description: 'URL completa do Instagram' },
  { key: 'social.twitter', value: '', category: 'social', label: 'Twitter/X', type: 'text', description: 'URL completa do Twitter' },
  { key: 'social.youtube', value: '', category: 'social', label: 'YouTube', type: 'text', description: 'URL completa do canal' },
  { key: 'social.whatsapp', value: '', category: 'social', label: 'WhatsApp Link', type: 'text', description: 'Número para link wa.me (Ex: 5511999999999)' },
  { key: 'social.tiktok', value: '', category: 'social', label: 'TikTok', type: 'text', description: 'URL completa do TikTok' },
  
  // Facebook App para Postagem Automática
  { key: 'social.facebookAppId', value: '2202661637209982', category: 'social', label: 'Facebook App ID', type: 'text', description: 'ID do App Facebook para postagens automáticas' },
  { key: 'social.facebookAppSecret', value: 'b04aac3b91c90fb5472aa171778af122', category: 'social', label: 'Facebook App Secret', type: 'password', description: 'Secret do App Facebook (mantenha seguro)' },
  
  // Loading / Mascote
  { key: 'loading.mascotTheme', value: 'default', category: 'loading', label: 'Tema do Mascote', type: 'select', description: 'Escolha o tema festivo para o mascote de carregamento' },
  { key: 'loading.message1', value: 'Carregando...', category: 'loading', label: 'Mensagem 1', type: 'text', description: 'Primeira mensagem de carregamento' },
  { key: 'loading.message2', value: 'Quase lá...', category: 'loading', label: 'Mensagem 2', type: 'text', description: 'Segunda mensagem de carregamento' },
  { key: 'loading.message3', value: 'Preparando...', category: 'loading', label: 'Mensagem 3', type: 'text', description: 'Terceira mensagem de carregamento' },
  { key: 'loading.backgroundColor', value: 'default', category: 'loading', label: 'Cor de Fundo', type: 'select', description: 'Cor de fundo da tela de loading' },
  
  // E-commerce
  { key: 'ecommerce.freeShippingMin', value: 299, category: 'ecommerce', label: 'Frete Grátis Acima de (R$)', type: 'number' },
  { key: 'ecommerce.defaultCommission', value: 10, category: 'ecommerce', label: 'Comissão Padrão (%)', type: 'number' },
  { key: 'ecommerce.minOrderValue', value: 0, category: 'ecommerce', label: 'Pedido Mínimo (R$)', type: 'number' },
  { key: 'ecommerce.showStock', value: true, category: 'ecommerce', label: 'Mostrar Estoque', type: 'boolean' },
  { key: 'ecommerce.pixDiscount', value: 10, category: 'ecommerce', label: 'Desconto PIX (%)', type: 'number', description: 'Desconto para pagamentos via PIX' },
  // Parcelamento
  { key: 'payment.acceptsCreditCard', value: true, category: 'ecommerce', label: 'Aceita Cartão de Crédito', type: 'boolean', description: 'Habilitar pagamento com cartão' },
  { key: 'payment.maxInstallments', value: 12, category: 'ecommerce', label: 'Máximo de Parcelas', type: 'select', description: 'Máximo de parcelas permitidas', options: [
    { value: '1', label: 'À vista' },
    { value: '2', label: '2x' },
    { value: '3', label: '3x' },
    { value: '4', label: '4x' },
    { value: '5', label: '5x' },
    { value: '6', label: '6x' },
    { value: '7', label: '7x' },
    { value: '8', label: '8x' },
    { value: '9', label: '9x' },
    { value: '10', label: '10x' },
    { value: '11', label: '11x' },
    { value: '12', label: '12x' },
  ]},
  { key: 'payment.installmentsFreeInterest', value: 1, category: 'ecommerce', label: 'Parcelas Sem Juros', type: 'select', description: 'Parcelas sem juros (absorvido pela loja)', options: [
    { value: '1', label: 'Apenas à vista' },
    { value: '2', label: 'Até 2x' },
    { value: '3', label: 'Até 3x' },
    { value: '4', label: 'Até 4x' },
    { value: '5', label: 'Até 5x' },
    { value: '6', label: 'Até 6x' },
    { value: '10', label: 'Até 10x' },
    { value: '12', label: 'Até 12x' },
  ]},
  { key: 'payment.minInstallmentValue', value: 10, category: 'ecommerce', label: 'Valor Mínimo da Parcela (R$)', type: 'number', description: 'Valor mínimo de cada parcela' },

  // Carnê / Financiamento Manual
  { key: 'financing.interestRate', value: 0, category: 'carne', label: 'Juros do Carnê (% ao mês)', type: 'number', description: 'Taxa de juros mensal compostos. Ex: 2.5 = 2,5% a.m. Use 0 para sem juros.' },
  { key: 'financing.name', value: 'Carnê MydShop', category: 'carne', label: 'Nome do Financiamento', type: 'text', description: 'Nome que aparece no contrato e aceite do cliente.' },
  { key: 'financing.lateFeePercent', value: 2, category: 'carne', label: 'Multa por Atraso (%)', type: 'number', description: 'Multa moratória sobre a parcela em atraso. Máximo legal: 2%.' },
  { key: 'financing.lateInterestPercent', value: 1, category: 'carne', label: 'Juros de Mora (% ao mês)', type: 'number', description: 'Juros sobre parcela em atraso. Máximo legal: 1% a.m.' },
  { key: 'financing.rescissionDays', value: 30, category: 'carne', label: 'Dias para Rescisão por Inadimplemento', type: 'number', description: 'Prazo em dias de atraso para ensejar rescisão do contrato.' },
  { key: 'financing.forum', value: '', category: 'carne', label: 'Foro do Contrato (Comarca)', type: 'text', description: 'Cidade/Comarca eleita para dirimir controvérsias. Ex: São Luís - MA.' },

  // Manutenção
  { key: 'maintenance.enabled', value: false, category: 'manutencao', label: 'Modo Manutenção Ativo', type: 'boolean' },
  { key: 'maintenance.message', value: 'Estamos em manutenção. Voltamos em breve!', category: 'manutencao', label: 'Mensagem de Manutenção', type: 'textarea' },
  { key: 'maintenance.estimatedTime', value: '', category: 'manutencao', label: 'Previsão de Retorno', type: 'text' },
  
  // Impostos de Importação
  { key: 'tax.importEnabled', value: true, category: 'impostos', label: 'Cobrar Impostos de Importação', type: 'boolean', description: 'Aplicar impostos para produtos importados (China, etc)' },
  { key: 'tax.importRate', value: 20, category: 'impostos', label: 'Imposto de Importação (%)', type: 'number', description: 'Taxa de imposto de importação (Lei 14.902/2024 - Remessa Conforme = 20%)' },
  { key: 'tax.importBase', value: 'product_freight', category: 'impostos', label: 'Base de Cálculo', type: 'select', description: 'Sobre qual valor calcular o imposto', options: [
    { value: 'product_only', label: 'Apenas Produto' },
    { value: 'product_freight', label: 'Produto + Frete' },
  ]},
  { key: 'tax.icmsEnabled', value: true, category: 'impostos', label: 'Cobrar ICMS', type: 'boolean', description: 'Aplicar ICMS estadual para produtos importados' },
  { key: 'tax.icmsDefault', value: 17, category: 'impostos', label: 'ICMS Padrão (%)', type: 'number', description: 'Alíquota padrão quando não houver configuração específica do estado' },
  { key: 'tax.icmsUseStateRate', value: true, category: 'impostos', label: 'Usar Alíquota por Estado', type: 'boolean', description: 'Usar alíquotas específicas de ICMS por estado (ex: MA=22%, SP=18%)' },
  // Alíquotas ICMS por estado (principais)
  { key: 'tax.icms.AC', value: 19.0, category: 'impostos', label: 'ICMS Acre (AC)', type: 'number' },
  { key: 'tax.icms.AL', value: 19.0, category: 'impostos', label: 'ICMS Alagoas (AL)', type: 'number' },
  { key: 'tax.icms.AM', value: 20.0, category: 'impostos', label: 'ICMS Amazonas (AM)', type: 'number' },
  { key: 'tax.icms.AP', value: 18.0, category: 'impostos', label: 'ICMS Amapá (AP)', type: 'number' },
  { key: 'tax.icms.BA', value: 20.5, category: 'impostos', label: 'ICMS Bahia (BA)', type: 'number' },
  { key: 'tax.icms.CE', value: 20.0, category: 'impostos', label: 'ICMS Ceará (CE)', type: 'number' },
  { key: 'tax.icms.DF', value: 20.0, category: 'impostos', label: 'ICMS Distrito Federal (DF)', type: 'number' },
  { key: 'tax.icms.ES', value: 17.0, category: 'impostos', label: 'ICMS Espírito Santo (ES)', type: 'number' },
  { key: 'tax.icms.GO', value: 19.0, category: 'impostos', label: 'ICMS Goiás (GO)', type: 'number' },
  { key: 'tax.icms.MA', value: 22.0, category: 'impostos', label: 'ICMS Maranhão (MA)', type: 'number' },
  { key: 'tax.icms.MG', value: 18.0, category: 'impostos', label: 'ICMS Minas Gerais (MG)', type: 'number' },
  { key: 'tax.icms.MS', value: 17.0, category: 'impostos', label: 'ICMS Mato Grosso do Sul (MS)', type: 'number' },
  { key: 'tax.icms.MT', value: 17.0, category: 'impostos', label: 'ICMS Mato Grosso (MT)', type: 'number' },
  { key: 'tax.icms.PA', value: 19.0, category: 'impostos', label: 'ICMS Pará (PA)', type: 'number' },
  { key: 'tax.icms.PB', value: 20.0, category: 'impostos', label: 'ICMS Paraíba (PB)', type: 'number' },
  { key: 'tax.icms.PE', value: 20.5, category: 'impostos', label: 'ICMS Pernambuco (PE)', type: 'number' },
  { key: 'tax.icms.PI', value: 21.0, category: 'impostos', label: 'ICMS Piauí (PI)', type: 'number' },
  { key: 'tax.icms.PR', value: 19.5, category: 'impostos', label: 'ICMS Paraná (PR)', type: 'number' },
  { key: 'tax.icms.RJ', value: 22.0, category: 'impostos', label: 'ICMS Rio de Janeiro (RJ)', type: 'number' },
  { key: 'tax.icms.RN', value: 20.0, category: 'impostos', label: 'ICMS Rio Grande do Norte (RN)', type: 'number' },
  { key: 'tax.icms.RO', value: 19.5, category: 'impostos', label: 'ICMS Rondônia (RO)', type: 'number' },
  { key: 'tax.icms.RR', value: 20.0, category: 'impostos', label: 'ICMS Roraima (RR)', type: 'number' },
  { key: 'tax.icms.RS', value: 17.0, category: 'impostos', label: 'ICMS Rio Grande do Sul (RS)', type: 'number' },
  { key: 'tax.icms.SC', value: 17.0, category: 'impostos', label: 'ICMS Santa Catarina (SC)', type: 'number' },
  { key: 'tax.icms.SE', value: 19.0, category: 'impostos', label: 'ICMS Sergipe (SE)', type: 'number' },
  { key: 'tax.icms.SP', value: 18.0, category: 'impostos', label: 'ICMS São Paulo (SP)', type: 'number' },
  { key: 'tax.icms.TO', value: 20.0, category: 'impostos', label: 'ICMS Tocantins (TO)', type: 'number' },
  
  // SEO
  { key: 'seo.title', value: 'MYDSHOP - Seu Marketplace Online', category: 'seo', label: 'Título da Página', type: 'text' },
  { key: 'seo.description', value: 'Encontre os melhores produtos com os melhores preços na MYDSHOP', category: 'seo', label: 'Meta Description', type: 'textarea' },
  { key: 'seo.keywords', value: 'marketplace, loja online, compras, produtos', category: 'seo', label: 'Keywords', type: 'text' },
  { key: 'seo.ogImage', value: '', category: 'seo', label: 'Imagem para Redes Sociais', type: 'image' },
  { key: 'seo.googleAnalytics', value: '', category: 'seo', label: 'Google Analytics ID', type: 'text' },
  { key: 'seo.facebookPixel', value: '', category: 'seo', label: 'Facebook Pixel ID', type: 'text' },
  
  // E-mail
  { key: 'email.smtpHost', value: '', category: 'email', label: 'SMTP Host', type: 'text' },
  { key: 'email.smtpPort', value: 587, category: 'email', label: 'SMTP Port', type: 'number' },
  { key: 'email.smtpUser', value: '', category: 'email', label: 'SMTP Usuário', type: 'text' },
  { key: 'email.smtpPassword', value: '', category: 'email', label: 'SMTP Senha', type: 'password' },
  { key: 'email.smtpSecure', value: false, category: 'email', label: 'Conexão SSL/TLS', type: 'boolean', description: 'Usar SSL (porta 465) ao invés de STARTTLS (porta 587)' },
  { key: 'email.fromName', value: 'MYDSHOP', category: 'email', label: 'Nome do Remetente', type: 'text' },
  { key: 'email.fromEmail', value: 'noreply@mydshop.com.br', category: 'email', label: 'E-mail do Remetente', type: 'text' },
]

// Helper para converter URL de imagem para a API route (necessário para servir uploads dinâmicos)
function getImageSrc(imagePath: string | undefined): string {
  if (!imagePath) return ''
  // Se já é uma URL completa ou data URL, retorna como está
  if (imagePath.startsWith('http') || imagePath.startsWith('data:')) return imagePath
  // Se começa com /uploads, usa a API route
  if (imagePath.startsWith('/uploads')) {
    return `/api/image${imagePath}`
  }
  // Outros caminhos (logo, favicon, etc) - tenta servir como estático primeiro
  return imagePath
}

export default function ConfiguracoesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeCategory, setActiveCategory] = useState('geral')
  const [configs, setConfigs] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  
  // Estados para teste de email
  const [testEmail, setTestEmail] = useState('')
  const [testingEmail, setTestingEmail] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user?.role !== 'ADMIN') {
      router.push('/')
    }
  }, [session, status, router])

  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/config')
      
      if (res.ok) {
        const data = await res.json()
        
        // Mesclar configurações do banco com padrões
        // API retorna { configs: {...}, configList: [...] }
        const mergedConfigs: Record<string, any> = {}
        DEFAULT_CONFIGS.forEach(config => {
          mergedConfigs[config.key] = data.configs?.[config.key] ?? config.value
        })
        
        setConfigs(mergedConfigs)
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      toast.error('Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (key: string, value: any) => {
    setConfigs(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      // Preparar configs para salvar
      const configsToSave = DEFAULT_CONFIGS
        .filter(c => c.category === activeCategory)
        .map(config => ({
          key: config.key,
          value: configs[config.key],
          category: config.category,
          label: config.label,
          description: config.description,
          type: config.type
        }))

      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs: configsToSave })
      })

      if (res.ok) {
        toast.success('Configurações salvas com sucesso!')
        setHasChanges(false)
        // Limpa cache do loading para pegar nova configuração
        if (typeof window !== 'undefined') {
          localStorage.removeItem('loadingConfig')
        }
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

  // Função para testar envio de email
  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error('Digite um e-mail para teste')
      return
    }

    try {
      setTestingEmail(true)
      setTestResult(null)
      
      const emailConfig = {
        smtpHost: configs['email.smtpHost'],
        smtpPort: configs['email.smtpPort'],
        smtpUser: configs['email.smtpUser'],
        smtpPassword: configs['email.smtpPassword'],
        smtpSecure: configs['email.smtpSecure'],
        fromName: configs['email.fromName'],
        fromEmail: configs['email.fromEmail']
      }
      
      const res = await fetch('/api/admin/config/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, config: emailConfig })
      })

      const data = await res.json()
      
      if (res.ok && data.success) {
        setTestResult({ success: true, message: 'E-mail enviado com sucesso!' })
        toast.success('E-mail de teste enviado!')
      } else {
        setTestResult({ success: false, message: data.error || 'Falha ao enviar e-mail' })
        toast.error(data.error || 'Erro ao enviar e-mail de teste')
      }
    } catch (error) {
      console.error('Erro no teste:', error)
      setTestResult({ success: false, message: 'Erro ao testar conexão' })
      toast.error('Erro ao testar')
    } finally {
      setTestingEmail(false)
    }
  }

  const handleSaveAll = async () => {
    try {
      setSaving(true)
      
      const configsToSave = DEFAULT_CONFIGS.map(config => ({
        key: config.key,
        value: configs[config.key],
        category: config.category,
        label: config.label,
        description: config.description,
        type: config.type
      }))

      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs: configsToSave })
      })

      if (res.ok) {
        toast.success('Todas as configurações salvas!')
        setHasChanges(false)
        // Limpa cache do loading para pegar nova configuração
        if (typeof window !== 'undefined') {
          localStorage.removeItem('loadingConfig')
        }
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

  const renderInput = (config: ConfigItem) => {
    const value = configs[config.key] ?? config.value

    switch (config.type) {
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleChange(config.key, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            rows={3}
          />
        )
      
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleChange(config.key, parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        )
      
      case 'boolean':
        return (
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={value === true || value === 'true'}
              onChange={(e) => handleChange(config.key, e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary-600"></div>
            <span className="ml-3 text-sm font-medium text-gray-700">
              {value ? 'Ativado' : 'Desativado'}
            </span>
          </label>
        )
      
      case 'color':
        return (
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={value}
              onChange={(e) => handleChange(config.key, e.target.value)}
              className="w-12 h-12 rounded-lg cursor-pointer border-0"
            />
            <input
              type="text"
              value={value}
              onChange={(e) => handleChange(config.key, e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
              placeholder="#000000"
            />
          </div>
        )
      
      case 'image':
        return (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={value}
                onChange={(e) => handleChange(config.key, e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="URL da imagem ou caminho local"
              />
              <label className="cursor-pointer bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload
                <input
                  type="file"
                  accept="image/*,.svg,.ico"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    
                    const formData = new FormData()
                    formData.append('file', file)
                    
                    try {
                      const response = await fetch('/api/upload', {
                        method: 'POST',
                        body: formData
                      })
                      const data = await response.json()
                      
                      if (data.success && data.url) {
                        handleChange(config.key, data.url)
                      } else {
                        alert(data.error || 'Erro ao fazer upload')
                      }
                    } catch (error) {
                      alert('Erro ao fazer upload')
                    }
                  }}
                />
              </label>
            </div>
            {value && (
              <div className="relative w-40 h-24 bg-gray-100 rounded-lg overflow-hidden border">
                <img 
                  src={getImageSrc(value)} 
                  alt="Preview" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              </div>
            )}
          </div>
        )
      
      case 'password':
        return (
          <input
            type="password"
            value={value}
            onChange={(e) => handleChange(config.key, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        )
      
      case 'select':
        // Opções específicas para cada select
        const selectOptions: Record<string, { value: string; label: string; emoji?: string }[]> = {
          'loading.mascotTheme': [
            { value: 'default', label: 'Padrão (Sacola Azul)', emoji: '🛍️' },
            { value: 'natal', label: 'Natal (Gorro de Papai Noel)', emoji: '🎅' },
            { value: 'carnaval', label: 'Carnaval (Confetes)', emoji: '🎭' },
            { value: 'halloween', label: 'Halloween (Abóbora)', emoji: '🎃' },
            { value: 'pascoa', label: 'Páscoa (Orelhas de Coelho)', emoji: '🐰' },
            { value: 'junina', label: 'Festa Junina (Chapéu de Palha)', emoji: '🌽' },
            { value: 'blackfriday', label: 'Black Friday (Dourado)', emoji: '🖤' },
            { value: 'dia-maes', label: 'Dia das Mães (Corações)', emoji: '💐' },
            { value: 'dia-namorados', label: 'Dia dos Namorados (Corações)', emoji: '❤️' },
          ],
          'loading.backgroundColor': [
            { value: 'default', label: 'Padrão (Azul/Laranja)' },
            { value: 'natal', label: 'Natal (Vermelho/Verde)' },
            { value: 'carnaval', label: 'Carnaval (Colorido)' },
            { value: 'halloween', label: 'Halloween (Roxo/Laranja)' },
            { value: 'pascoa', label: 'Páscoa (Rosa/Azul)' },
            { value: 'junina', label: 'Festa Junina (Amarelo/Vermelho)' },
            { value: 'blackfriday', label: 'Black Friday (Preto/Dourado)' },
            { value: 'dark', label: 'Escuro' },
          ],
        }
        const options = selectOptions[config.key] || []
        return (
          <select
            value={value}
            onChange={(e) => handleChange(config.key, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
          >
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.emoji ? `${opt.emoji} ` : ''}{opt.label}
              </option>
            ))}
          </select>
        )
      
      case 'json':
        return (
          <textarea
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                handleChange(config.key, e.target.value)
              } catch {
                handleChange(config.key, e.target.value)
              }
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
            rows={5}
            placeholder="[]"
          />
        )
      
      case 'carousel':
        const slides = Array.isArray(value) ? value : []
        
        const addSlide = () => {
          const newSlide = {
            id: Date.now().toString(),
            type: 'image', // 'image' ou 'hero'
            active: true,
            image: '',
            title: '',
            subtitle: '',
            discount: '',
            badge: '',
            buttonText: 'COMPRAR AGORA',
            buttonLink: '/produtos',
            bgColor: 'from-primary-500 to-primary-700',
          }
          handleChange(config.key, [...slides, newSlide])
        }
        
        const updateSlide = (slideId: string, field: string, fieldValue: any) => {
          const updated = slides.map((s: any) => 
            s.id === slideId ? { ...s, [field]: fieldValue } : s
          )
          handleChange(config.key, updated)
        }
        
        const removeSlide = (slideId: string) => {
          handleChange(config.key, slides.filter((s: any) => s.id !== slideId))
        }
        
        const moveSlide = (slideId: string, direction: 'up' | 'down') => {
          const idx = slides.findIndex((s: any) => s.id === slideId)
          if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === slides.length - 1)) return
          const newSlides = [...slides]
          const swapIdx = direction === 'up' ? idx - 1 : idx + 1
          ;[newSlides[idx], newSlides[swapIdx]] = [newSlides[swapIdx], newSlides[idx]]
          handleChange(config.key, newSlides)
        }
        
        return (
          <div className="space-y-4">
            {/* Lista de Slides */}
            {slides.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-500 mb-4">Nenhum slide configurado</p>
                <button
                  onClick={addSlide}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <FiPlus className="inline mr-2" /> Adicionar Primeiro Slide
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {slides.map((slide: any, idx: number) => (
                  <div key={slide.id} className="border rounded-lg p-4 bg-white shadow-sm">
                    {/* Header do Slide */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b">
                      <div className="flex items-center gap-3">
                        <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-medium">
                          Slide {idx + 1}
                        </span>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={slide.active}
                            onChange={(e) => updateSlide(slide.id, 'active', e.target.checked)}
                            className="w-4 h-4 text-primary-600 rounded"
                          />
                          <span className="text-sm">Ativo</span>
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => moveSlide(slide.id, 'up')}
                          disabled={idx === 0}
                          className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                          title="Mover para cima"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveSlide(slide.id, 'down')}
                          disabled={idx === slides.length - 1}
                          className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                          title="Mover para baixo"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => removeSlide(slide.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                          title="Remover"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    {/* Tipo do Slide */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tipo do Slide</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`slide-type-${slide.id}`}
                            value="image"
                            checked={slide.type === 'image'}
                            onChange={() => updateSlide(slide.id, 'type', 'image')}
                            className="w-4 h-4 text-primary-600"
                          />
                          <span>Banner com Imagem</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`slide-type-${slide.id}`}
                            value="hero"
                            checked={slide.type === 'hero'}
                            onChange={() => updateSlide(slide.id, 'type', 'hero')}
                            className="w-4 h-4 text-primary-600"
                          />
                          <span>Hero com Texto</span>
                        </label>
                      </div>
                    </div>
                    
                    {slide.type === 'image' ? (
                      /* Tipo: Banner com Imagem */
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Imagem do Banner</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={slide.image || ''}
                              onChange={(e) => updateSlide(slide.id, 'image', e.target.value)}
                              placeholder="URL da imagem"
                              className="flex-1 px-3 py-2 border rounded-lg"
                            />
                            <label className="cursor-pointer bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                              <FiUpload size={16} />
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0]
                                  if (!file) return
                                  const formData = new FormData()
                                  formData.append('file', file)
                                  try {
                                    const response = await fetch('/api/upload', { method: 'POST', body: formData })
                                    const data = await response.json()
                                    if (data.success && data.url) {
                                      updateSlide(slide.id, 'image', data.url)
                                    }
                                  } catch (error) {
                                    toast.error('Erro ao fazer upload')
                                  }
                                }}
                              />
                            </label>
                          </div>
                          {slide.image && (
                            <div className="mt-2 relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                              <img src={getImageSrc(slide.image)} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Link (ao clicar)</label>
                          <input
                            type="text"
                            value={slide.buttonLink || ''}
                            onChange={(e) => updateSlide(slide.id, 'buttonLink', e.target.value)}
                            placeholder="/categorias/promocoes"
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                      </div>
                    ) : (
                      /* Tipo: Hero com Texto */
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                          <input
                            type="text"
                            value={slide.title || ''}
                            onChange={(e) => updateSlide(slide.id, 'title', e.target.value)}
                            placeholder="MEGA PROMOÇÃO"
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Subtítulo</label>
                          <input
                            type="text"
                            value={slide.subtitle || ''}
                            onChange={(e) => updateSlide(slide.id, 'subtitle', e.target.value)}
                            placeholder="Descontos incríveis"
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Badge</label>
                          <input
                            type="text"
                            value={slide.badge || ''}
                            onChange={(e) => updateSlide(slide.id, 'badge', e.target.value)}
                            placeholder="economize agora"
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Desconto</label>
                          <input
                            type="text"
                            value={slide.discount || ''}
                            onChange={(e) => updateSlide(slide.id, 'discount', e.target.value)}
                            placeholder="10% ou FREE"
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Texto do Botão</label>
                          <input
                            type="text"
                            value={slide.buttonText || ''}
                            onChange={(e) => updateSlide(slide.id, 'buttonText', e.target.value)}
                            placeholder="COMPRAR AGORA"
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Link do Botão</label>
                          <input
                            type="text"
                            value={slide.buttonLink || ''}
                            onChange={(e) => updateSlide(slide.id, 'buttonLink', e.target.value)}
                            placeholder="/produtos"
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Cor de Fundo</label>
                          <select
                            value={slide.bgColor || 'from-primary-500 to-primary-700'}
                            onChange={(e) => updateSlide(slide.id, 'bgColor', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg bg-white"
                          >
                            <option value="from-primary-500 to-primary-700">Azul (Primária)</option>
                            <option value="from-accent-500 to-accent-600">Laranja (Secundária)</option>
                            <option value="from-purple-500 to-pink-600">Roxo → Rosa</option>
                            <option value="from-green-500 to-teal-600">Verde → Teal</option>
                            <option value="from-red-500 to-orange-500">Vermelho → Laranja</option>
                            <option value="from-gray-800 to-gray-900">Escuro</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Imagem (opcional)</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={slide.image || ''}
                              onChange={(e) => updateSlide(slide.id, 'image', e.target.value)}
                              placeholder="URL da imagem"
                              className="flex-1 px-3 py-2 border rounded-lg text-sm"
                            />
                            <label className="cursor-pointer bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded-lg">
                              <FiUpload size={16} />
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0]
                                  if (!file) return
                                  const formData = new FormData()
                                  formData.append('file', file)
                                  try {
                                    const response = await fetch('/api/upload', { method: 'POST', body: formData })
                                    const data = await response.json()
                                    if (data.success && data.url) {
                                      updateSlide(slide.id, 'image', data.url)
                                    }
                                  } catch (error) {
                                    toast.error('Erro ao fazer upload')
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Botão adicionar */}
                <button
                  onClick={addSlide}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary-500 hover:text-primary-600 transition-colors flex items-center justify-center gap-2"
                >
                  <FiPlus /> Adicionar Slide
                </button>
              </div>
            )}
          </div>
        )
      
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(config.key, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        )
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const categoryConfigs = DEFAULT_CONFIGS.filter(c => c.category === activeCategory)
  const activeIcon = CATEGORIES.find(c => c.id === activeCategory)?.icon || FiSettings

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FiSettings className="text-primary-600" />
              Configurações do Sistema
            </h1>
            <p className="text-gray-500 mt-1">Gerencie todas as configurações do seu e-commerce</p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={loadConfigs}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FiRefreshCw size={18} />
              Recarregar
            </button>
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              <FiSave size={18} />
              {saving ? 'Salvando...' : 'Salvar Tudo'}
            </button>
          </div>
        </div>

        {/* Alert de mudanças não salvas */}
        {hasChanges && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
            <span className="text-yellow-800">⚠️ Você tem alterações não salvas</span>
            <button
              onClick={handleSave}
              className="px-4 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              Salvar Categoria
            </button>
          </div>
        )}

        <div className="flex gap-8">
          {/* Sidebar de Categorias */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm p-4 sticky top-20">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
                Categorias
              </h3>
              <nav className="space-y-1">
                {CATEGORIES.map(category => {
                  const Icon = category.icon
                  const isActive = activeCategory === category.id
                  
                  return (
                    <button
                      key={category.id}
                      onClick={() => {
                        setActiveCategory(category.id)
                        setHasChanges(false)
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                        isActive 
                          ? 'bg-primary-50 text-primary-700 font-medium' 
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon size={20} className={isActive ? 'text-primary-600' : 'text-gray-400'} />
                      <div>
                        <div className="text-sm">{category.name}</div>
                        <div className="text-xs text-gray-400">{category.description}</div>
                      </div>
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Conteúdo Principal */}
          <div className="flex-1">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                {(() => {
                  const Icon = CATEGORIES.find(c => c.id === activeCategory)?.icon || FiSettings
                  return <Icon size={24} className="text-primary-600" />
                })()}
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {CATEGORIES.find(c => c.id === activeCategory)?.name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {CATEGORIES.find(c => c.id === activeCategory)?.description}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {categoryConfigs.map(config => (
                  <div key={config.key} className="grid grid-cols-3 gap-4 items-start">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {config.label}
                      </label>
                      {config.description && (
                        <p className="text-xs text-gray-400 mt-1">{config.description}</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      {renderInput(config)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Seção de Teste de Email (apenas para categoria email) */}
              {activeCategory === 'email' && (
                <div className="mt-8 pt-6 border-t">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FiSend className="text-orange-600" />
                    Testar Conexão SMTP
                  </h3>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          E-mail para teste
                        </label>
                        <input
                          type="email"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          placeholder="seu@email.com"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={handleTestEmail}
                          disabled={testingEmail || !testEmail}
                          className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
                        >
                          {testingEmail ? (
                            <>
                              <FiRefreshCw className="animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <FiSend />
                              Enviar Teste
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {testResult && (
                      <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${
                        testResult.success 
                          ? 'bg-green-50 text-green-800 border border-green-200' 
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}>
                        {testResult.success ? (
                          <FiCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        ) : (
                          <FiAlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        )}
                        <span>{testResult.message}</span>
                      </div>
                    )}

                    <p className="text-xs text-gray-500 mt-3">
                      💡 Salve as configurações antes de testar. O teste enviará um e-mail para o endereço informado.
                    </p>
                  </div>
                </div>
              )}

              {/* Botão de Salvar no final */}
              <div className="mt-8 pt-6 border-t flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 font-medium"
                >
                  <FiSave size={20} />
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
