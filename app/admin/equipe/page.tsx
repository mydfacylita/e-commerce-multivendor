'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  FiUserPlus, FiEdit2, FiTrash2, FiUserCheck, FiUserX,
  FiKey, FiMail, FiAlertCircle, FiX, FiCheck
} from 'react-icons/fi'

interface StaffMember {
  id: string
  userId: string
  name: string | null
  email: string
  isActive: boolean
  permissionCount: number
  notes: string | null
  createdAt: string
}

interface NewStaffForm {
  name: string
  email: string
  password: string
  cargo: string
  notes: string
}

export default function EquipePage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<NewStaffForm>({ name: '', email: '', password: '', cargo: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/equipe')
      const data = await res.json()
      if (Array.isArray(data)) setStaff(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) {
      setError('Nome, e-mail e senha são obrigatórios')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/equipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, permissions: [] })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao criar'); return }
      setShowModal(false)
      setForm({ name: '', email: '', password: '', cargo: '', notes: '' })
      await load()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/admin/equipe/${id}`, { method: 'DELETE' })
      setDeleteConfirm(null)
      await load()
    } catch {}
  }

  const toggleActive = async (s: StaffMember) => {
    await fetch(`/api/admin/equipe/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !s.isActive })
    })
    await load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipe Admin</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie os funcionários e suas permissões de acesso ao painel</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setError('') }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
        >
          <FiUserPlus size={16} />
          Novo Funcionário
        </button>
      </div>

      {/* Info Master */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <FiAlertCircle className="text-blue-500 mt-0.5 flex-shrink-0" size={16} />
        <p className="text-sm text-blue-700">
          Você é o <strong>Administrador Master</strong> — acesso total ao sistema. Os funcionários abaixo têm acesso limitado conforme as permissões definidas.
          Clique em <strong>Editar</strong> para configurar o que cada um pode ver e acessar.
        </p>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Carregando...</div>
        ) : staff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
            <FiUserCheck size={40} className="opacity-30" />
            <p className="text-sm">Nenhum funcionário cadastrado ainda.</p>
            <button
              onClick={() => setShowModal(true)}
              className="text-indigo-600 text-sm font-medium hover:underline"
            >
              Adicionar o primeiro funcionário
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-xs text-gray-400 font-medium">Funcionário</th>
                  <th className="text-left py-3 px-4 text-xs text-gray-400 font-medium">E-mail</th>
                  <th className="text-center py-3 px-4 text-xs text-gray-400 font-medium">Permissões</th>
                  <th className="text-center py-3 px-4 text-xs text-gray-400 font-medium">Status</th>
                  <th className="text-center py-3 px-4 text-xs text-gray-400 font-medium">Adicionado em</th>
                  <th className="text-center py-3 px-4 text-xs text-gray-400 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(s => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {(s.name || s.email).charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-800">{s.name || '—'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      <div className="flex items-center gap-1">
                        <FiMail size={12} />
                        {s.email}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-1 rounded-full">
                        <FiKey size={11} />
                        {s.permissionCount} {s.permissionCount === 1 ? 'permissão' : 'permissões'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleActive(s)}
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition ${
                          s.isActive
                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {s.isActive ? <FiUserCheck size={11} /> : <FiUserX size={11} />}
                        {s.isActive ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center text-gray-400 text-xs">
                      {new Date(s.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/admin/equipe/${s.id}`}
                          className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600 transition"
                          title="Editar permissões"
                        >
                          <FiEdit2 size={14} />
                        </Link>
                        {deleteConfirm === s.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"><FiCheck size={14} /></button>
                            <button onClick={() => setDeleteConfirm(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition"><FiX size={14} /></button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(s.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition"
                            title="Remover funcionário"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal criar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">Novo Funcionário</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
                <FiX size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="Nome do funcionário"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">E-mail *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="email@empresa.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Senha *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="Senha de acesso"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cargo</label>
                <input
                  type="text"
                  value={form.cargo}
                  onChange={e => setForm(p => ({ ...p, cargo: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="Ex: Suporte, Financeiro, Logística"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Observações</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  rows={2}
                  placeholder="Cargo, setor, etc."
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
                  <FiAlertCircle size={13} />
                  {error}
                </div>
              )}

              <p className="text-xs text-gray-400">
                Após criar, clique em <strong>Editar</strong> para definir as permissões de acesso.
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-60"
              >
                {saving ? 'Criando...' : 'Criar Funcionário'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
