'use client'

import { useState, useEffect } from 'react'
import { Smartphone, 
  Palette, 
  Image, 
  Type, 
  Save, 
  RefreshCw,
  Eye,
  Upload,
  Trash2,
  Server,
  Globe,
  Plus,
  Minus,
  Camera
} from 'lucide-react'

// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';


interface BannerConfig {
  id: string
  title: string
  subtitle: string
  icon: string
  gradient: string
  backgroundColor?: string
  textColor?: string
  buttonText?: string
  buttonLink?: string
  image?: string
  active: boolean
  order: number
}

interface AppConfig {
  // Marca
  'app.name': string
  'app.slogan': string
  'app.logo': string
  'app.logoLight': string
  'app.logoDark': string
  'app.icon': string
  'app.splashScreen': string
  
  // Banner Carrossel
  'app.banners': BannerConfig[]
  
  // Cores
  'app.primaryColor': string
  'app.secondaryColor': string
  'app.accentColor': string
  'app.backgroundColor': string
  'app.textColor': string
  'app.successColor': string
  'app.warningColor': string
  'app.dangerColor': string
  
  // Textos
  'app.loginTitle': string
  'app.loginSubtitle': string
  'app.registerTitle': string
  'app.registerSubtitle': string
  'app.homeWelcome': string
  
  // Funcionalidades
  'app.enablePushNotifications': boolean
  'app.enableBiometricLogin': boolean
  'app.enableDarkMode': boolean
  'app.enableGuestCheckout': boolean
  'app.maintenanceMode': boolean
  'app.maintenanceMessage': string
  'app.maintenanceReturnDate': string
  
  // Suporte
  'app.termsUrl': string
  'app.privacyUrl': string
  'app.supportEmail': string
  'app.supportPhone': string
  'app.supportWhatsapp': string
  
  // Conexão/API
  'app.apiUrl': string
  'app.apiUrlDev': string
  'app.apiUrlProd': string
}

const defaultConfig: AppConfig = {
  'app.name': 'MYDSHOP',
  'app.slogan': 'Sua loja na palma da mão',
  'app.logo': '',
  'app.logoLight': '',
  'app.logoDark': '',
  'app.icon': '',
  'app.splashScreen': '',
  'app.banners': [
    {
      id: '1',
      title: 'Super Ofertas',
      subtitle: 'Até 50% OFF em produtos selecionados',
      icon: '🔥',
      gradient: 'linear-gradient(135deg, #f97316, #ea580c)',
      buttonText: 'Ver Ofertas',
      buttonLink: '/ofertas',
      active: true,
      order: 1
    },
    {
      id: '2',
      title: 'Frete Grátis',
      subtitle: 'Em compras acima de R$ 99',
      icon: '🚚',
      gradient: 'linear-gradient(135deg, #16a34a, #15803d)',
      buttonText: 'Aproveitar',
      buttonLink: '/frete-gratis',
      active: true,
      order: 2
    },
    {
      id: '3',
      title: 'Novidades',
      subtitle: 'Confira os produtos recém-chegados',
      icon: '✨',
      gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      buttonText: 'Explorar',
      buttonLink: '/novidades',
      active: true,
      order: 3
    },
    {
      id: '4',
      title: 'PIX Desconto',
      subtitle: '5% OFF no pagamento via PIX',
      icon: '💳',
      gradient: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
      buttonText: 'Usar PIX',
      buttonLink: '/pix',
      active: true,
      order: 4
    }
  ],
  'app.primaryColor': '#f97316',
  'app.secondaryColor': '#2563eb',
  'app.accentColor': '#8b5cf6',
  'app.backgroundColor': '#ffffff',
  'app.textColor': '#1f2937',
  'app.successColor': '#16a34a',
  'app.warningColor': '#eab308',
  'app.dangerColor': '#ef4444',
  'app.loginTitle': 'Bem-vindo de volta!',
  'app.loginSubtitle': 'Faça login para continuar',
  'app.registerTitle': 'Crie sua conta',
  'app.registerSubtitle': 'É rápido e gratuito',
  'app.homeWelcome': 'Olá! O que você procura hoje?',
  'app.enablePushNotifications': true,
  'app.enableBiometricLogin': true,
  'app.enableDarkMode': true,
  'app.enableGuestCheckout': false,
  'app.maintenanceMode': false,
  'app.maintenanceMessage': 'Estamos em manutenção. Voltamos em breve!',
  'app.maintenanceReturnDate': '',
  'app.termsUrl': '/termos',
  'app.privacyUrl': '/privacidade',
  'app.supportEmail': '',
  'app.supportPhone': '',
  'app.supportWhatsapp': '',
  'app.apiUrl': 'https://mydshop.com.br/api',
  'app.apiUrlDev': 'http://localhost:3000/api',
  'app.apiUrlProd': 'https://mydshop.com.br/api',
}

export default function AparenciaAppPage() {
  const [config, setConfig] = useState<AppConfig>(defaultConfig)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'marca' | 'carrossel' | 'cores' | 'textos' | 'funcionalidades' | 'conexao'>('marca')
  const [previewMode, setPreviewMode] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/config/app')
      if (response.ok) {
        const data = await response.json()
        setConfig({ ...defaultConfig, ...data })
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
      const response = await fetch('/api/admin/config/app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      
      if (response.ok) {
        alert('Configurações salvas com sucesso!')
      } else {
        throw new Error('Erro ao salvar')
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      alert('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (key: keyof AppConfig, value: string | boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const handleImageUpload = async (key: keyof AppConfig, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', 'app')

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        const data = await response.json()
        handleChange(key, data.url)
      }
    } catch (error) {
      console.error('Erro no upload:', error)
      alert('Erro ao fazer upload da imagem')
    }
  }

  const handleBannerImageUpload = async (bannerId: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', 'banners')

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        const data = await response.json()
        updateBanner(bannerId, { image: data.url })
      }
    } catch (error) {
      console.error('Erro no upload do banner:', error)
      alert('Erro ao fazer upload da imagem')
    }
  }

  const updateBanner = (bannerId: string, updates: Partial<BannerConfig>) => {
    setConfig(prev => ({
      ...prev,
      'app.banners': prev['app.banners'].map(banner => 
        banner.id === bannerId ? { ...banner, ...updates } : banner
      )
    }))
  }

  const addBanner = () => {
    const newId = (config['app.banners'].length + 1).toString()
    const newBanner: BannerConfig = {
      id: newId,
      title: 'Novo Banner',
      subtitle: 'Descrição do banner',
      icon: '✨',
      gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      buttonText: 'Ver Mais',
      buttonLink: '/',
      active: true,
      order: config['app.banners'].length + 1
    }
    
    setConfig(prev => ({
      ...prev,
      'app.banners': [...prev['app.banners'], newBanner]
    }))
  }

  const removeBanner = (bannerId: string) => {
    setConfig(prev => ({
      ...prev,
      'app.banners': prev['app.banners']
        .filter(banner => banner.id !== bannerId)
        .map((banner, index) => ({ ...banner, order: index + 1 }))
    }))
  }

  const moveBanner = (bannerId: string, direction: 'up' | 'down') => {
    const banners = [...config['app.banners']]
    const currentIndex = banners.findIndex(b => b.id === bannerId)
    
    if (currentIndex === -1) return
    
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= banners.length) return
    
    [banners[currentIndex], banners[targetIndex]] = [banners[targetIndex], banners[currentIndex]]
    
    banners.forEach((banner, index) => {
      banner.order = index + 1
    })
    
    setConfig(prev => ({ ...prev, 'app.banners': banners }))
  }

  const tabs = [
    { id: 'marca', label: 'Marca', icon: Image },
    { id: 'carrossel', label: 'Banner Carrossel', icon: Camera },
    { id: 'cores', label: 'Cores', icon: Palette },
    { id: 'textos', label: 'Textos', icon: Type },
    { id: 'funcionalidades', label: 'Funcionalidades', icon: Smartphone },
    { id: 'conexao', label: 'Conexão', icon: Server },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Smartphone className="w-7 h-7 text-orange-500" />
            Aparência do App
          </h1>
          <p className="text-gray-500 mt-1">
            Configure a identidade visual e textos do aplicativo móvel
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            {previewMode ? 'Fechar Preview' : 'Preview'}
          </button>
          
          <button
            onClick={saveConfig}
            disabled={saving}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-1">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 flex items-center gap-2 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: Marca */}
          {activeTab === 'marca' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Identidade da Marca</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome do App
                    </label>
                    <input
                      type="text"
                      value={config['app.name']}
                      onChange={(e) => handleChange('app.name', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="MYDSHOP"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Slogan
                    </label>
                    <input
                      type="text"
                      value={config['app.slogan']}
                      onChange={(e) => handleChange('app.slogan', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Sua loja na palma da mão"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Logos e Imagens</h3>
                
                <div className="grid grid-cols-3 gap-4">
                  {/* Logo Principal */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Logo Principal
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      {config['app.logo'] ? (
                        <div className="relative">
                          <img src={config['app.logo']} alt="Logo" className="max-h-20 mx-auto" />
                          <button
                            onClick={() => handleChange('app.logo', '')}
                            className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                          <span className="text-sm text-gray-500">Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleImageUpload('app.logo', e.target.files[0])}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Ícone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ícone do App
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      {config['app.icon'] ? (
                        <div className="relative">
                          <img src={config['app.icon']} alt="Ícone" className="w-16 h-16 mx-auto rounded-lg" />
                          <button
                            onClick={() => handleChange('app.icon', '')}
                            className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                          <span className="text-sm text-gray-500">1024x1024</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleImageUpload('app.icon', e.target.files[0])}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Splash Screen */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Splash Screen
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      {config['app.splashScreen'] ? (
                        <div className="relative">
                          <img src={config['app.splashScreen']} alt="Splash" className="max-h-20 mx-auto" />
                          <button
                            onClick={() => handleChange('app.splashScreen', '')}
                            className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                          <span className="text-sm text-gray-500">Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleImageUpload('app.splashScreen', e.target.files[0])}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Banner Carrossel */}
          {activeTab === 'carrossel' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Camera className="w-5 h-5 text-orange-500" />
                      Banner Carrossel
                    </h3>
                    <p className="text-gray-500 text-sm mt-1">
                      Configure até 5 banners promocionais que serão exibidos no carrossel da home
                    </p>
                  </div>
                  
                  {config['app.banners'].length < 5 && (
                    <button
                      onClick={addBanner}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar Banner
                    </button>
                  )}
                </div>
                
                <div className="space-y-4">
                  {config['app.banners'].map((banner, index) => (
                    <div key={banner.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{banner.icon}</div>
                          <div>
                            <h4 className="font-medium text-gray-900">{banner.title}</h4>
                            <p className="text-sm text-gray-500">Banner #{banner.order}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => moveBanner(banner.id, 'up')}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            title="Mover para cima"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveBanner(banner.id, 'down')}
                            disabled={index === config['app.banners'].length - 1}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            title="Mover para baixo"
                          >
                            ↓
                          </button>
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={banner.active}
                              onChange={(e) => updateBanner(banner.id, { active: e.target.checked })}
                              className="mr-2 text-orange-500"
                            />
                            <span className="text-sm text-gray-600">Ativo</span>
                          </label>
                          {config['app.banners'].length > 1 && (
                            <button
                              onClick={() => removeBanner(banner.id)}
                              className="p-1 text-red-500 hover:text-red-700"
                              title="Remover banner"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Título
                          </label>
                          <input
                            type="text"
                            value={banner.title}
                            onChange={(e) => updateBanner(banner.id, { title: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Subtítulo
                          </label>
                          <input
                            type="text"
                            value={banner.subtitle}
                            onChange={(e) => updateBanner(banner.id, { subtitle: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Ícone/Emoji
                          </label>
                          <input
                            type="text"
                            value={banner.icon}
                            onChange={(e) => updateBanner(banner.id, { icon: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                            placeholder="🔥 ou ✨"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Gradiente CSS
                          </label>
                          <input
                            type="text"
                            value={banner.gradient}
                            onChange={(e) => updateBanner(banner.id, { gradient: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                            placeholder="linear-gradient(135deg, #f97316, #ea580c)"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Texto do Botão
                          </label>
                          <input
                            type="text"
                            value={banner.buttonText || ''}
                            onChange={(e) => updateBanner(banner.id, { buttonText: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                            placeholder="Ver Mais"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Link do Botão
                          </label>
                          <input
                            type="text"
                            value={banner.buttonLink || ''}
                            onChange={(e) => updateBanner(banner.id, { buttonLink: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                            placeholder="/produtos ou https://..."
                          />
                        </div>
                      </div>
                      
                      {/* Upload de Imagem do Banner */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Imagem de Fundo (Opcional)
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                          {banner.image ? (
                            <div className="relative">
                              <img src={banner.image} alt="Banner" className="max-h-32 mx-auto rounded" />
                              <button
                                onClick={() => updateBanner(banner.id, { image: '' })}
                                className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <label className="cursor-pointer flex flex-col items-center">
                              <Upload className="w-8 h-8 text-gray-400 mb-2" />
                              <span className="text-sm text-gray-500">Fazer upload da imagem</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => e.target.files?.[0] && handleBannerImageUpload(banner.id, e.target.files[0])}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                      
                      {/* Preview do Banner */}
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Preview
                        </label>
                        <div 
                          className="h-20 rounded-lg p-4 flex items-center justify-between text-white relative overflow-hidden"
                          style={{ 
                            background: banner.image 
                              ? `url(${banner.image}) center/cover, ${banner.gradient}` 
                              : banner.gradient 
                          }}
                        >
                          <div className="flex items-center gap-3 relative z-10">
                            <span className="text-2xl">{banner.icon}</span>
                            <div>
                              <h4 className="font-semibold">{banner.title}</h4>
                              <p className="text-sm opacity-90">{banner.subtitle}</p>
                            </div>
                          </div>
                          {banner.buttonText && (
                            <button className="bg-white/20 px-3 py-1 rounded text-sm font-medium relative z-10">
                              {banner.buttonText}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Cores */}
          {activeTab === 'cores' && (
            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Paleta de Cores</h3>
              
              <div className="grid grid-cols-4 gap-4">
                {[
                  { key: 'app.primaryColor', label: 'Cor Primária', desc: 'Botões, links, destaques' },
                  { key: 'app.secondaryColor', label: 'Cor Secundária', desc: 'Elementos secundários' },
                  { key: 'app.accentColor', label: 'Cor de Destaque', desc: 'Badges, alertas' },
                  { key: 'app.backgroundColor', label: 'Fundo', desc: 'Cor de fundo padrão' },
                  { key: 'app.textColor', label: 'Texto', desc: 'Cor do texto principal' },
                  { key: 'app.successColor', label: 'Sucesso', desc: 'Mensagens de sucesso' },
                  { key: 'app.warningColor', label: 'Aviso', desc: 'Alertas e avisos' },
                  { key: 'app.dangerColor', label: 'Erro', desc: 'Erros e exclusões' },
                ].map(item => (
                  <div key={item.key} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {item.label}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config[item.key as keyof AppConfig] as string}
                        onChange={(e) => handleChange(item.key as keyof AppConfig, e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border-0"
                      />
                      <input
                        type="text"
                        value={config[item.key as keyof AppConfig] as string}
                        onChange={(e) => handleChange(item.key as keyof AppConfig, e.target.value)}
                        className="flex-1 px-2 py-1 text-sm border rounded"
                      />
                    </div>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab: Textos */}
          {activeTab === 'textos' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Textos de Login</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Título do Login
                    </label>
                    <input
                      type="text"
                      value={config['app.loginTitle']}
                      onChange={(e) => handleChange('app.loginTitle', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subtítulo do Login
                    </label>
                    <input
                      type="text"
                      value={config['app.loginSubtitle']}
                      onChange={(e) => handleChange('app.loginSubtitle', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Textos de Cadastro</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Título do Cadastro
                    </label>
                    <input
                      type="text"
                      value={config['app.registerTitle']}
                      onChange={(e) => handleChange('app.registerTitle', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subtítulo do Cadastro
                    </label>
                    <input
                      type="text"
                      value={config['app.registerSubtitle']}
                      onChange={(e) => handleChange('app.registerSubtitle', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Outros Textos</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mensagem de Boas-Vindas (Home)
                  </label>
                  <input
                    type="text"
                    value={config['app.homeWelcome']}
                    onChange={(e) => handleChange('app.homeWelcome', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab: Funcionalidades */}
          {activeTab === 'funcionalidades' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Funcionalidades</h3>
                
                <div className="space-y-4">
                  {[
                    { key: 'app.enablePushNotifications', label: 'Notificações Push', desc: 'Enviar notificações para o celular' },
                    { key: 'app.enableBiometricLogin', label: 'Login Biométrico', desc: 'Digital ou Face ID' },
                    { key: 'app.enableDarkMode', label: 'Modo Escuro', desc: 'Permitir tema escuro' },
                    { key: 'app.enableGuestCheckout', label: 'Comprar sem Cadastro', desc: 'Checkout como visitante' },
                  ].map(item => (
                    <label key={item.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                      <div>
                        <span className="font-medium text-gray-900">{item.label}</span>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={config[item.key as keyof AppConfig] as boolean}
                        onChange={(e) => handleChange(item.key as keyof AppConfig, e.target.checked)}
                        className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg border p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Modo Manutenção</h3>
                
                <div className="bg-green-50 border-l-4 border-green-500 p-3 mb-4">
                  <p className="text-sm text-green-800">
                    <strong>✅ Totalmente Automático!</strong>
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Basta ativar abaixo e salvar. Todo o site (exceto admin) entrará em manutenção automaticamente em até 10 segundos.
                  </p>
                </div>
                
                <label className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg cursor-pointer mb-4">
                  <div>
                    <span className="font-medium text-gray-900">Ativar Manutenção</span>
                    <p className="text-sm text-gray-500">Todo o site (exceto admin) mostrará página de manutenção</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config['app.maintenanceMode']}
                    onChange={(e) => handleChange('app.maintenanceMode', e.target.checked)}
                    className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
                  />
                </label>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mensagem de Manutenção
                  </label>
                  <textarea
                    value={config['app.maintenanceMessage']}
                    onChange={(e) => handleChange('app.maintenanceMessage', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Previsão de Retorno
                  </label>
                  <input
                    type="datetime-local"
                    value={config['app.maintenanceReturnDate']}
                    onChange={(e) => handleChange('app.maintenanceReturnDate', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">Data e hora que o site voltará do ar</p>
                </div>
              </div>

              <div className="bg-white rounded-lg border p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Suporte</h3>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      E-mail de Suporte
                    </label>
                    <input
                      type="email"
                      value={config['app.supportEmail']}
                      onChange={(e) => handleChange('app.supportEmail', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefone
                    </label>
                    <input
                      type="text"
                      value={config['app.supportPhone']}
                      onChange={(e) => handleChange('app.supportPhone', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      WhatsApp
                    </label>
                    <input
                      type="text"
                      value={config['app.supportWhatsapp']}
                      onChange={(e) => handleChange('app.supportWhatsapp', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="5511999999999"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Conexão */}
          {activeTab === 'conexao' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Server className="w-5 h-5 text-orange-500" />
                  Configuração da API
                </h3>
                <p className="text-gray-500 text-sm mb-6">
                  Configure os endpoints da API para o aplicativo móvel se conectar ao backend.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL da API (Desenvolvimento)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={config['app.apiUrlDev']}
                        onChange={(e) => handleChange('app.apiUrlDev', e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="http://localhost:3000/api"
                      />
                      <button
                        onClick={() => window.open(config['app.apiUrlDev'] + '/health', '_blank')}
                        className="px-3 py-2 border rounded-lg hover:bg-gray-50"
                        title="Testar conexão"
                      >
                        <Globe className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Usado quando o app está em modo desenvolvimento
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL da API (Produção)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={config['app.apiUrlProd']}
                        onChange={(e) => handleChange('app.apiUrlProd', e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="https://mydshop.com.br/api"
                      />
                      <button
                        onClick={() => window.open(config['app.apiUrlProd'] + '/health', '_blank')}
                        className="px-3 py-2 border rounded-lg hover:bg-gray-50"
                        title="Testar conexão"
                      >
                        <Globe className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Usado quando o app está em produção (publicado nas lojas)
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
                <h3 className="font-semibold text-blue-900 mb-2">💡 Como funciona</h3>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li>• <strong>Desenvolvimento:</strong> Quando você roda <code className="bg-blue-100 px-1 rounded">ionic serve</code>, o proxy redireciona /api para localhost:3000</li>
                  <li>• <strong>Produção:</strong> Quando o app é compilado para Android/iOS, ele usa a URL de produção diretamente</li>
                  <li>• O app detecta automaticamente qual ambiente usar baseado na build</li>
                </ul>
              </div>

              <div className="bg-white rounded-lg border p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Arquivos de Configuração</h3>
                
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-700 mb-2">📁 environment.ts (Desenvolvimento)</h4>
                    <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto">
{`export const environment = {
  production: false,
  apiUrl: '/api', // Proxy redireciona para localhost:3000
};`}
                    </pre>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-700 mb-2">📁 environment.prod.ts (Produção)</h4>
                    <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto">
{`export const environment = {
  production: true,
  apiUrl: '${config['app.apiUrlProd']}',
};`}
                    </pre>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-700 mb-2">📁 proxy.conf.json (Dev Server)</h4>
                    <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto">
{`{
  "/api": {
    "target": "${config['app.apiUrlDev']?.replace('/api', '') || 'http://localhost:3000'}",
    "secure": false,
    "changeOrigin": true
  }
}`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Preview Panel */}
        {previewMode && (
          <div className="w-80 flex-shrink-0">
            <div className="sticky top-6">
              <div className="bg-gray-900 rounded-3xl p-3 shadow-xl">
                <div className="bg-white rounded-2xl overflow-hidden" style={{ height: '600px' }}>
                  {/* Status Bar Mock */}
                  <div className="bg-gray-100 px-4 py-2 flex justify-between text-xs">
                    <span>9:41</span>
                    <span>📶 🔋</span>
                  </div>
                  
                  {/* App Preview */}
                  <div className="p-6 text-center" style={{ backgroundColor: config['app.backgroundColor'] }}>
                    {config['app.logo'] ? (
                      <img src={config['app.logo']} alt="Logo" className="max-h-16 mx-auto mb-4" />
                    ) : (
                      <h1 className="text-3xl font-bold mb-2">
                        <span style={{ color: config['app.primaryColor'] }}>
                          {config['app.name'].substring(0, Math.ceil(config['app.name'].length / 2))}
                        </span>
                        <span style={{ color: config['app.secondaryColor'] }}>
                          {config['app.name'].substring(Math.ceil(config['app.name'].length / 2))}
                        </span>
                      </h1>
                    )}
                    <p className="text-gray-500 mb-8">{config['app.loginTitle']}</p>
                    
                    <div className="space-y-3 text-left">
                      <div className="bg-gray-100 rounded-lg p-3">
                        <span className="text-gray-400 text-sm">E-mail</span>
                      </div>
                      <div className="bg-gray-100 rounded-lg p-3">
                        <span className="text-gray-400 text-sm">Senha</span>
                      </div>
                    </div>
                    
                    <button
                      className="w-full mt-6 py-3 rounded-lg text-white font-semibold"
                      style={{ backgroundColor: config['app.primaryColor'] }}
                    >
                      Entrar
                    </button>
                    
                    <p className="mt-4 text-sm text-gray-500">
                      Não tem conta?{' '}
                      <span style={{ color: config['app.primaryColor'] }}>Criar conta</span>
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-center text-sm text-gray-500 mt-3">Preview do App</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
