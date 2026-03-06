'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  FiArrowLeft, FiSave, FiKey, FiUser, FiMail,
  FiCheck, FiX, FiAlertCircle, FiEye, FiEyeOff,
  FiCheckSquare, FiSquare, FiShield
} from 'react-icons/fi'
import { ADMIN_PERMISSIONS } from '@/lib/admin-permissions'

interface StaffData {
  id: string
  name: string | null
  email: string
  isActive: boolean
  notes: string | null
  permissions: string[]
}

export default function EditStaffPage() {
  const params = useParams()
  const router = useRouter()
  const staffId = params.id as string

  const [data, setData] = useState<StaffData | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])
  const [name, setName] = useState('')
  const [cargo, setCargo] = useState('')
  const [notes, setNotes] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/equipe/${staffId}`)
        const d = await res.json()
        if (res.ok) {
          setData(d)
          setPermissions(d.permissions || [])
          setName(d.name || '')
          setCargo(d.cargo || '')
          setNotes(d.notes || '')
          setIsActive(d.isActive)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [staffId])

  const toggle = (key: string) => {
    setPermissions(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const toggleGroup = (keys: string[]) => {
    const allChecked = keys.every(k => permissions.includes(k))
    if (allChecked) {
      setPermissions(prev => prev.filter(k => !keys.includes(k)))
    } else {
      setPermissions(prev => [...new Set([...prev, ...keys])])
    }
  }

  const selectAll = () => {
    const allKeys = ADMIN_PERMISSIONS.flatMap(g => g.items.map(i => i.key))
    setPermissions(allKeys)
  }

  const clearAll = () => setPermissions([])

  const save = async () => {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const body: any = { permissions, notes, isActive, name, cargo }
      if (newPassword.trim()) body.password = newPassword.trim()

      const res = await fetch(`/api/admin/equipe/${staffId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setSaved(true)
        setNewPassword('')
        setTimeout(() => setSaved(false), 3000)
      } else {
        const d = await res.json()
        setError(d.error || 'Erro ao salvar')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Carregando...</div>
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Funcionário não encontrado.</p>
        <Link href="/admin/equipe" className="text-indigo-600 text-sm mt-2 inline-block hover:underline">Voltar</Link>
      </div>
    )
  }

  const totalPerms = ADMIN_PERMISSIONS.flatMap(g => g.items).length

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/equipe"
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition"
        >
          <FiArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Permissões do Funcionário</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure o que este funcionário pode acessar no painel</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition text-sm font-medium disabled:opacity-60"
        >
          {saved ? <FiCheck size={16} /> : <FiSave size={16} />}
          {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar Permissões'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <FiAlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Dados do funcionário */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FiUser size={16} className="text-indigo-500" />
          Dados do Funcionário
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 bg-gray-50">
              <FiMail size={13} />
              {data.email}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cargo</label>
            <input
              type="text"
              value={cargo}
              onChange={e => setCargo(e.target.value)}
              placeholder="Ex: Suporte, Financeiro, Logística"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nova Senha (opcional)</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Deixe em branco para manter"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm pr-9 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <button
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <FiEyeOff size={14} /> : <FiEye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Cargo, setor, etc."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        </div>

        {/* Status toggle */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => setIsActive(p => !p)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-green-500' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <span className="text-sm text-gray-700">
            Acesso ao painel: <strong className={isActive ? 'text-green-600' : 'text-gray-500'}>{isActive ? 'Ativo' : 'Bloquear'}</strong>
          </span>
        </div>
      </div>

      {/* Header permissões */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <FiShield size={16} className="text-indigo-500" />
            <h3 className="font-semibold text-gray-800">Permissões de Acesso</h3>
            <span className="text-xs bg-indigo-50 text-indigo-600 font-medium px-2.5 py-0.5 rounded-full ml-1">
              {permissions.length} / {totalPerms} selecionadas
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition"
            >
              <FiCheckSquare size={13} />
              Marcar tudo
            </button>
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
            >
              <FiSquare size={13} />
              Desmarcar tudo
            </button>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="w-full bg-gray-100 rounded-full h-2 mb-6">
          <div
            className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${totalPerms > 0 ? (permissions.length / totalPerms) * 100 : 0}%` }}
          />
        </div>

        {/* Grupos de permissões */}
        <div className="space-y-6">
          {ADMIN_PERMISSIONS.map(group => {
            const groupKeys = group.items.map(i => i.key)
            const checkedCount = groupKeys.filter(k => permissions.includes(k)).length
            const allChecked = checkedCount === groupKeys.length
            const someChecked = checkedCount > 0 && !allChecked

            return (
              <div key={group.group}>
                {/* Cabeçalho do grupo */}
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
                  <button
                    onClick={() => toggleGroup(groupKeys)}
                    className="flex items-center gap-2 group"
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                      allChecked
                        ? 'bg-indigo-600 border-indigo-600'
                        : someChecked
                        ? 'bg-indigo-100 border-indigo-400'
                        : 'border-gray-300 group-hover:border-indigo-400'
                    }`}>
                      {allChecked && <FiCheck size={11} className="text-white" />}
                      {someChecked && <div className="w-2 h-2 bg-indigo-500 rounded-sm" />}
                    </div>
                    <span className="font-semibold text-gray-700 text-sm">{group.group}</span>
                  </button>
                  <span className="text-xs text-gray-400">
                    {checkedCount}/{groupKeys.length}
                  </span>
                </div>

                {/* Items do grupo */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {group.items.map(item => {
                    const checked = permissions.includes(item.key)
                    return (
                      <label
                        key={item.key}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition border ${
                          checked
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-800'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(item.key)}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${
                          checked ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                        }`}>
                          {checked && <FiCheck size={9} className="text-white" />}
                        </div>
                        <span className="text-xs font-medium leading-tight">{item.label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Botão salvar (bottom) */}
      <div className="flex justify-end pb-8">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl hover:bg-indigo-700 transition font-medium disabled:opacity-60"
        >
          {saved ? <FiCheck size={16} /> : <FiSave size={16} />}
          {saving ? 'Salvando...' : saved ? 'Permissões salvas!' : 'Salvar Permissões'}
        </button>
      </div>
    </div>
  )
}
