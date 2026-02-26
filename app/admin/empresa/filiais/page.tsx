'use client'

import { useState, useEffect, useCallback } from 'react'
import { FiPlus, FiEdit2, FiTrash2, FiMapPin, FiStar, FiAlertCircle, FiChevronRight } from 'react-icons/fi'

const UF_LIST = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
]

const EMPTY_FORM = {
  code: '', name: '', cnpj: '', ie: '', im: '',
  street: '', number: '', complement: '', neighborhood: '', city: '', cityCode: '', state: '', zipCode: '',
  phone: '', email: '',
  statesServed: [] as string[],
  isDefault: false,
}

type Branch = typeof EMPTY_FORM & { id: string; isActive: boolean; createdAt: string }

function formatCNPJ(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    .replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d*)$/, '$1.$2.$3/$4-$5')
    .replace(/^(\d{2})(\d{3})(\d{3})(\d*)$/, '$1.$2.$3/$4')
    .replace(/^(\d{2})(\d{3})(\d*)$/, '$1.$2.$3')
    .replace(/^(\d{2})(\d*)$/, '$1.$2')
}

function formatZip(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.replace(/^(\d{5})(\d*)$/, '$1-$2')
}

export default function FiliaisPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Branch | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/admin/company-branches')
    if (r.ok) setBranches(await r.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openNew() {
    setForm({ ...EMPTY_FORM })
    setIsEditing(false)
    setSelected(null)
    setError('')
    setShowForm(true)
  }

  function openEdit(b: Branch) {
    setForm({
      code: b.code, name: b.name, cnpj: b.cnpj, ie: b.ie || '', im: b.im || '',
      street: b.street, number: b.number, complement: b.complement || '',
      neighborhood: b.neighborhood, city: b.city, cityCode: (b as any).cityCode || '', state: b.state, zipCode: b.zipCode,
      phone: b.phone || '', email: b.email || '',
      statesServed: (b.statesServed as string[]) || [],
      isDefault: b.isDefault,
    })
    setIsEditing(true)
    setSelected(b)
    setError('')
    setShowForm(true)
  }

  function toggleUF(uf: string) {
    setForm(f => ({
      ...f,
      statesServed: f.statesServed.includes(uf)
        ? f.statesServed.filter(u => u !== uf)
        : [...f.statesServed, uf],
    }))
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const url = isEditing ? `/api/admin/company-branches/${selected!.id}` : '/api/admin/company-branches'
      const method = isEditing ? 'PATCH' : 'POST'
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, statesServed: form.statesServed }),
      })
      const data = await r.json()
      if (!r.ok) { setError(data.error || 'Erro ao salvar'); return }
      setShowForm(false)
      load()
    } catch {
      setError('Erro de rede')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(b: Branch) {
    if (!confirm(`Desativar a filial "${b.name}"?`)) return
    await fetch(`/api/admin/company-branches/${b.id}`, { method: 'DELETE' })
    load()
  }

  async function handleSetDefault(b: Branch) {
    await fetch(`/api/admin/company-branches/${b.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDefault: true }),
    })
    load()
  }

  async function handleReactivate(b: Branch) {
    await fetch(`/api/admin/company-branches/${b.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: true }),
    })
    load()
  }

  const visible = branches.filter(b => showInactive || b.isActive)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
        <span>Empresa</span>
        <FiChevronRight className="text-xs" />
        <span className="text-gray-800 font-medium">Filiais / Galpões</span>
      </div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Filiais &amp; Galpões</h1>
          <p className="text-sm text-gray-500 mt-1">
            Cadastre as filiais da empresa com endereço fiscal e CNPJ. Pedidos são atribuídos automaticamente pela UF do comprador.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowInactive(v => !v)}
            className="px-3 py-2 text-sm border rounded-md text-gray-600 hover:bg-gray-50"
          >
            {showInactive ? 'Ocultar inativas' : 'Ver inativas'}
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium"
          >
            <FiPlus /> Nova Filial
          </button>
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : visible.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl py-16 text-center">
          <FiMapPin className="mx-auto text-4xl text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma filial cadastrada</p>
          <p className="text-sm text-gray-400 mt-1">Clique em &quot;Nova Filial&quot; para começar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map(b => (
            <div
              key={b.id}
              className={`border rounded-xl p-5 ${b.isActive ? 'bg-white' : 'bg-gray-50 opacity-60'}`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">{b.code}</span>
                    {b.isDefault && (
                      <span className="flex items-center gap-1 text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded">
                        <FiStar className="text-xs" /> Padrão
                      </span>
                    )}
                    {!b.isActive && (
                      <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded">Inativa</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 mt-1">{b.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">CNPJ: {b.cnpj}</p>
                </div>
              </div>

              <div className="text-xs text-gray-600 space-y-0.5 mb-3">
                <p>{b.street}, {b.number}{b.complement ? ` — ${b.complement}` : ''}</p>
                <p>{b.neighborhood} — {b.city}/{b.state}</p>
                <p>CEP: {b.zipCode}</p>
              </div>

              {/* UFs atendidas */}
              {b.statesServed && (b.statesServed as string[]).length > 0 ? (
                <div className="flex flex-wrap gap-1 mb-3">
                  {(b.statesServed as string[]).map(uf => (
                    <span key={uf} className="text-xs bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded">
                      {uf}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic mb-3">Sem UFs atribuídas</p>
              )}

              <div className="flex gap-2 pt-3 border-t">
                <button onClick={() => openEdit(b)} className="flex items-center gap-1 text-xs text-gray-600 hover:text-primary-600">
                  <FiEdit2 /> Editar
                </button>
                {!b.isDefault && b.isActive && (
                  <button onClick={() => handleSetDefault(b)} className="flex items-center gap-1 text-xs text-gray-600 hover:text-yellow-600">
                    <FiStar /> Tornar padrão
                  </button>
                )}
                {b.isActive && !b.isDefault && (
                  <button onClick={() => handleDeactivate(b)} className="flex items-center gap-1 text-xs text-gray-600 hover:text-red-600 ml-auto">
                    <FiTrash2 /> Desativar
                  </button>
                )}
                {!b.isActive && (
                  <button onClick={() => handleReactivate(b)} className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 ml-auto">
                    Reativar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-2xl my-8 shadow-xl">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{isEditing ? 'Editar Filial' : 'Nova Filial'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
            </div>

            <div className="p-6 space-y-5">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">
                  <FiAlertCircle /> {error}
                </div>
              )}

              {/* Identificação */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Identificação</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Código (warehouseCode) *</label>
                    <input
                      value={form.code}
                      onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                      placeholder="ex: SP01"
                      className="w-full border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Nome da Filial *</label>
                    <input
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="ex: Centro de Distribuição SP"
                      className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">CNPJ da Filial *</label>
                    <input
                      value={form.cnpj}
                      onChange={e => setForm(f => ({ ...f, cnpj: formatCNPJ(e.target.value) }))}
                      placeholder="00.000.000/0000-00"
                      className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Inscrição Estadual</label>
                    <input
                      value={form.ie}
                      onChange={e => setForm(f => ({ ...f, ie: e.target.value }))}
                      placeholder="IE"
                      className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Inscrição Municipal</label>
                    <input
                      value={form.im}
                      onChange={e => setForm(f => ({ ...f, im: e.target.value }))}
                      placeholder="IM"
                      className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Telefone</label>
                    <input
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="(11) 00000-0000"
                      className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">E-mail</label>
                    <input
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="filial@empresa.com.br"
                      className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              {/* Endereço fiscal */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Endereço Fiscal</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Logradouro *</label>
                    <input
                      value={form.street}
                      onChange={e => setForm(f => ({ ...f, street: e.target.value }))}
                      placeholder="Rua / Av."
                      className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Número *</label>
                    <input
                      value={form.number}
                      onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                      placeholder="123"
                      className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Complemento</label>
                    <input
                      value={form.complement}
                      onChange={e => setForm(f => ({ ...f, complement: e.target.value }))}
                      placeholder="Sala, Bloco..."
                      className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Bairro *</label>
                    <input
                      value={form.neighborhood}
                      onChange={e => setForm(f => ({ ...f, neighborhood: e.target.value }))}
                      className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Cidade *</label>
                    <input
                      value={form.city}
                      onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                      className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Código IBGE *</label>
                    <input
                      value={(form as any).cityCode || ''}
                      onChange={e => setForm(f => ({ ...f, cityCode: e.target.value.replace(/\D/g, '').slice(0, 7) }))}
                      placeholder="ex: 3550308"
                      maxLength={7}
                      className="w-full border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <p className="text-xs text-gray-400 mt-0.5">7 dígitos — obrigatório para NF-e</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">UF *</label>
                    <select
                      value={form.state}
                      onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                      className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">--</option>
                      {UF_LIST.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">CEP *</label>
                    <input
                      value={form.zipCode}
                      onChange={e => setForm(f => ({ ...f, zipCode: formatZip(e.target.value) }))}
                      placeholder="00000-000"
                      className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              {/* UFs atendidas */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1 uppercase tracking-wide">UFs Atendidas</h3>
                <p className="text-xs text-gray-400 mb-3">
                  Pedidos cujo endereço de entrega for de uma dessas UFs serão atribuídos a esta filial automaticamente.
                </p>
                <div className="grid grid-cols-9 gap-1.5">
                  {UF_LIST.map(uf => (
                    <button
                      key={uf}
                      type="button"
                      onClick={() => toggleUF(uf)}
                      className={`py-1.5 text-xs rounded font-medium border transition-colors ${
                        form.statesServed.includes(uf)
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-primary-400'
                      }`}
                    >
                      {uf}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filial padrão */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))}
                  className="w-4 h-4 accent-primary-600"
                />
                <span className="text-sm text-gray-700">
                  Definir como filial padrão (fallback quando nenhuma UF bater)
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 font-medium"
              >
                {saving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Criar filial'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
