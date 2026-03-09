'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiCamera, FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight, FiX, FiCheck, FiXCircle, FiExternalLink, FiChevronDown, FiChevronUp, FiLink, FiVideo, FiImage, FiFileText } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface Post {
  id: string;
  postUrl: string;
  platform: string;
  caption: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNotes: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  affiliate: { id: string; name: string; email: string; instagram: string | null };
}

interface Material {
  type: 'video' | 'image' | 'document' | 'link';
  url: string;
  title: string;
}

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  hashtags: string | null;
  contentGuide: string | null;
  products: string | null;
  materials: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  _count: { posts: number };
}

const emptyForm = {
  title: '',
  description: '',
  hashtags: '',
  contentGuide: '',
  startDate: '',
  endDate: '',
  isActive: true,
  materials: [] as Material[],
};

function fmt(date: string) {
  return new Date(date).toLocaleDateString('pt-BR');
}

function toInputDate(date: string) {
  return new Date(date).toISOString().slice(0, 10);
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};
const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
};

export default function AdminCampanhasPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  // Posts review state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewingPostId, setReviewingPostId] = useState<string | null>(null);
  const [newMaterial, setNewMaterial] = useState<Material>({ type: 'video', url: '', title: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/campaigns');
      if (res.ok) setCampaigns((await res.json()).campaigns ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    setLoadingPosts(true);
    try {
      const res = await fetch(`/api/admin/campaigns/${id}/posts`);
      if (res.ok) setPosts((await res.json()).posts ?? []);
    } finally {
      setLoadingPosts(false);
    }
  }

  async function reviewPost(postId: string, status: 'APPROVED' | 'REJECTED') {
    if (!expandedId) return;
    setReviewingPostId(postId);
    try {
      const res = await fetch(`/api/admin/campaigns/${expandedId}/posts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, status, adminNotes: reviewNote || null }),
      });
      if (res.ok) {
        toast.success(status === 'APPROVED' ? 'Post aprovado!' : 'Post rejeitado');
        setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, status, adminNotes: reviewNote || null } : p));
        setReviewNote('');
      } else {
        toast.error('Erro ao revisar post');
      }
    } finally {
      setReviewingPostId(null);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  }

  function openEdit(c: Campaign) {
    setEditingId(c.id);
    setNewMaterial({ type: 'video', url: '', title: '' });
    setForm({
      title: c.title,
      description: c.description ?? '',
      hashtags: c.hashtags ?? '',
      contentGuide: c.contentGuide ?? '',
      startDate: toInputDate(c.startDate),
      endDate: toInputDate(c.endDate),
      isActive: c.isActive,
      materials: c.materials ? JSON.parse(c.materials) : [],
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        title: form.title,
        description: form.description || null,
        hashtags: form.hashtags || null,
        contentGuide: form.contentGuide || null,
        startDate: form.startDate,
        endDate: form.endDate,
        isActive: form.isActive,
        materials: form.materials,
      };
      const url = editingId ? `/api/admin/campaigns/${editingId}` : '/api/admin/campaigns';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error ?? 'Erro ao salvar campanha');
        return;
      }
      toast.success(editingId ? 'Campanha atualizada!' : 'Campanha criada!');
      setShowModal(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(c: Campaign) {
    const res = await fetch(`/api/admin/campaigns/${c.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    if (res.ok) {
      setCampaigns((prev) => prev.map((x) => x.id === c.id ? { ...x, isActive: !x.isActive } : x));
    }
  }

  async function handleDelete(c: Campaign) {
    if (!confirm(`Excluir a campanha "${c.title}"? Todos os posts enviados serão apagados.`)) return;
    const res = await fetch(`/api/admin/campaigns/${c.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Campanha excluída');
      setCampaigns((prev) => prev.filter((x) => x.id !== c.id));
      if (expandedId === c.id) setExpandedId(null);
    } else {
      toast.error('Erro ao excluir');
    }
  }

  const now = new Date();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiCamera className="text-pink-500" /> Campanhas de Influenciadores
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Crie campanhas no Instagram e revise os posts enviados pelos afiliados
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition-colors flex items-center gap-2"
        >
          <FiPlus /> Nova Campanha
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FiCamera size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700">Nenhuma campanha criada</h3>
          <p className="text-gray-400 text-sm mt-1">Crie campanhas de Instagram para seus influenciadores</p>
          <button
            onClick={openCreate}
            className="mt-4 bg-pink-600 text-white px-5 py-2 rounded-lg hover:bg-pink-700 transition-colors"
          >
            Criar primeira campanha
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((c) => {
            const expired = new Date(c.endDate) < now;
            const active = c.isActive && !expired;
            const isOpen = expandedId === c.id;

            return (
              <div key={c.id} className={`bg-white rounded-lg shadow border-l-4 ${active ? 'border-pink-500' : expired ? 'border-orange-300' : 'border-gray-300'}`}>
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{c.title}</h3>
                        {expired && (
                          <span className="bg-orange-50 text-orange-600 text-xs px-2 py-0.5 rounded-full">Encerrada</span>
                        )}
                        {!c.isActive && !expired && (
                          <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">Inativa</span>
                        )}
                      </div>
                      {c.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">{c.description}</p>
                      )}
                      {c.hashtags && (
                        <p className="text-xs text-pink-500 mt-1 font-medium">{c.hashtags}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{fmt(c.startDate)} → {fmt(c.endDate)}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm text-gray-600 font-medium">{c._count.posts} post{c._count.posts !== 1 ? 's' : ''}</span>
                      <button onClick={() => handleToggle(c)} className="text-gray-400 hover:text-gray-600">
                        {c.isActive
                          ? <FiToggleRight size={22} className="text-green-500" />
                          : <FiToggleLeft size={22} />}
                      </button>
                      <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-blue-600">
                        <FiEdit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(c)} className="text-gray-400 hover:text-red-600">
                        <FiTrash2 size={16} />
                      </button>
                      <button
                        onClick={() => toggleExpand(c.id)}
                        className="flex items-center gap-1 text-pink-600 hover:text-pink-700 text-sm font-medium"
                      >
                        Posts {isOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Posts panel */}
                {isOpen && (
                  <div className="border-t bg-gray-50 p-5">
                    {loadingPosts ? (
                      <div className="flex items-center justify-center py-6">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500" />
                      </div>
                    ) : posts.length === 0 ? (
                      <p className="text-center text-gray-400 text-sm py-4">Nenhum post enviado ainda</p>
                    ) : (
                      <div className="space-y-4">
                        {posts.map((post) => (
                          <div key={post.id} className="bg-white rounded-lg border p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="font-medium text-gray-900 text-sm">{post.affiliate.name}</span>
                                  {post.affiliate.instagram && (
                                    <span className="text-xs text-gray-400">@{post.affiliate.instagram}</span>
                                  )}
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[post.status]}`}>
                                    {STATUS_LABEL[post.status]}
                                  </span>
                                </div>
                                <a
                                  href={post.postUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline text-sm flex items-center gap-1 truncate"
                                >
                                  <FiExternalLink size={12} /> {post.postUrl}
                                </a>
                                {post.caption && (
                                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{post.caption}</p>
                                )}
                                {post.adminNotes && (
                                  <p className="text-xs text-orange-600 mt-1">Nota: {post.adminNotes}</p>
                                )}
                                <p className="text-xs text-gray-400 mt-1">
                                  Enviado em {new Date(post.submittedAt).toLocaleDateString('pt-BR')}
                                </p>
                              </div>

                              {post.status === 'PENDING' && (
                                <div className="flex flex-col gap-2 shrink-0">
                                  <input
                                    type="text"
                                    placeholder="Nota (opcional)"
                                    value={reviewingPostId === post.id ? reviewNote : ''}
                                    onChange={(e) => {
                                      setReviewingPostId(post.id);
                                      setReviewNote(e.target.value);
                                    }}
                                    className="border border-gray-300 rounded px-2 py-1 text-xs w-36 focus:ring-1 focus:ring-pink-500"
                                  />
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => reviewPost(post.id, 'APPROVED')}
                                      disabled={reviewingPostId === post.id}
                                      className="flex-1 bg-green-100 text-green-700 text-xs py-1.5 rounded hover:bg-green-200 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                                    >
                                      <FiCheck size={12} /> Aprovar
                                    </button>
                                    <button
                                      onClick={() => reviewPost(post.id, 'REJECTED')}
                                      disabled={reviewingPostId === post.id}
                                      className="flex-1 bg-red-50 text-red-700 text-xs py-1.5 rounded hover:bg-red-100 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                                    >
                                      <FiXCircle size={12} /> Rejeitar
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">
                {editingId ? 'Editar Campanha' : 'Nova Campanha'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="Ex: Campanha Dia dos Namorados"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                  placeholder="Descreva o objetivo da campanha..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hashtags</label>
                <input
                  value={form.hashtags}
                  onChange={(e) => setForm((f) => ({ ...f, hashtags: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="#MYDShop #DiaDosNamorados #moda"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Guia de Conteúdo</label>
                <textarea
                  value={form.contentGuide}
                  onChange={(e) => setForm((f) => ({ ...f, contentGuide: e.target.value }))}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                  placeholder="Oriente os influenciadores sobre o conteúdo ideal: tom de voz, produtos a destacar, CTA, etc."
                />
              </div>

              {/* Material de Apoio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Material de Apoio</label>

                {form.materials.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {form.materials.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm">
                        {m.type === 'video' && <FiVideo size={14} className="text-red-500 shrink-0" />}
                        {m.type === 'image' && <FiImage size={14} className="text-blue-500 shrink-0" />}
                        {m.type === 'document' && <FiFileText size={14} className="text-orange-500 shrink-0" />}
                        {m.type === 'link' && <FiLink size={14} className="text-gray-500 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-700 text-xs">{m.title || m.url}</p>
                          {m.title && <p className="text-gray-400 text-xs truncate">{m.url}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, materials: f.materials.filter((_, j) => j !== i) }))}
                          className="text-gray-400 hover:text-red-500 shrink-0"
                        >
                          <FiX size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border border-dashed border-gray-300 rounded-lg p-3 space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={newMaterial.type}
                      onChange={(e) => setNewMaterial((m) => ({ ...m, type: e.target.value as Material['type'] }))}
                      className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-pink-500"
                    >
                      <option value="video">🎥 Vídeo</option>
                      <option value="image">🖼️ Imagem</option>
                      <option value="document">📄 Documento</option>
                      <option value="link">🔗 Link</option>
                    </select>
                    <input
                      type="url"
                      value={newMaterial.url}
                      onChange={(e) => setNewMaterial((m) => ({ ...m, url: e.target.value }))}
                      placeholder="URL"
                      className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-pink-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMaterial.title}
                      onChange={(e) => setNewMaterial((m) => ({ ...m, title: e.target.value }))}
                      placeholder="Título / Descrição"
                      className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-pink-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newMaterial.url.trim()) return;
                        setForm((f) => ({ ...f, materials: [...f.materials, { ...newMaterial }] }));
                        setNewMaterial({ type: 'video', url: '', title: '' });
                      }}
                      className="bg-pink-600 text-white px-3 py-1.5 rounded text-sm hover:bg-pink-700 transition-colors flex items-center gap-1"
                    >
                      <FiPlus size={14} /> Adicionar
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Início *</label>
                  <input
                    required
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim *</label>
                  <input
                    required
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="w-4 h-4 text-pink-600 rounded"
                />
                <span className="text-sm text-gray-700">Campanha ativa e visível para afiliados</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-pink-600 text-white py-2 rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Salvando…' : editingId ? 'Salvar Alterações' : 'Criar Campanha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
