'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiArrowLeft } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface Category {
  id: string
  name: string
}

interface Supplier {
  id: string
  name: string
  commission: number
}

interface NovoProductFormProps {
  categories: Category[]
  suppliers: Supplier[]
}

export default function NovoProductForm({ categories, suppliers }: NovoProductFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    comparePrice: '',
    costPrice: '',
    shippingCost: '',
    taxCost: '',
    categoryId: '',
    supplierId: '',
    supplierSku: '',
    supplierUrl: '',
    images: '',
    stock: '',
    featured: false,
    productType: '', // Tipo de produto
    mlCategoryId: '', // Categoria do Mercado Livre
    gtin: '',
    brand: '',
    model: '',
    color: '',
    mpn: '',
    // Campos para Mercado Livre (Celulares)
    ram: '',
    storage: '',
    anatelNumber: '',
    isDualSim: 'Não',
    carrier: 'Desbloqueado',
  })

  const calculateTotalCost = () => {
    const cost = parseFloat(formData.costPrice) || 0
    const shipping = parseFloat(formData.shippingCost) || 0
    const tax = parseFloat(formData.taxCost) || 0
    return (cost + shipping + tax).toFixed(2)
  }

  const calculateMargin = () => {
    const totalCost = parseFloat(calculateTotalCost())
    const price = parseFloat(formData.price) || 0
    if (totalCost && price) {
      const margin = ((price - totalCost) / price) * 100
      return margin.toFixed(2)
    }
    return '0'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-')
    const imageArray = formData.images.split('\n').filter((img) => img.trim())

    const cost = parseFloat(formData.costPrice) || 0
    const shipping = parseFloat(formData.shippingCost) || 0
    const tax = parseFloat(formData.taxCost) || 0
    const totalCost = cost + shipping + tax
    const price = parseFloat(formData.price) || 0
    const margin = totalCost && price ? ((price - totalCost) / price) * 100 : 0

    // Monta especificações técnicas
    const technicalSpecs: any = {}
    if (formData.productType) technicalSpecs.product_type = formData.productType
    if (formData.mlCategoryId) technicalSpecs.ml_category_id = formData.mlCategoryId
    if (formData.ram) technicalSpecs.memória_ram = formData.ram
    if (formData.storage) technicalSpecs.armazenamento = formData.storage
    if (formData.anatelNumber) technicalSpecs.anatel = formData.anatelNumber
    if (formData.isDualSim) technicalSpecs.dual_sim = formData.isDualSim
    if (formData.carrier) technicalSpecs.operadora = formData.carrier

    try {
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          slug,
          description: formData.description,
          price: parseFloat(formData.price),
          comparePrice: formData.comparePrice ? parseFloat(formData.comparePrice) : null,
          costPrice: cost || null,
          shippingCost: shipping || null,
          taxCost: tax || null,
          totalCost: totalCost || null,
          margin: margin || null,
          categoryId: formData.categoryId,
          supplierId: formData.supplierId || null,
          supplierSku: formData.supplierSku || null,
          supplierUrl: formData.supplierUrl || null,
          images: imageArray,
          stock: parseInt(formData.stock),
          featured: formData.featured,
          gtin: formData.gtin || null,
          brand: formData.brand || null,
          model: formData.model || null,
          color: formData.color || null,
          mpn: formData.mpn || null,
          technicalSpecs: Object.keys(technicalSpecs).length > 0 ? JSON.stringify(technicalSpecs) : null,
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao criar produto')
      }

      toast.success('Produto criado com sucesso!')
      router.push('/admin/produtos')
    } catch (error) {
      toast.error('Erro ao criar produto')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <Link
        href="/admin/fornecedores"
        className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6"
      >
        <FiArrowLeft className="mr-2" />
        Voltar
      </Link>

      <h1 className="text-3xl font-bold mb-8">Novo Produto</h1>

      <form onSubmit={handleSubmit} className="max-w-4xl bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Nome do Produto *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
              placeholder="Ex: Camiseta Premium"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Slug</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
              placeholder="camiseta-premium"
            />
            <p className="text-xs text-gray-500 mt-1">Deixe em branco para gerar automaticamente</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Categoria *</label>
            <select
              required
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
            >
              <option value="">Selecione uma categoria</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Descrição</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
            rows={4}
            placeholder="Descrição detalhada do produto..."
          />
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold text-lg mb-4">💰 Preços e Custos</h3>
          
          <div className="grid md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Custo do Produto (R$)</label>
              <input
                type="number"
                step="0.01"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">Preço base do fornecedor</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Frete (R$)</label>
              <input
                type="number"
                step="0.01"
                value={formData.shippingCost}
                onChange={(e) => setFormData({ ...formData, shippingCost: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">Custo do frete</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Impostos (R$)</label>
              <input
                type="number"
                step="0.01"
                value={formData.taxCost}
                onChange={(e) => setFormData({ ...formData, taxCost: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">Taxas/impostos</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Custo Total</label>
              <div className="px-4 py-2 bg-orange-50 border border-orange-200 rounded-md font-bold text-orange-700">
                R$ {calculateTotalCost()}
              </div>
              <p className="text-xs text-gray-500 mt-1">Produto + Frete + Impostos</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Preço de Venda (R$) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">Quanto vende ao cliente</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Margem de Lucro</label>
              <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-md font-bold text-green-700 text-lg">
                {calculateMargin()}%
              </div>
              <p className="text-xs text-gray-500 mt-1">Calculada automaticamente</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Preço Comparação (R$)</label>
              <input
                type="number"
                step="0.01"
                value={formData.comparePrice}
                onChange={(e) => setFormData({ ...formData, comparePrice: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">Preço "De:" para promoção</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Estoque *</label>
              <input
                type="number"
                required
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold text-lg mb-4">📦 Informações de Dropshipping</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Fornecedor</label>
              <select
                value={formData.supplierId}
                onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
              >
                <option value="">Nenhum (produto próprio)</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name} - Comissão: {supplier.commission}%
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">SKU do Fornecedor</label>
              <input
                type="text"
                value={formData.supplierSku}
                onChange={(e) => setFormData({ ...formData, supplierSku: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="SKU-12345"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">URL do Produto no Fornecedor</label>
              <input
                type="url"
                value={formData.supplierUrl}
                onChange={(e) => setFormData({ ...formData, supplierUrl: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="https://fornecedor.com/produto"
              />
            </div>
          </div>
        </div>

        {/* Tipo de Produto */}
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-2">🏷️ Tipo de Produto</h3>
          <p className="text-sm text-gray-600 mb-4">Selecione o tipo para mostrar campos específicos</p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Tipo de Produto</label>
              <select
                value={formData.productType}
                onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600 bg-white"
              >
                <option value="">Selecione o tipo de produto...</option>
                <option value="celular">📱 Celular / Smartphone</option>
                <option value="notebook">💻 Notebook / Laptop</option>
                <option value="tablet">📲 Tablet</option>
                <option value="relogio">⌚ Relógio / Smartwatch</option>
                <option value="fone">🎧 Fone de Ouvido / Headset</option>
                <option value="camera">📷 Câmera</option>
                <option value="outro">📦 Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Categoria Mercado Livre (Opcional)</label>
              <input
                type="text"
                value={formData.mlCategoryId}
                onChange={(e) => setFormData({ ...formData, mlCategoryId: e.target.value })}
                className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="Ex: MLB1055, MLB263532..."
              />
              <p className="text-xs text-gray-500 mt-1">Se souber a categoria exata do ML, informe aqui</p>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold text-lg mb-4">🏷️ Especificações Técnicas (Marketplaces)</h3>
          <p className="text-sm text-gray-600 mb-4">
            Campos opcionais para integração com Mercado Livre, Shopee e Amazon
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">GTIN / EAN / Código de Barras</label>
              <input
                type="text"
                value={formData.gtin}
                onChange={(e) => setFormData({ ...formData, gtin: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="7891234567890"
              />
              <p className="text-xs text-gray-500 mt-1">13 dígitos - Obrigatório no ML para eletrônicos</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Marca</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="Samsung, Apple, Nike..."
              />
              <p className="text-xs text-gray-500 mt-1">Nome da marca do fabricante</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Modelo</label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="Galaxy S23, Air Max 97..."
              />
              <p className="text-xs text-gray-500 mt-1">Modelo específico do produto</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Cor</label>
              <input
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="Preto, Azul, Vermelho..."
              />
              <p className="text-xs text-gray-500 mt-1">Cor principal do produto</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">MPN (Manufacturer Part Number)</label>
              <input
                type="text"
                value={formData.mpn}
                onChange={(e) => setFormData({ ...formData, mpn: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="SM-S911BZKQZTO"
              />
              <p className="text-xs text-gray-500 mt-1">Código do fabricante (opcional)</p>
            </div>
          </div>
        </div>

        {/* Campos específicos para Celulares - Mercado Livre */}
        {formData.productType === 'celular' && (
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">📱 Campos Específicos - Celulares</h3>
          <p className="text-sm text-gray-600 mb-4">Campos obrigatórios para publicação de celulares no Mercado Livre</p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Memória RAM</label>
              <input
                type="text"
                value={formData.ram}
                onChange={(e) => setFormData({ ...formData, ram: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="8GB, 12GB, 16GB..."
              />
              <p className="text-xs text-gray-500 mt-1">Memória RAM do dispositivo</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Armazenamento</label>
              <input
                type="text"
                value={formData.storage}
                onChange={(e) => setFormData({ ...formData, storage: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="128GB, 256GB, 512GB..."
              />
              <p className="text-xs text-gray-500 mt-1">Capacidade de armazenamento interno</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Número ANATEL</label>
              <input
                type="text"
                value={formData.anatelNumber}
                onChange={(e) => setFormData({ ...formData, anatelNumber: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                placeholder="12345-67-8901"
              />
              <p className="text-xs text-gray-500 mt-1">Número de homologação da ANATEL (obrigatório para celulares)</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Dual SIM / Dual Chip</label>
              <select
                value={formData.isDualSim}
                onChange={(e) => setFormData({ ...formData, isDualSim: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
              >
                <option value="Não">Não</option>
                <option value="Sim">Sim</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Suporta dois chips?</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Operadora</label>
              <select
                value={formData.carrier}
                onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
              >
                <option value="Desbloqueado">Desbloqueado</option>
                <option value="Vivo">Vivo</option>
                <option value="Claro">Claro</option>
                <option value="TIM">TIM</option>
                <option value="Oi">Oi</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Operadora vinculada (se houver)</p>
            </div>
          </div>
        </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2">URLs das Imagens *</label>
          <textarea
            required
            value={formData.images}
            onChange={(e) => setFormData({ ...formData, images: e.target.value })}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
            rows={4}
            placeholder="Cole as URLs das imagens, uma por linha&#10;https://exemplo.com/imagem1.jpg&#10;https://exemplo.com/imagem2.jpg"
          />
          <p className="text-xs text-gray-500 mt-1">
            Uma URL por linha. Primeira imagem será a principal.
          </p>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="featured"
            checked={formData.featured}
            onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <label htmlFor="featured" className="ml-2 text-sm font-medium">
            Produto em destaque na página inicial
          </label>
        </div>

        <div className="flex space-x-4 pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-primary-600 text-white py-3 rounded-md hover:bg-primary-700 font-semibold disabled:bg-gray-400"
          >
            {isLoading ? 'Criando...' : 'Criar Produto'}
          </button>
          <Link
            href="/admin/produtos"
            className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-md hover:bg-gray-50 text-center font-semibold"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
