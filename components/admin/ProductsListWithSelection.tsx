'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import {
  FiPackage, FiEdit, FiAlertCircle, FiCheckCircle,
  FiTag, FiX, FiCheck, FiArrowRight, FiLoader,
  FiChevronDown, FiSquare, FiCheckSquare, FiMinus
} from 'react-icons/fi'
import DeleteProductButton from '@/components/admin/DeleteProductButton'
import ToggleProductActiveButton from '@/components/admin/ToggleProductActiveButton'
import ToggleDropshippingButton from '@/components/admin/ToggleDropshippingButton'
import PublishToMarketplaceButton from '@/components/admin/PublishToMarketplaceButton'

// ─── tipos ───────────────────────────────────────────────────────────────────
interface Category {
  id: string
  name: string
  parentId: string | null
  children?: Category[]
}

interface Product {
  id: string
  name: string
  images: any
  description: string | null
  price: number
  comparePrice: number | null
  stock: number
  featured: boolean
  active: boolean
  isDropshipping: boolean
  dropshippingCommission: number | null
  supplierSku: string | null
  gtin: string | null
  brand: string | null
  specifications: string | null
  technicalSpecs: string | null
  variants: string | null
  category: { id: string; name: string }
  supplier: { name: string } | null
  marketplaceListings: { marketplace: string; status: string }[]
}

interface Props {
  products: Product[]
  categories: Category[]
}

// ─── utilidades ──────────────────────────────────────────────────────────────
function calcularQualidade(product: Product, imagens: string[]) {
  const criterios = [
    { label: 'Tem imagem',         ok: imagens.length > 0,                                        pts: 15 },
    { label: '3+ imagens',         ok: imagens.length >= 3,                                       pts: 15 },
    { label: 'Descrição',          ok: !!product.description && product.description.length > 30,  pts: 10 },
    { label: 'Descrição completa', ok: !!product.description && product.description.length > 200, pts: 15 },
    { label: 'Preço original',     ok: !!product.comparePrice,                                    pts: 10 },
    { label: 'GTIN (código EAN)',  ok: !!product.gtin,                                            pts: 10 },
    { label: 'Especificações',     ok: !!product.specifications || !!product.technicalSpecs,      pts: 10 },
    { label: 'Variações',          ok: !!product.variants,                                        pts: 10 },
    { label: 'Marca',              ok: !!product.brand,                                           pts:  5 },
  ]
  const score = criterios.filter(c => c.ok).reduce((s, c) => s + c.pts, 0)
  const pendentes = criterios.filter(c => !c.ok).map(c => c.label)
  return { score, pendentes }
}

function parseImages(images: any): string[] {
  try {
    if (typeof images === 'string' && images.trim()) return JSON.parse(images)
    if (Array.isArray(images)) return images
  } catch {
    if (typeof images === 'string' && images.startsWith('http')) return [images]
  }
  return []
}

function buildCategoryTree(cats: Category[]): Category[] {
  const map = new Map<string, Category>()
  const roots: Category[] = []
  cats.forEach(c => map.set(c.id, { ...c, children: [] }))
  cats.forEach(c => {
    const node = map.get(c.id)!
    if (c.parentId && map.has(c.parentId)) map.get(c.parentId)!.children!.push(node)
    else roots.push(node)
  })
  return roots
}

function renderOptions(cats: Category[], level = 0): JSX.Element[] {
  const opts: JSX.Element[] = []
  cats.forEach(cat => {
    opts.push(<option key={cat.id} value={cat.id}>{'—'.repeat(level)} {cat.name}</option>)
    if (cat.children?.length) opts.push(...renderOptions(cat.children, level + 1))
  })
  return opts
}

// ─── componente principal ─────────────────────────────────────────────────────
export default function ProductsListWithSelection({ products, categories }: Props) {
  const [selected, setSelected]     = useState<Set<string>>(new Set())
  const [targetCatId, setTargetCatId] = useState('')
  const [processing, setProcessing] = useState(false)
  const [result, setResult]         = useState<{ success: boolean; message: string } | null>(null)
  const [confirm, setConfirm]       = useState(false)
  const [barOpen, setBarOpen]       = useState(false) // mostrar selector de categoria na barra

  const allIds = products.map(p => p.id)
  const allSelected  = selected.size === allIds.length && allIds.length > 0
  const someSelected = selected.size > 0 && !allSelected

  const toggle = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const toggleAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(allIds))
  }

  const clearSelection = () => {
    setSelected(new Set())
    setConfirm(false)
    setResult(null)
    setTargetCatId('')
    setBarOpen(false)
  }

  const handleMover = async () => {
    if (!targetCatId) return
    if (!confirm) { setConfirm(true); return }

    setProcessing(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/products/bulk-category-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: Array.from(selected), targetCategoryId: targetCatId }),
      })
      const data = await res.json()
      setResult({ success: res.ok, message: data.message || data.error })
      setConfirm(false)
      if (res.ok) setTimeout(() => window.location.reload(), 1800)
    } catch (e: any) {
      setResult({ success: false, message: e.message })
    } finally {
      setProcessing(false)
    }
  }

  const categoryTree = buildCategoryTree(categories)
  const targetCatName = categories.find(c => c.id === targetCatId)?.name

  return (
    <div className="relative">
      {/* ── barra de seleção (fixa no topo da lista) ─────────────────────── */}
      <div className={`sticky top-0 z-30 bg-white border border-gray-200 rounded-xl mb-2 shadow-sm transition-all overflow-hidden ${
        selected.size > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none h-0 border-0'
      }`}>
        <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
          {/* info seleção */}
          <div className="flex items-center gap-2">
            <button
              onClick={clearSelection}
              className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
              title="Limpar seleção"
            >
              <FiX size={16} />
            </button>
            <span className="font-semibold text-sm text-gray-800">
              {selected.size} produto{selected.size !== 1 ? 's' : ''} selecionado{selected.size !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="h-5 w-px bg-gray-200" />

          {/* ação: mover categoria */}
          {!barOpen ? (
            <button
              onClick={() => setBarOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-indigo-700"
            >
              <FiTag size={14} />
              Mover para categoria
              <FiChevronDown size={14} />
            </button>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={targetCatId}
                onChange={e => { setTargetCatId(e.target.value); setConfirm(false); setResult(null) }}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[200px]"
              >
                <option value="">Selecione a categoria</option>
                {renderOptions(categoryTree)}
              </select>

              {/* resultado */}
              {result && (
                <span className={`flex items-center gap-1 text-sm px-3 py-1 rounded-lg ${
                  result.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {result.success ? <FiCheck size={14} /> : <FiAlertCircle size={14} />}
                  {result.message}
                </span>
              )}

              {/* confirmação */}
              {confirm && !result && (
                <span className="text-sm text-amber-700 bg-amber-50 border border-amber-300 px-3 py-1 rounded-lg">
                  ⚠️ Mover {selected.size} produto(s) para &quot;{targetCatName}&quot;?
                </span>
              )}

              <button
                onClick={handleMover}
                disabled={!targetCatId || processing}
                className={`flex items-center gap-2 text-sm px-4 py-1.5 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                  confirm ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {processing ? (
                  <><FiLoader className="animate-spin" size={14} /> Movendo...</>
                ) : confirm ? (
                  <><FiCheck size={14} /> Confirmar</>
                ) : (
                  <><FiArrowRight size={14} /> Mover</>
                )}
              </button>

              <button
                onClick={() => { setBarOpen(false); setConfirm(false); setResult(null); setTargetCatId('') }}
                className="p-1.5 hover:bg-gray-100 rounded text-gray-400"
              >
                <FiX size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── cabeçalho da lista com "selecionar tudo" ───────────────────────── */}
      {products.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 mb-1">
          <button
            onClick={toggleAll}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 select-none"
          >
            {allSelected
              ? <FiCheckSquare size={18} className="text-indigo-600" />
              : someSelected
              ? <FiMinus size={18} className="text-indigo-400" />
              : <FiSquare size={18} />
            }
            <span>{allSelected ? 'Desmarcar todos' : 'Selecionar todos'}</span>
          </button>
          <span className="text-xs text-gray-400">({products.length} produtos)</span>
        </div>
      )}

      {/* ── lista de produtos ─────────────────────────────────────────────── */}
      <div className="space-y-2">
        {products.map(product => {
          const imagens      = parseImages(product.images)
          const primeiraImg  = imagens[0] ?? null
          const isSelected   = selected.has(product.id)
          const { score, pendentes } = calcularQualidade(product, imagens)
          const scoreColor   = score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-500' : 'text-red-500'
          const scoreBg      = score >= 80 ? 'bg-green-50 border-green-200' : score >= 50 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
          const scoreLabel   = score >= 80 ? 'Boa' : score >= 50 ? 'Regular' : 'Básica'
          const circumference = 2 * Math.PI * 16
          const dashOffset    = circumference - (score / 100) * circumference

          return (
            <div
              key={product.id}
              className={`bg-white rounded-lg border transition-all ${
                isSelected
                  ? 'border-indigo-400 shadow-md ring-2 ring-indigo-100'
                  : 'border-gray-200 hover:shadow-md'
              }`}
            >
              <div className="flex items-stretch divide-x divide-gray-100">

                {/* Checkbox */}
                <div
                  className="flex items-center justify-center px-3 cursor-pointer flex-shrink-0"
                  onClick={() => toggle(product.id)}
                >
                  {isSelected
                    ? <FiCheckSquare size={20} className="text-indigo-600" />
                    : <FiSquare size={20} className="text-gray-300 hover:text-indigo-400 transition-colors" />
                  }
                </div>

                {/* Imagem */}
                <div className="flex items-center p-4 flex-shrink-0">
                  <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                    {primeiraImg
                      ? <img src={primeiraImg} alt={product.name} className="w-full h-full object-cover" />
                      : <FiPackage className="text-gray-300 w-8 h-8" />
                    }
                  </div>
                </div>

                {/* Nome / info */}
                <div className="flex flex-col justify-center px-4 py-3 flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{product.name}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    #{product.id.slice(0, 10)}{product.supplierSku ? ` | SKU ${product.supplierSku.slice(0, 20)}` : ''}
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      product.stock === 0 ? 'bg-red-100 text-red-700'
                      : product.stock <= 10 ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                    }`}>{product.stock} unidades</span>
                    {product.featured && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Destaque</span>}
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{product.category.name}</span>
                  </div>
                </div>

                {/* Preço */}
                <div className="flex flex-col justify-center px-4 py-3 w-40 flex-shrink-0">
                  <p className="text-lg font-bold text-gray-900">R$ {product.price.toFixed(2)}</p>
                  {product.comparePrice && <p className="text-xs text-gray-400 line-through">R$ {product.comparePrice.toFixed(2)}</p>}
                  <Link href={`/admin/produtos/${product.id}`} className="text-xs text-blue-600 hover:underline mt-1">
                    Alterar preço
                  </Link>
                </div>

                {/* Fornecedor + Drop */}
                <div className="flex flex-col justify-center px-4 py-3 w-36 flex-shrink-0 hidden md:flex">
                  <p className="text-xs text-gray-500 mb-1">Fornecedor</p>
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {product.supplier?.name ?? <span className="text-gray-400 font-normal">—</span>}
                  </p>
                  <div className="mt-2">
                    <ToggleDropshippingButton
                      productId={product.id}
                      isDropshipping={product.isDropshipping}
                      commission={product.dropshippingCommission}
                    />
                  </div>
                </div>

                {/* Marketplaces */}
                <div className="flex flex-col justify-center px-4 py-3 w-36 flex-shrink-0 hidden lg:flex">
                  <p className="text-xs text-gray-500 mb-1">Marketplaces</p>
                  {product.marketplaceListings.length === 0
                    ? <span className="text-xs text-gray-400">Não publicado</span>
                    : (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {product.marketplaceListings.map(l => (
                          <span key={l.marketplace} className={`text-xs px-2 py-0.5 rounded-full ${
                            l.status === 'active' ? 'bg-green-100 text-green-800'
                            : l.status === 'paused' ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-600'
                          }`}>
                            {l.marketplace === 'mercadolivre' ? 'ML'
                             : l.marketplace === 'shopee' ? 'Shopee'
                             : l.marketplace === 'amazon' ? 'Amazon'
                             : l.marketplace}
                          </span>
                        ))}
                      </div>
                    )
                  }
                  <div className="mt-2">
                    <PublishToMarketplaceButton
                      productId={product.id}
                      productName={product.name}
                      productGtin={product.gtin || ''}
                      existingListings={product.marketplaceListings}
                    />
                  </div>
                </div>

                {/* Qualidade */}
                <div className={`flex flex-col items-center justify-center px-4 py-3 w-36 flex-shrink-0 hidden lg:flex ${scoreBg}`}>
                  <p className="text-xs text-gray-500 mb-1 font-medium">Qualidade</p>
                  <div className="relative w-12 h-12">
                    <svg className="w-12 h-12 -rotate-90" viewBox="0 0 40 40">
                      <circle cx="20" cy="20" r="16" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                      <circle
                        cx="20" cy="20" r="16" fill="none"
                        stroke={score >= 80 ? '#16a34a' : score >= 50 ? '#eab308' : '#dc2626'}
                        strokeWidth="4"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${scoreColor}`}>{score}</span>
                  </div>
                  <span className={`text-xs font-semibold mt-1 ${scoreColor}`}>{scoreLabel}</span>
                  {pendentes.length > 0 ? (
                    <div className="mt-2 w-full">
                      {pendentes.slice(0, 2).map(p => (
                        <div key={p} className="flex items-center gap-1 text-xs text-gray-500 leading-tight">
                          <FiAlertCircle size={10} className="text-red-400 flex-shrink-0" />
                          <span className="truncate">{p}</span>
                        </div>
                      ))}
                      {pendentes.length > 2 && <p className="text-xs text-gray-400 mt-0.5">+{pendentes.length - 2} itens</p>}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                      <FiCheckCircle size={12} /><span>Completo!</span>
                    </div>
                  )}
                </div>

                {/* Status + Ações */}
                <div className="flex flex-col items-center justify-center px-4 py-3 gap-2 flex-shrink-0">
                  <ToggleProductActiveButton productId={product.id} currentStatus={product.active} />
                  <div className="flex items-center gap-1">
                    <Link href={`/admin/produtos/${product.id}`} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md" title="Editar">
                      <FiEdit size={16} />
                    </Link>
                    <DeleteProductButton productId={product.id} />
                  </div>
                </div>

              </div>
            </div>
          )
        })}

        {products.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 text-center py-12">
            <FiPackage size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">Nenhum produto encontrado</p>
            <Link href="/admin/produtos/novo" className="text-primary-600 hover:text-primary-700 font-semibold">
              Criar primeiro produto →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
