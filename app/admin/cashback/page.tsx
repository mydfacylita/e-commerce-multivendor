'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiPercent, FiDollarSign, FiPlus, FiEdit2, 
  FiTrash2, FiToggleLeft, FiToggleRight, FiCalendar, FiTag
} from 'react-icons/fi';

// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';


interface CashbackRule {
  id: string;
  name: string;
  description: string | null;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minOrderValue: number | null;
  maxCashback: number | null;
  categoryIds: string[] | null;
  productIds: string[] | null;
  sellerIds: string[] | null;
  validFrom: string;
  validUntil: string | null;
  isActive: boolean;
  priority: number;
  firstPurchaseOnly: boolean;
  forNewCustomers: boolean;
  createdAt: string;
}

export default function AdminCashbackPage() {
  const [rules, setRules] = useState<CashbackRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<CashbackRule | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    value: '',
    minOrderValue: '',
    maxCashback: '',
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: '',
    isActive: true,
    priority: '0',
    firstPurchaseOnly: false,
    forNewCustomers: false
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/cashback/rules');
      if (response.ok) {
        const data = await response.json();
        setRules(data.rules);
      }
    } catch (error) {
      console.error('Erro ao buscar regras:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = (rule?: CashbackRule) => {
    if (rule) {
      setEditingRule(rule);
      setForm({
        name: rule.name,
        description: rule.description || '',
        type: rule.type,
        value: rule.value.toString(),
        minOrderValue: rule.minOrderValue?.toString() || '',
        maxCashback: rule.maxCashback?.toString() || '',
        validFrom: rule.validFrom.split('T')[0],
        validUntil: rule.validUntil?.split('T')[0] || '',
        isActive: rule.isActive,
        priority: rule.priority.toString(),
        firstPurchaseOnly: rule.firstPurchaseOnly,
        forNewCustomers: rule.forNewCustomers
      });
    } else {
      setEditingRule(null);
      setForm({
        name: '',
        description: '',
        type: 'PERCENTAGE',
        value: '',
        minOrderValue: '',
        maxCashback: '',
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: '',
        isActive: true,
        priority: '0',
        firstPurchaseOnly: false,
        forNewCustomers: false
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name || !form.value) {
      alert('Nome e valor são obrigatórios');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const payload = {
        name: form.name,
        description: form.description || null,
        type: form.type,
        value: parseFloat(form.value),
        minOrderValue: form.minOrderValue ? parseFloat(form.minOrderValue) : null,
        maxCashback: form.maxCashback ? parseFloat(form.maxCashback) : null,
        validFrom: form.validFrom,
        validUntil: form.validUntil || null,
        isActive: form.isActive,
        priority: parseInt(form.priority),
        firstPurchaseOnly: form.firstPurchaseOnly,
        forNewCustomers: form.forNewCustomers
      };

      const url = editingRule 
        ? `/api/admin/cashback/rules/${editingRule.id}`
        : '/api/admin/cashback/rules';
      
      const response = await fetch(url, {
        method: editingRule ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setShowModal(false);
        fetchRules();
      } else {
        const data = await response.json();
        alert(data.error || 'Erro ao salvar regra');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao processar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (rule: CashbackRule) => {
    try {
      const response = await fetch(`/api/admin/cashback/rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !rule.isActive })
      });

      if (response.ok) {
        fetchRules();
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const deleteRule = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta regra?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/cashback/rules/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchRules();
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <FiArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cashback</h1>
            <p className="text-gray-600">Configure as regras de cashback para os clientes</p>
          </div>
        </div>
        <button
          onClick={() => openModal()}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
        >
          <FiPlus size={20} />
          Nova Regra
        </button>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <FiPercent size={24} />
            <span className="font-semibold">Regras Ativas</span>
          </div>
          <p className="text-3xl font-bold">
            {rules.filter(r => r.isActive).length}
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <FiTag size={24} />
            <span className="font-semibold">Total de Regras</span>
          </div>
          <p className="text-3xl font-bold">{rules.length}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <FiDollarSign size={24} />
            <span className="font-semibold">Cashback Médio</span>
          </div>
          <p className="text-3xl font-bold">
            {rules.length > 0 
              ? `${(rules.reduce((sum, r) => sum + (r.type === 'PERCENTAGE' ? r.value : 0), 0) / rules.filter(r => r.type === 'PERCENTAGE').length || 0).toFixed(1)}%`
              : '0%'
            }
          </p>
        </div>
      </div>

      {/* Lista de Regras */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-12">
            <FiPercent className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 mb-4">Nenhuma regra de cashback cadastrada</p>
            <button
              onClick={() => openModal()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Criar primeira regra
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Regra
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Condições
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Validade
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rules.map((rule) => (
                  <tr key={rule.id} className={`hover:bg-gray-50 ${!rule.isActive ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{rule.name}</div>
                        {rule.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {rule.description}
                          </div>
                        )}
                        <div className="text-xs text-gray-400">
                          Prioridade: {rule.priority}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {rule.type === 'PERCENTAGE' ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                            {rule.value}%
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                            {formatCurrency(rule.value)}
                          </span>
                        )}
                      </div>
                      {rule.maxCashback && (
                        <div className="text-xs text-gray-500 mt-1">
                          Máx: {formatCurrency(rule.maxCashback)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-sm">
                        {rule.minOrderValue && (
                          <div className="text-gray-600">
                            Pedido mín: {formatCurrency(rule.minOrderValue)}
                          </div>
                        )}
                        {rule.firstPurchaseOnly && (
                          <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">
                            Primeira compra
                          </span>
                        )}
                        {rule.forNewCustomers && (
                          <span className="inline-block px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">
                            Clientes novos
                          </span>
                        )}
                        {!rule.minOrderValue && !rule.firstPurchaseOnly && !rule.forNewCustomers && (
                          <span className="text-gray-400">Sem restrições</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="text-gray-900">
                          {new Date(rule.validFrom).toLocaleDateString('pt-BR')}
                        </div>
                        {rule.validUntil ? (
                          <div className="text-gray-500">
                            até {new Date(rule.validUntil).toLocaleDateString('pt-BR')}
                          </div>
                        ) : (
                          <div className="text-green-600">Sem fim</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleActive(rule)}
                        className={`p-2 rounded-lg transition-colors ${
                          rule.isActive 
                            ? 'text-green-600 hover:bg-green-50' 
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        {rule.isActive ? (
                          <FiToggleRight size={24} />
                        ) : (
                          <FiToggleLeft size={24} />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openModal(rule)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <FiEdit2 size={18} />
                        </button>
                        <button
                          onClick={() => deleteRule(rule.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-6">
              {editingRule ? 'Editar Regra' : 'Nova Regra de Cashback'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Regra *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Ex: Cashback de Verão"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  rows={2}
                  placeholder="Descrição interna da regra..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo *
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as 'PERCENTAGE' | 'FIXED' })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="PERCENTAGE">Porcentagem (%)</option>
                    <option value="FIXED">Valor Fixo (R$)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder={form.type === 'PERCENTAGE' ? '5' : '10.00'}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pedido Mínimo
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.minOrderValue}
                    onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="R$ 0,00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cashback Máximo
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.maxCashback}
                    onChange={(e) => setForm({ ...form, maxCashback: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Sem limite"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Válido a partir de *
                  </label>
                  <input
                    type="date"
                    value={form.validFrom}
                    onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Válido até
                  </label>
                  <input
                    type="date"
                    value={form.validUntil}
                    onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prioridade
                </label>
                <input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maior número = maior prioridade (aplicado primeiro)
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.firstPurchaseOnly}
                    onChange={(e) => setForm({ ...form, firstPurchaseOnly: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Apenas primeira compra</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.forNewCustomers}
                    onChange={(e) => setForm({ ...form, forNewCustomers: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Apenas clientes novos (30 dias)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Regra ativa</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : (editingRule ? 'Salvar Alterações' : 'Criar Regra')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
