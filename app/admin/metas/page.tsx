'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiTarget, FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight, FiX, FiUsers, FiUser } from 'react-icons/fi';
import toast from 'react-hot-toast';

const GOAL_TYPE_LABELS: Record<string, string> = {
  SALES_AMOUNT: 'Valor de Vendas (R$)',
  SALES_COUNT: 'Qtd. de Vendas',
  CLICKS_COUNT: 'Cliques no Link',
  COMMISSION_AMOUNT: 'Valor de Comissões (R$)',
};

const GOAL_TYPE_FORMAT: Record<string, (v: number) => string> = {
  SALES_AMOUNT: (v) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
  SALES_COUNT: (v) => `${v} venda${v !== 1 ? 's' : ''}`,
  CLICKS_COUNT: (v) => `${v} clique${v !== 1 ? 's' : ''}`,
  COMMISSION_AMOUNT: (v) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
};

interface Affiliate {
  id: string;
  name: string;
  code: string;
  email: string;
}

interface Goal {
  id: string;
  affiliateId: string | null;
  title: string;
  description: string | null;
  type: string;
  targetValue: number;
  startDate: string;
  endDate: string;
  reward: string | null;
  isActive: boolean;
  affiliate: { name: string; code: string } | null;
}

const emptyForm = {
  affiliateId: '',
  title: '',
  description: '',
  type: 'SALES_AMOUNT',
  targetValue: '',
  startDate: '',
  endDate: '',
  reward: '',
  isActive: true,
};

function fmt(date: string) {
  return new Date(date).toLocaleDateString('pt-BR');
}

function toInputDate(date: string) {
  return new Date(date).toISOString().slice(0, 10);
}

export default function AdminMetasPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [gRes, aRes] = await Promise.all([
        fetch('/api/admin/goals'),
        fetch('/api/admin/affiliates?status=APPROVED&limit=200')
      ]);
      if (gRes.ok) setGoals((await gRes.json()).goals ?? []);
      if (aRes.ok) setAffiliates((await aRes.json()).affiliates ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  }

  function openEdit(g: Goal) {
    setEditingId(g.id);
    setForm({
      affiliateId: g.affiliateId ?? '',
      title: g.title,
      description: g.description ?? '',
      type: g.type,
      targetValue: String(g.targetValue),
      startDate: toInputDate(g.startDate),
      endDate: toInputDate(g.endDate),
      reward: g.reward ?? '',
      isActive: g.isActive,
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        affiliateId: form.affiliateId || null,
        title: form.title,
        description: form.description || null,
        type: form.type,
        targetValue: parseFloat(form.targetValue),
        startDate: form.startDate,
        endDate: form.endDate,
        reward: form.reward || null,
        isActive: form.isActive,
      };
      const url = editingId ? `/api/admin/goals/${editingId}` : '/api/admin/goals';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error ?? 'Erro ao salvar meta');
        return;
      }
      toast.success(editingId ? 'Meta atualizada!' : 'Meta criada!');
      setShowModal(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(g: Goal) {
    const res = await fetch(`/api/admin/goals/${g.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !g.isActive }),
    });
    if (res.ok) {
      setGoals((prev) => prev.map((x) => (x.id === g.id ? { ...x, isActive: !x.isActive } : x)));
    }
  }

  async function handleDelete(g: Goal) {
    if (!confirm(`Excluir a meta "${g.title}"?`)) return;
    const res = await fetch(`/api/admin/goals/${g.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Meta excluída');
      setGoals((prev) => prev.filter((x) => x.id !== g.id));
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
            <FiTarget className="text-blue-600" /> Metas de Afiliados
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Crie metas de vendas, cliques ou comissões para seus influenciadores
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <FiPlus /> Nova Meta
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : goals.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FiTarget size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700">Nenhuma meta criada</h3>
          <p className="text-gray-400 text-sm mt-1">Crie metas para engajar seus influenciadores</p>
          <button
            onClick={openCreate}
            className="mt-4 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Criar primeira meta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {goals.map((g) => {
            const expired = new Date(g.endDate) < now;
            const active = g.isActive && !expired;
            return (
              <div
                key={g.id}
                className={`bg-white rounded-lg shadow border-l-4 ${active ? 'border-blue-500' : expired ? 'border-orange-300' : 'border-gray-300'}`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 text-base leading-tight">{g.title}</h3>
                    <button onClick={() => handleToggle(g)} className="text-gray-400 hover:text-gray-600 ml-2 shrink-0">
                      {g.isActive
                        ? <FiToggleRight size={22} className="text-green-500" />
                        : <FiToggleLeft size={22} />}
                    </button>
                  </div>

                  {g.description && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{g.description}</p>
                  )}

                  {/* Scope */}
                  <div className="flex items-center gap-1.5 mb-3">
                    {g.affiliateId ? (
                      <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs font-medium px-2 py-0.5 rounded-full">
                        <FiUser size={10} /> {g.affiliate?.name ?? 'Afiliado específico'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                        <FiUsers size={10} /> Global (todos)
                      </span>
                    )}
                    {expired && (
                      <span className="bg-orange-50 text-orange-600 text-xs px-2 py-0.5 rounded-full font-medium">
                        Encerrada
                      </span>
                    )}
                  </div>

                  {/* Target */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <p className="text-xs text-gray-500 mb-0.5">{GOAL_TYPE_LABELS[g.type]}</p>
                    <p className="text-lg font-bold text-gray-900">
                      {GOAL_TYPE_FORMAT[g.type]?.(g.targetValue) ?? g.targetValue}
                    </p>
                  </div>

                  {/* Dates */}
                  <p className="text-xs text-gray-400 mb-3">
                    {fmt(g.startDate)} → {fmt(g.endDate)}
                  </p>

                  {/* Reward */}
                  {g.reward && (
                    <div className="bg-yellow-50 border border-yellow-100 rounded p-2 mb-3">
                      <p className="text-xs text-yellow-700 font-medium">🏆 Prêmio:</p>
                      <p className="text-sm text-yellow-800 line-clamp-2">{g.reward}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(g)}
                      className="flex-1 bg-gray-100 text-gray-700 text-xs py-1.5 rounded hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                    >
                      <FiEdit2 size={12} /> Editar
                    </button>
                    <button
                      onClick={() => handleDelete(g)}
                      className="flex-1 bg-red-50 text-red-700 text-xs py-1.5 rounded hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                    >
                      <FiTrash2 size={12} /> Excluir
                    </button>
                  </div>
                </div>
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
                {editingId ? 'Editar Meta' : 'Nova Meta'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Scope */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Afiliado <span className="text-gray-400 font-normal">(deixe em branco para meta global)</span>
                </label>
                <select
                  value={form.affiliateId}
                  onChange={(e) => setForm((f) => ({ ...f, affiliateId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">— Global (todos os afiliados) —</option>
                  {affiliates.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Meta de Julho"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Descreva a meta para os afiliados..."
                />
              </div>

              {/* Type + Target */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Meta *</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Object.entries(GOAL_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor Alvo *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    step="0.01"
                    value={form.targetValue}
                    onChange={(e) => setForm((f) => ({ ...f, targetValue: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: 5000"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Início *</label>
                  <input
                    required
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim *</label>
                  <input
                    required
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Reward */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prêmio / Recompensa</label>
                <textarea
                  value={form.reward}
                  onChange={(e) => setForm((f) => ({ ...f, reward: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Ex: R$ 500 de bônus + frete grátis nos próximos 3 meses"
                />
              </div>

              {/* Active */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Meta ativa e visível para afiliados</span>
              </label>

              {/* Buttons */}
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
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Salvando…' : editingId ? 'Salvar Alterações' : 'Criar Meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
