'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiPackage, FiPlus, FiEdit2, FiTrash2, FiUsers, FiShoppingBag, FiToggleLeft, FiToggleRight, FiX, FiSearch, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  price: number;
  images: string;
  slug: string;
}

interface Kit {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  products: { product: Product }[];
  _count: { assignments: number };
}

interface Affiliate {
  id: string;
  name: string;
  code: string;
  email: string;
  status: string;
}

export default function AdminKitsPage() {
  const [kits, setKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);

  // Modais
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedKit, setSelectedKit] = useState<Kit | null>(null);

  // Forms
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [saving, setSaving] = useState(false);

  // Busca de produtos e afiliados
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [affiliateSearch, setAffiliateSearch] = useState('');
  const [affiliateResults, setAffiliateResults] = useState<Affiliate[]>([]);

  useEffect(() => {
    loadKits();
  }, []);

  const loadKits = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/kits');
      if (res.ok) {
        const data = await res.json();
        setKits(data.kits);
      }
    } finally {
      setLoading(false);
    }
  };

  const searchProducts = useCallback(async (q: string) => {
    if (q.length < 2) { setProductResults([]); return; }
    try {
      const res = await fetch(`/api/admin/products?search=${encodeURIComponent(q)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setProductResults(data.products || []);
      }
    } catch {}
  }, []);

  const searchAffiliates = useCallback(async (q: string) => {
    if (q.length < 2) { setAffiliateResults([]); return; }
    try {
      const res = await fetch(`/api/admin/affiliates?search=${encodeURIComponent(q)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setAffiliateResults(data.affiliates || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchProducts(productSearch), 300);
    return () => clearTimeout(t);
  }, [productSearch, searchProducts]);

  useEffect(() => {
    const t = setTimeout(() => searchAffiliates(affiliateSearch), 300);
    return () => clearTimeout(t);
  }, [affiliateSearch, searchAffiliates]);

  const handleCreate = async () => {
    if (!formName.trim()) { toast.error('Informe o nome do kit'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/kits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, description: formDesc })
      });
      if (res.ok) {
        toast.success('Kit criado com sucesso!');
        setShowCreateModal(false);
        setFormName(''); setFormDesc('');
        loadKits();
      } else {
        const d = await res.json();
        toast.error(d.error || 'Erro ao criar kit');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedKit) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/kits/${selectedKit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, description: formDesc })
      });
      if (res.ok) {
        toast.success('Kit atualizado!');
        setShowEditModal(false);
        loadKits();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (kit: Kit) => {
    if (!confirm(`Excluir kit "${kit.name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await fetch(`/api/admin/kits/${kit.id}`, { method: 'DELETE' });
      toast.success('Kit excluído');
      loadKits();
    } catch {
      toast.error('Erro ao excluir');
    }
  };

  const handleToggleActive = async (kit: Kit) => {
    try {
      const res = await fetch(`/api/admin/kits/${kit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !kit.isActive })
      });
      if (res.ok) {
        toast.success(kit.isActive ? 'Kit desativado' : 'Kit ativado');
        loadKits();
      }
    } catch {}
  };

  const handleAddProduct = async (product: Product) => {
    if (!selectedKit) return;
    const already = selectedKit.products.some(p => p.product.id === product.id);
    if (already) { toast('Produto já está no kit'); return; }
    try {
      await fetch(`/api/admin/kits/${selectedKit.id}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id })
      });
      toast.success('Produto adicionado!');
      loadKits();
      setSelectedKit(prev => prev ? {
        ...prev,
        products: [...prev.products, { product }]
      } : null);
    } catch {}
  };

  const handleRemoveProduct = async (productId: string) => {
    if (!selectedKit) return;
    try {
      await fetch(`/api/admin/kits/${selectedKit.id}/products?productId=${productId}`, {
        method: 'DELETE'
      });
      toast.success('Produto removido');
      setSelectedKit(prev => prev ? {
        ...prev,
        products: prev.products.filter(p => p.product.id !== productId)
      } : null);
      loadKits();
    } catch {}
  };

  const handleAssign = async (affiliate: Affiliate) => {
    if (!selectedKit) return;
    try {
      const res = await fetch(`/api/admin/kits/${selectedKit.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ affiliateId: affiliate.id })
      });
      if (res.ok) {
        toast.success(`Kit enviado para ${affiliate.name}!`);
        loadKits();
      } else {
        const d = await res.json();
        toast.error(d.error || 'Erro ao enviar kit');
      }
    } catch {}
  };

  const getFirstImage = (images: string) => {
    try {
      const arr = JSON.parse(images);
      return Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
    } catch { return null; }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiPackage /> Kits de Divulgação
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Crie kits de produtos para enviar aos influenciadores afiliados
          </p>
        </div>
        <button
          onClick={() => { setFormName(''); setFormDesc(''); setShowCreateModal(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <FiPlus /> Novo Kit
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : kits.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FiPackage size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700">Nenhum kit criado</h3>
          <p className="text-gray-400 text-sm mt-1">Crie kits de divulgação para seus influenciadores</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Criar primeiro kit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {kits.map(kit => (
            <div key={kit.id} className={`bg-white rounded-lg shadow border-l-4 ${kit.isActive ? 'border-green-500' : 'border-gray-300'}`}>
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 text-base leading-tight">{kit.name}</h3>
                  <button onClick={() => handleToggleActive(kit)} className="text-gray-400 hover:text-gray-600 ml-2 shrink-0">
                    {kit.isActive
                      ? <FiToggleRight size={22} className="text-green-500" />
                      : <FiToggleLeft size={22} />}
                  </button>
                </div>
                {kit.description && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{kit.description}</p>
                )}

                {/* Produtos */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {kit.products.slice(0, 3).map(({ product }) => {
                    const img = getFirstImage(product.images);
                    return (
                      <div key={product.id} className="flex items-center gap-1 bg-gray-50 border rounded px-2 py-1 text-xs text-gray-600">
                        {img && <img src={img} alt="" className="w-5 h-5 rounded object-cover" />}
                        <span className="max-w-[80px] truncate">{product.name}</span>
                      </div>
                    );
                  })}
                  {kit.products.length > 3 && (
                    <span className="bg-gray-50 border rounded px-2 py-1 text-xs text-gray-400">
                      +{kit.products.length - 3}
                    </span>
                  )}
                  {kit.products.length === 0 && (
                    <span className="text-xs text-gray-400">Sem produtos</span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                  <span className="flex items-center gap-1"><FiShoppingBag size={12} /> {kit.products.length} produto(s)</span>
                  <span className="flex items-center gap-1"><FiUsers size={12} /> {kit._count.assignments} afiliado(s)</span>
                </div>

                {/* Ações */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedKit(kit);
                      setProductSearch('');
                      setProductResults([]);
                      setShowProductModal(true);
                    }}
                    className="flex-1 bg-gray-100 text-gray-700 text-xs py-1.5 rounded hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                  >
                    <FiShoppingBag size={12} /> Produtos
                  </button>
                  <button
                    onClick={() => {
                      setSelectedKit(kit);
                      setAffiliateSearch('');
                      setAffiliateResults([]);
                      setShowAssignModal(true);
                    }}
                    className="flex-1 bg-blue-50 text-blue-700 text-xs py-1.5 rounded hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                  >
                    <FiUsers size={12} /> Enviar
                  </button>
                  <button
                    onClick={() => {
                      setSelectedKit(kit);
                      setFormName(kit.name);
                      setFormDesc(kit.description || '');
                      setShowEditModal(true);
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100 transition-colors"
                  >
                    <FiEdit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(kit)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Criar Kit */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-semibold">Novo Kit de Divulgação</h3>
              <button onClick={() => setShowCreateModal(false)}><FiX /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do kit *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Kit Verão 2026"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Instruções ou descrição para o influenciador..."
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={handleCreate} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Criando...' : 'Criar Kit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Kit */}
      {showEditModal && selectedKit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-semibold">Editar Kit</h3>
              <button onClick={() => setShowEditModal(false)}><FiX /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button onClick={() => setShowEditModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm">Cancelar</button>
              <button onClick={handleEdit} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Gerenciar Produtos */}
      {showProductModal && selectedKit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-semibold">Produtos — {selectedKit.name}</h3>
              <button onClick={() => setShowProductModal(false)}><FiX /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Produtos atuais */}
              {selectedKit.products.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">No kit</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedKit.products.map(({ product }) => {
                      const img = getFirstImage(product.images);
                      return (
                        <div key={product.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                          {img && <img src={img} alt="" className="w-10 h-10 rounded object-cover shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
                            <p className="text-xs text-gray-500">R$ {product.price.toFixed(2)}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveProduct(product.id)}
                            className="text-red-400 hover:text-red-600 p-1"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Nenhum produto no kit ainda.</p>
              )}

              {/* Buscar produto */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Adicionar produto</p>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Buscar produto pelo nome..."
                  />
                </div>
                {productResults.length > 0 && (
                  <div className="mt-1 border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {productResults.map(p => {
                      const img = getFirstImage(p.images);
                      const already = selectedKit.products.some(kp => kp.product.id === p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => handleAddProduct(p)}
                          disabled={already}
                          className="w-full flex items-center gap-3 p-2.5 hover:bg-gray-50 disabled:opacity-50 text-left"
                        >
                          {img && <img src={img} alt="" className="w-8 h-8 rounded object-cover shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{p.name}</p>
                            <p className="text-xs text-gray-400">R$ {p.price.toFixed(2)}</p>
                          </div>
                          {already && <FiCheck size={14} className="text-green-500 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="p-5 border-t flex justify-end">
              <button onClick={() => setShowProductModal(false)} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Enviar para Afiliado */}
      {showAssignModal && selectedKit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-semibold">Enviar Kit — {selectedKit.name}</h3>
              <button onClick={() => setShowAssignModal(false)}><FiX /></button>
            </div>
            <div className="p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Buscar afiliado</p>
              <div className="relative mb-3">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  value={affiliateSearch}
                  onChange={e => setAffiliateSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nome, email ou código do afiliado..."
                />
              </div>
              {affiliateResults.length > 0 && (
                <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                  {affiliateResults.map(a => (
                    <button
                      key={a.id}
                      onClick={() => handleAssign(a)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                        {a.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.name}</p>
                        <p className="text-xs text-gray-400">{a.email} · {a.code}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                        a.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>{a.status}</span>
                    </button>
                  ))}
                </div>
              )}
              {affiliateSearch.length >= 2 && affiliateResults.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">Nenhum afiliado encontrado</p>
              )}
            </div>
            <div className="p-5 border-t flex justify-end">
              <button onClick={() => setShowAssignModal(false)} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
