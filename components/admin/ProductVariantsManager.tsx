'use client'

import { useState, useEffect } from 'react'
import { FiPlus, FiX, FiCheck } from 'react-icons/fi'

interface Variant {
  size: string
  color: string
  colorHex: string
  stock: number
  price?: number
  imageIndex?: number  // Índice da imagem do produto que representa esta cor
}

interface ProductVariantsManagerProps {
  sizeType: string
  sizeCategory: string
  colorType: 'Única' | 'Variada'
  singleColor?: string
  variants: Variant[]
  onVariantsChange: (variants: Variant[]) => void
  onSizeTypeChange: (type: string) => void
  onSizeCategoryChange: (category: string) => void
  onTotalStockChange: (total: number) => void
  basePrice?: number
  productImages?: string[]  // Lista de imagens do produto
}

const PRESET_COLORS = [
  { name: 'Preto', hex: '#000000' },
  { name: 'Branco', hex: '#FFFFFF' },
  { name: 'Cinza', hex: '#6B7280' },
  { name: 'Vermelho', hex: '#EF4444' },
  { name: 'Rosa', hex: '#EC4899' },
  { name: 'Laranja', hex: '#F97316' },
  { name: 'Amarelo', hex: '#EAB308' },
  { name: 'Verde', hex: '#22C55E' },
  { name: 'Azul', hex: '#3B82F6' },
  { name: 'Roxo', hex: '#A855F7' },
  { name: 'Marrom', hex: '#92400E' },
  { name: 'Bege', hex: '#D4B896' },
]

const QUICK_SIZES = {
  clothing: ['PP', 'P', 'M', 'G', 'GG', 'XGG'],
  clothing_numbers: ['2', '4', '6', '8', '10', '12', '14', '16'],
  footwear_adult: ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'],
  footwear_children: ['20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34'],
}

export default function ProductVariantsManager({
  sizeType,
  sizeCategory,
  colorType,
  singleColor,
  variants,
  onVariantsChange,
  onSizeTypeChange,
  onSizeCategoryChange,
  onTotalStockChange,
  basePrice,
  productImages = []
}: ProductVariantsManagerProps) {
  const [customSize, setCustomSize] = useState('')
  const [customColor, setCustomColor] = useState('')
  const [customHex, setCustomHex] = useState('#000000')
  const [customImageIndex, setCustomImageIndex] = useState<number>(0)
  const [showCustomColor, setShowCustomColor] = useState(false)
  const [showImageSelector, setShowImageSelector] = useState(false)
  const [selectedColorForImage, setSelectedColorForImage] = useState<{name: string, hex: string} | null>(null)
  const [tempImageIndex, setTempImageIndex] = useState<number>(0)

  // Lista de tamanhos únicos
  const uniqueSizes = Array.from(new Set(variants.map(v => v.size))).filter(s => s)
  
  // Lista de cores únicas
  const uniqueColors = Array.from(new Set(variants.map(v => v.color))).filter(c => c)

  const updateVariants = (newVariants: Variant[]) => {
    onVariantsChange(newVariants)
    // Calcula e atualiza o estoque total apenas quando as variantes mudam
    const total = newVariants.reduce((sum, v) => sum + (v.stock || 0), 0)
    onTotalStockChange(total)
  }

  // Adiciona um tamanho (cria variações para todas as cores se colorType = Variada)
  const addSize = (size: string) => {
    if (!size.trim()) return
    if (uniqueSizes.includes(size)) return

    const newVariants = [...variants]

    if (colorType === 'Única') {
      // Cor única: adiciona apenas uma variação
      newVariants.push({
        size: size.trim(),
        color: singleColor || 'Padrão',
        colorHex: '#808080',
        stock: 0
      })
    } else {
      // Cores variadas: adiciona uma variação para cada cor existente
      if (uniqueColors.length === 0) {
        // Se não tem cores ainda, adiciona uma variação vazia
        newVariants.push({
          size: size.trim(),
          color: '',
          colorHex: '',
          stock: 0
        })
      } else {
        // Cria combinação tamanho x cada cor
        uniqueColors.forEach(color => {
          const existingColor = variants.find(v => v.color === color)
          newVariants.push({
            size: size.trim(),
            color: color,
            colorHex: existingColor?.colorHex || '#808080',
            stock: 0
          })
        })
      }
    }

    updateVariants(newVariants)
  }

  // Adiciona uma cor (cria variações para todos os tamanhos)
  const addColor = (colorName: string, colorHex: string, imageIndex?: number) => {
    if (!colorName.trim()) return
    if (uniqueColors.includes(colorName)) return

    const newVariants = [...variants]

    if (uniqueSizes.length === 0) {
      // Se não tem tamanhos ainda, adiciona uma variação vazia
      newVariants.push({
        size: '',
        color: colorName.trim(),
        colorHex: colorHex,
        stock: 0,
        imageIndex: imageIndex
      })
    } else {
      // Cria combinação cor x cada tamanho
      uniqueSizes.forEach(size => {
        newVariants.push({
          size: size,
          color: colorName.trim(),
          colorHex: colorHex,
          stock: 0,
          imageIndex: imageIndex
        })
      })
    }

    updateVariants(newVariants)
  }

  const removeSize = (size: string) => {
    const newVariants = variants.filter(v => v.size !== size)
    updateVariants(newVariants)
  }

  const removeColor = (color: string) => {
    const newVariants = variants.filter(v => v.color !== color)
    updateVariants(newVariants)
  }

  const updateColorImage = (color: string, imageIndex: number) => {
    const newVariants = variants.map(v => 
      v.color === color ? { ...v, imageIndex } : v
    )
    updateVariants(newVariants)
  }

  const updateVariantStock = (size: string, color: string, stock: number) => {
    const newVariants = variants.map(v => 
      v.size === size && v.color === color ? { ...v, stock } : v
    )
    updateVariants(newVariants)
  }

  const updateVariantPrice = (size: string, color: string, price: number | undefined) => {
    const newVariants = variants.map(v =>
      v.size === size && v.color === color ? { ...v, price } : v
    )
    updateVariants(newVariants)
  }

  return (
    <div className="border rounded-lg p-6 bg-white space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-2">📏 Tamanhos e Variações</h3>
        <p className="text-sm text-gray-600">
          {colorType === 'Única' 
            ? 'Adicione os tamanhos disponíveis (estoque por tamanho)'
            : 'Adicione tamanhos e cores (estoque por combinação tamanho × cor)'}
        </p>
      </div>

      {/* Configuração de Tipo e Categoria */}
      <div className="grid md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-md">
        <div>
          <label className="block text-sm font-medium mb-2">Tipo de Tamanho</label>
          <select
            value={sizeType}
            onChange={(e) => onSizeTypeChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
          >
            <option value="">Não se aplica</option>
            <option value="clothing">Roupas (PP, P, M, G...)</option>
            <option value="clothing_numbers">Roupas Numeradas (2, 4, 6...)</option>
            <option value="footwear_adult">Calçados Adulto (35-46)</option>
            <option value="footwear_children">Calçados Infantil (20-34)</option>
            <option value="unique">Tamanho Único</option>
            <option value="custom">Personalizado</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Estoque Total</label>
          <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-md font-bold text-blue-700 text-lg">
            {variants.reduce((sum, v) => sum + (v.stock || 0), 0)} unidades
          </div>
        </div>
      </div>

      {/* Adicionar Tamanhos */}
      {sizeType && sizeType !== 'unique' && (
        <div>
          <label className="block text-sm font-medium mb-3">Tamanhos Rápidos - Clique para adicionar</label>
          
          {/* Roupas PP-XGG */}
          {sizeType === 'clothing' && (
            <div className="flex flex-wrap gap-2 mb-4">
              {QUICK_SIZES.clothing.map(size => (
                <button
                  key={size}
                  type="button"
                  onClick={() => addSize(size)}
                  disabled={uniqueSizes.includes(size)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    uniqueSizes.includes(size)
                      ? 'bg-green-500 text-white cursor-not-allowed'
                      : 'bg-primary-600 text-white hover:bg-primary-700 active:scale-95'
                  }`}
                >
                  {size} {uniqueSizes.includes(size) && '✓'}
                </button>
              ))}
            </div>
          )}

          {/* Roupas numeradas */}
          {sizeType === 'clothing_numbers' && (
            <div className="flex flex-wrap gap-2 mb-4">
              {QUICK_SIZES.clothing_numbers.map(size => (
                <button
                  key={size}
                  type="button"
                  onClick={() => addSize(size)}
                  disabled={uniqueSizes.includes(size)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    uniqueSizes.includes(size)
                      ? 'bg-green-500 text-white cursor-not-allowed'
                      : 'bg-primary-600 text-white hover:bg-primary-700 active:scale-95'
                  }`}
                >
                  {size} {uniqueSizes.includes(size) && '✓'}
                </button>
              ))}
            </div>
          )}

          {/* Calçados adulto */}
          {sizeType === 'footwear_adult' && (
            <div className="flex flex-wrap gap-2 mb-4">
              {QUICK_SIZES.footwear_adult.map(size => (
                <button
                  key={size}
                  type="button"
                  onClick={() => addSize(size)}
                  disabled={uniqueSizes.includes(size)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    uniqueSizes.includes(size)
                      ? 'bg-green-500 text-white cursor-not-allowed'
                      : 'bg-primary-600 text-white hover:bg-primary-700 active:scale-95'
                  }`}
                >
                  {size} {uniqueSizes.includes(size) && '✓'}
                </button>
              ))}
            </div>
          )}

          {/* Calçados infantil */}
          {sizeType === 'footwear_children' && (
            <div className="flex flex-wrap gap-2 mb-4">
              {QUICK_SIZES.footwear_children.map(size => (
                <button
                  key={size}
                  type="button"
                  onClick={() => addSize(size)}
                  disabled={uniqueSizes.includes(size)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    uniqueSizes.includes(size)
                      ? 'bg-green-500 text-white cursor-not-allowed'
                      : 'bg-primary-600 text-white hover:bg-primary-700 active:scale-95'
                  }`}
                >
                  {size} {uniqueSizes.includes(size) && '✓'}
                </button>
              ))}
            </div>
          )}

          {/* Tamanho personalizado */}
          <div>
            <label className="block text-sm font-medium mb-2">Ou adicione um tamanho personalizado:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customSize}
                onChange={(e) => setCustomSize(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSize(customSize), setCustomSize(''))}
                placeholder="Ex: 50, XL, 120cm..."
                className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
              <button
                type="button"
                onClick={() => { addSize(customSize); setCustomSize('') }}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                <FiPlus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adicionar Cores (apenas se colorType = Variada) */}
      {colorType === 'Variada' && (
        <div className="space-y-4">
          {/* Lista de Cores Cadastradas */}
          {uniqueColors.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">Cores Cadastradas</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                {uniqueColors.map(colorName => {
                  const variant = variants.find(v => v.color === colorName)
                  const imageIndex = variant?.imageIndex
                  return (
                    <div key={colorName} className="flex items-center gap-2 p-3 border-2 border-gray-200 rounded-lg bg-gray-50">
                      <div
                        className="w-8 h-8 rounded-full border-2 border-gray-300 flex-shrink-0"
                        style={{ backgroundColor: variant?.colorHex || '#808080' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{colorName}</p>
                        {imageIndex !== undefined && productImages[imageIndex] && (
                          <p className="text-xs text-gray-500">Imagem {imageIndex + 1}</p>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {productImages.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedColorForImage({name: colorName, hex: variant?.colorHex || '#808080'})
                              setTempImageIndex(imageIndex || 0)
                              setShowImageSelector(true)
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="Alterar imagem"
                          >
                            🖼️
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Remover a cor ${colorName}? Isso excluirá todas as variações desta cor.`)) {
                              removeColor(colorName)
                            }
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          title="Remover cor"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <label className="block text-sm font-medium mb-2">Adicionar Nova Cor</label>
          
          {/* Cores pré-definidas */}
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2 mb-3">
            {PRESET_COLORS.map(preset => {
              const isAdded = uniqueColors.includes(preset.name)
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    if (!isAdded) {
                      if (productImages.length > 0) {
                        // Se tem imagens, abre seletor
                        setSelectedColorForImage({name: preset.name, hex: preset.hex})
                        setTempImageIndex(0)
                        setShowImageSelector(true)
                      } else {
                        // Se não tem imagens, adiciona direto
                        addColor(preset.name, preset.hex)
                      }
                    }
                  }}
                  disabled={isAdded}
                  className={`relative flex flex-col items-center p-2 rounded-md border-2 transition-all ${
                    isAdded
                      ? 'border-green-500 bg-green-50 cursor-not-allowed'
                      : 'border-gray-200 hover:border-primary-400 hover:bg-gray-50'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full mb-1 border-2 border-gray-300"
                    style={{
                      backgroundColor: preset.hex,
                      boxShadow: preset.hex === '#FFFFFF' ? 'inset 0 0 0 1px rgba(0,0,0,0.1)' : 'none'
                    }}
                  />
                  <span className="text-xs text-center">{preset.name}</span>
                  {isAdded && <FiCheck className="absolute top-1 right-1 text-green-600 w-4 h-4" />}
                </button>
              )
            })}
          </div>

          {/* Cor personalizada */}
          <button
            type="button"
            onClick={() => setShowCustomColor(!showCustomColor)}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium mb-2"
          >
            {showCustomColor ? '- Ocultar cor personalizada' : '+ Adicionar cor personalizada'}
          </button>

          {showCustomColor && (
            <div className="space-y-3 p-3 border rounded-md bg-gray-50">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  placeholder="Nome da cor"
                  className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
                <input
                  type="color"
                  value={customHex}
                  onChange={(e) => setCustomHex(e.target.value)}
                  className="h-[42px] w-16 border rounded-md cursor-pointer"
                />
              </div>
              
              {/* Seletor de Imagem */}
              {productImages.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Imagem desta cor:</label>
                  <div className="grid grid-cols-4 gap-2">
                    {productImages.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCustomImageIndex(idx)}
                        className={`relative aspect-square border-2 rounded-md overflow-hidden transition-all ${
                          customImageIndex === idx
                            ? 'border-primary-600 ring-2 ring-primary-300'
                            : 'border-gray-300 hover:border-primary-400'
                        }`}
                      >
                        <img 
                          src={img} 
                          alt={`Imagem ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {customImageIndex === idx && (
                          <div className="absolute top-1 right-1 bg-primary-600 text-white rounded-full p-1">
                            <FiCheck className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <button
                type="button"
                onClick={() => {
                  addColor(customColor, customHex, customImageIndex)
                  setCustomColor('')
                  setCustomHex('#000000')
                  setCustomImageIndex(0)
                }}
                disabled={!customColor.trim()}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
              >
                <FiPlus className="w-5 h-5" />
                Adicionar Cor
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal de Seleção de Imagem */}
      {showImageSelector && selectedColorForImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {uniqueColors.includes(selectedColorForImage.name) 
                  ? `Alterar imagem da cor: ${selectedColorForImage.name}`
                  : `Selecione a imagem para a cor: ${selectedColorForImage.name}`
                }
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowImageSelector(false)
                  setSelectedColorForImage(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mb-4">
              {productImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTempImageIndex(idx)}
                  className={`relative aspect-square border-2 rounded-md overflow-hidden transition-all ${
                    tempImageIndex === idx
                      ? 'border-primary-600 ring-2 ring-primary-300'
                      : 'border-gray-300 hover:border-primary-400'
                  }`}
                >
                  <img 
                    src={img} 
                    alt={`Imagem ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {tempImageIndex === idx && (
                    <div className="absolute top-2 right-2 bg-primary-600 text-white rounded-full p-1">
                      <FiCheck className="w-4 h-4" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs py-1 px-2 text-center">
                    Imagem {idx + 1}
                  </div>
                </button>
              ))}
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowImageSelector(false)
                  setSelectedColorForImage(null)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (uniqueColors.includes(selectedColorForImage.name)) {
                    // Cor já existe, apenas atualiza a imagem
                    updateColorImage(selectedColorForImage.name, tempImageIndex)
                  } else {
                    // Cor nova, adiciona
                    addColor(selectedColorForImage.name, selectedColorForImage.hex, tempImageIndex)
                  }
                  setShowImageSelector(false)
                  setSelectedColorForImage(null)
                }}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                {uniqueColors.includes(selectedColorForImage.name) ? 'Atualizar Imagem' : 'Adicionar Cor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Matriz de Variações */}
      {variants.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium">
              {colorType === 'Única' ? 'Estoque por Tamanho' : 'Matriz Tamanho × Cor'}
            </label>
            <span className="text-xs text-gray-500">
              Total: {variants.reduce((sum, v) => sum + (v.stock || 0), 0)} unidades
            </span>
          </div>

          {colorType === 'Única' ? (
            // Visualização simples: apenas tamanhos
            <div className="space-y-2">
              {uniqueSizes.map(size => {
                const variant = variants.find(v => v.size === size)
                if (!variant) return null
                
                return (
                  <div key={size} className="flex items-center gap-3 p-3 border rounded-md bg-gray-50">
                    <div className="font-medium min-w-[60px]">{size}</div>
                    
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">Estoque</label>
                      <input
                        type="number"
                        min="0"
                        value={variant.stock}
                        onChange={(e) => updateVariantStock(size, variant.color, parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>

                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">Preço (opcional)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={variant.price || ''}
                        onChange={(e) => updateVariantPrice(size, variant.color, e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder={basePrice ? `R$ ${basePrice.toFixed(2)}` : ''}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeSize(size)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-md"
                    >
                      <FiX className="w-5 h-5" />
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            // Visualização matriz: tamanhos × cores
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left text-sm font-medium">Tamanho</th>
                    {uniqueColors.map(color => {
                      const variant = variants.find(v => v.color === color)
                      return (
                        <th key={color} className="border p-2 text-center text-sm">
                          <div className="flex items-center justify-center gap-2">
                            <div
                              className="w-5 h-5 rounded-full border-2 border-gray-300"
                              style={{
                                backgroundColor: variant?.colorHex || '#808080',
                                boxShadow: variant?.colorHex === '#FFFFFF' ? 'inset 0 0 0 1px rgba(0,0,0,0.1)' : 'none'
                              }}
                            />
                            <span>{color}</span>
                            <button
                              type="button"
                              onClick={() => removeColor(color)}
                              className="text-red-500 hover:bg-red-50 rounded p-1"
                            >
                              <FiX className="w-4 h-4" />
                            </button>
                          </div>
                        </th>
                      )
                    })}
                    <th className="border p-2 text-center text-sm">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {uniqueSizes.map(size => (
                    <tr key={size} className="hover:bg-gray-50">
                      <td className="border p-2 font-medium">{size}</td>
                      {uniqueColors.map(color => {
                        const variant = variants.find(v => v.size === size && v.color === color)
                        if (!variant) return <td key={color} className="border p-2"></td>
                        
                        return (
                          <td key={color} className="border p-2">
                            <div className="flex flex-col gap-1">
                              <input
                                type="number"
                                min="0"
                                value={variant.stock}
                                onChange={(e) => updateVariantStock(size, color, parseInt(e.target.value) || 0)}
                                placeholder="Estoque"
                                className="w-full px-2 py-1 border rounded text-sm text-center"
                              />
                              <input
                                type="number"
                                step="0.01"
                                value={variant.price || ''}
                                onChange={(e) => updateVariantPrice(size, color, e.target.value ? parseFloat(e.target.value) : undefined)}
                                placeholder={basePrice ? `R$ ${basePrice.toFixed(2)}` : 'Preço'}
                                className="w-full px-2 py-1 border rounded text-xs text-center"
                              />
                            </div>
                          </td>
                        )
                      })}
                      <td className="border p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeSize(size)}
                          className="text-red-500 hover:bg-red-50 rounded p-1"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {variants.length === 0 && (
        <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-md">
          <p className="text-sm">Nenhuma variação adicionada</p>
          <p className="text-xs mt-1">
            {colorType === 'Única' 
              ? 'Adicione os tamanhos disponíveis acima'
              : 'Adicione tamanhos e cores para criar a matriz de variações'}
          </p>
        </div>
      )}
    </div>
  )
}
