'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { FiUpload, FiX } from 'react-icons/fi';

export default function NewProductPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    comparePrice: '',
    stock: '',
    categoryId: '',
    brand: '',
    model: '',
    color: '',
    specifications: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    fetchCategories();
  }, [status]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageUrl = () => {
    const url = prompt('Cole a URL da imagem:');
    if (url && url.trim()) {
      setImages([...images, url.trim()]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (images.length === 0) {
      toast.error('Adicione pelo menos uma imagem');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/seller/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          comparePrice: formData.comparePrice ? parseFloat(formData.comparePrice) : null,
          stock: parseInt(formData.stock),
          images: JSON.stringify(images),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao cadastrar produto');
      }

      toast.success('Produto cadastrado com sucesso!');
      router.push('/vendedor/dashboard');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Adicionar Novo Produto</h1>
            <p className="text-gray-600 mt-1">Preencha os dados do produto que deseja vender</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informações Básicas */}
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Informações Básicas</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nome do Produto *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="Ex: Notebook Dell Inspiron 15"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Descrição *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="Descreva seu produto, características, benefícios..."
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Categoria *</label>
                    <select
                      name="categoryId"
                      value={formData.categoryId}
                      onChange={handleChange}
                      required
                      className="w-full border rounded-lg px-4 py-2"
                    >
                      <option value="">Selecione uma categoria</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Marca</label>
                    <input
                      type="text"
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      className="w-full border rounded-lg px-4 py-2"
                      placeholder="Ex: Dell, Samsung, Nike..."
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Modelo</label>
                    <input
                      type="text"
                      name="model"
                      value={formData.model}
                      onChange={handleChange}
                      className="w-full border rounded-lg px-4 py-2"
                      placeholder="Ex: Inspiron 15 3000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Cor</label>
                    <input
                      type="text"
                      name="color"
                      value={formData.color}
                      onChange={handleChange}
                      className="w-full border rounded-lg px-4 py-2"
                      placeholder="Ex: Preto, Azul, Vermelho..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Preço e Estoque */}
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Preço e Estoque</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Preço de Venda * (R$)</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    required
                    step="0.01"
                    min="0"
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Preço Comparação (R$)</label>
                  <input
                    type="number"
                    name="comparePrice"
                    value={formData.comparePrice}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">Preço "de" (riscado)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Estoque * (unidades)</label>
                  <input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleChange}
                    required
                    min="0"
                    className="w-full border rounded-lg px-4 py-2"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Imagens */}
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Imagens do Produto</h2>
              <div className="border-2 border-dashed rounded-lg p-6">
                <button
                  type="button"
                  onClick={handleImageUrl}
                  className="w-full flex items-center justify-center gap-2 py-3 border rounded-lg hover:bg-gray-50"
                >
                  <FiUpload size={20} />
                  Adicionar Imagem (URL)
                </button>

                {images.length > 0 && (
                  <div className="grid grid-cols-4 gap-4 mt-4">
                    {images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image}
                          alt={`Imagem ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <FiX size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-sm text-gray-500 mt-3 text-center">
                  Adicione até 10 imagens do seu produto
                </p>
              </div>
            </div>

            {/* Especificações Técnicas */}
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Especificações Técnicas (Opcional)</h2>
              <textarea
                name="specifications"
                value={formData.specifications}
                onChange={handleChange}
                rows={4}
                className="w-full border rounded-lg px-4 py-2"
                placeholder="Ex: RAM: 8GB, Processador: Intel i5, Tela: 15.6 polegadas..."
              />
              <p className="text-xs text-gray-500 mt-1">Uma especificação por linha</p>
            </div>

            {/* Botões */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.push('/vendedor/dashboard')}
                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Cadastrando...' : 'Cadastrar Produto'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
