'use client'

import { useState } from 'react'
import {
  FiFileText,
  FiExternalLink,
  FiCheckCircle,
  FiAlertTriangle,
  FiLoader,
  FiMapPin,
  FiPackage,
  FiTruck,
  FiDownload,
  FiRefreshCw,
} from 'react-icons/fi'

interface ShopeeOrderActionsProps {
  orderId: string
  shopeeOrderId: string
  currentTrackingCode?: string | null
}

interface ShopeeAddress {
  name: string
  phone: string
  street: string
  city: string
  state: string
  zipCode: string
  country: string
}

// Fluxo de envio Shopee:
// 1. upload_invoice  → envia NF-e
// 2. init_shipment   → inicializa envio na transportadora
// 3. create_label    → cria etiqueta
// 4. download_label  → baixa PDF etiqueta
// 5. ship_order      → confirma envio → status SHIPPED

export default function ShopeeOrderActionsButton({
  orderId,
  shopeeOrderId,
  currentTrackingCode,
}: ShopeeOrderActionsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Formulários
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [invoiceKey, setInvoiceKey] = useState('')

  const [showShipForm, setShowShipForm] = useState(false)
  const [pickupType, setPickupType] = useState<'dropoff' | 'non_integrated'>('dropoff')
  const [trackingInput, setTrackingInput] = useState(currentTrackingCode || '')

  // Dados obtidos
  const [escrowAddress, setEscrowAddress] = useState<ShopeeAddress | null>(null)
  const [labelUrl, setLabelUrl] = useState<string | null>(null)
  const [trackingNumber, setTrackingNumber] = useState<string | null>(currentTrackingCode || null)

  const apiBase = `/api/admin/orders/${orderId}/shopee-actions`

  function resetMessages() {
    setErrorMsg(null)
    setSuccessMsg(null)
  }

  async function get(action: string) {
    resetMessages()
    setLoading(action)
    try {
      const res = await fetch(`${apiBase}?action=${action}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Erro')
      return data
    } catch (e: any) {
      setErrorMsg(e.message)
      return null
    } finally {
      setLoading(null)
    }
  }

  async function post(action: string, extra: Record<string, any> = {}) {
    resetMessages()
    setLoading(action)
    try {
      const res = await fetch(apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Erro')
      return data
    } catch (e: any) {
      setErrorMsg(e.message)
      return null
    } finally {
      setLoading(null)
    }
  }

  async function handleGetEscrow() {
    const data = await get('escrow')
    if (data) {
      setEscrowAddress(data.address)
      setSuccessMsg(data.saved ? 'Endereço real obtido e salvo no pedido!' : 'Endereço real obtido.')
    }
  }

  async function handleGetTracking() {
    const data = await get('tracking')
    if (data?.trackingNumber) {
      setTrackingNumber(data.trackingNumber)
      setSuccessMsg(`Rastreio: ${data.trackingNumber}`)
    } else if (data) {
      setSuccessMsg('Rastreio ainda não disponível.')
    }
  }

  async function handleUploadInvoice() {
    const data = await post('upload_invoice', { invoiceKey })
    if (data) {
      setSuccessMsg(data.message)
      setShowInvoiceForm(false)
      setInvoiceKey('')
    }
  }

  async function handleInitShipment() {
    const data = await post('init_shipment', {
      pickup_type: pickupType,
      tracking_number: trackingInput || undefined,
    })
    if (data) {
      setSuccessMsg(data.message)
      setShowShipForm(false)
    }
  }

  async function handleCreateLabel() {
    const data = await post('create_label')
    if (data) setSuccessMsg(data.message)
  }

  async function handleDownloadLabel() {
    const data = await post('download_label')
    if (data?.fileUrl) {
      setLabelUrl(data.fileUrl)
      setSuccessMsg('Etiqueta pronta para download!')
    } else if (data) {
      setSuccessMsg('Etiqueta ainda não está pronta. Aguarde e tente novamente.')
    }
  }

  async function handleShipOrder() {
    const data = await post('ship_order', {
      pickup_type: pickupType,
      tracking_number: trackingInput || undefined,
    })
    if (data) {
      setSuccessMsg(data.message)
      if (data.trackingNumber) setTrackingNumber(data.trackingNumber)
    }
  }

  const busy = loading !== null

  return (
    <div className="mt-6 bg-white rounded-lg shadow-md overflow-hidden border-l-4 border-orange-400">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-orange-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-xs">
            SH
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Ações Shopee</h2>
            <p className="text-xs text-gray-500 font-mono">{shopeeOrderId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {trackingNumber && (
            <span className="text-xs font-mono bg-white border border-gray-200 rounded px-2 py-1 text-blue-600">
              📦 {trackingNumber}
            </span>
          )}
          <a
            href={`https://seller.shopee.com.br/portal/sale/order/${shopeeOrderId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-orange-700 border border-orange-300 rounded-lg hover:bg-orange-100 transition"
          >
            <FiExternalLink size={13} />
            Shopee
          </a>
        </div>
      </div>

      <div className="px-6 py-4 space-y-4">

        {/* Feedback */}
        {errorMsg && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <FiAlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            <FiCheckCircle size={15} className="mt-0.5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Endereço real */}
        {escrowAddress && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm space-y-0.5">
            <p className="font-semibold text-blue-800 flex items-center gap-1 mb-1">
              <FiMapPin size={13} /> Endereço real do comprador
            </p>
            <p className="text-gray-800 font-medium">{escrowAddress.name}</p>
            <p className="text-gray-600">{escrowAddress.street}</p>
            <p className="text-gray-600">{escrowAddress.city} / {escrowAddress.state} — CEP {escrowAddress.zipCode}</p>
            {escrowAddress.phone && <p className="text-gray-500 text-xs">Tel: {escrowAddress.phone}</p>}
          </div>
        )}

        {/* Label download */}
        {labelUrl && (
          <a
            href={labelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition w-fit"
          >
            <FiDownload size={14} />
            Baixar Etiqueta PDF
          </a>
        )}

        {/* Botões principais — fluxo sequencial */}
        <div className="border-t pt-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Fluxo de envio</p>
          <div className="flex flex-wrap gap-2">

            {/* 0. Endereço real */}
            <button onClick={handleGetEscrow} disabled={busy}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition disabled:opacity-50">
              {loading === 'escrow' ? <FiLoader size={13} className="animate-spin" /> : <FiMapPin size={13} />}
              Endereço Real
            </button>

            {/* 1. NF-e */}
            <button onClick={() => setShowInvoiceForm(!showInvoiceForm)} disabled={busy}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50">
              {loading === 'upload_invoice' ? <FiLoader size={13} className="animate-spin" /> : <FiFileText size={13} />}
              1. Enviar NF-e
            </button>

            {/* 2. Init shipment */}
            <button onClick={() => setShowShipForm(!showShipForm)} disabled={busy}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">
              {loading === 'init_shipment' ? <FiLoader size={13} className="animate-spin" /> : <FiPackage size={13} />}
              2. Inicializar Envio
            </button>

            {/* 3. Criar etiqueta */}
            <button onClick={handleCreateLabel} disabled={busy}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50">
              {loading === 'create_label' ? <FiLoader size={13} className="animate-spin" /> : <FiFileText size={13} />}
              3. Criar Etiqueta
            </button>

            {/* 4. Baixar etiqueta */}
            <button onClick={handleDownloadLabel} disabled={busy}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition disabled:opacity-50">
              {loading === 'download_label' ? <FiLoader size={13} className="animate-spin" /> : <FiDownload size={13} />}
              4. Baixar Etiqueta
            </button>

            {/* 5. Confirmar envio */}
            <button onClick={handleShipOrder} disabled={busy}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50">
              {loading === 'ship_order' ? <FiLoader size={13} className="animate-spin" /> : <FiTruck size={13} />}
              5. Confirmar Envio
            </button>

            {/* Rastreio */}
            <button onClick={handleGetTracking} disabled={busy}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-white text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50">
              {loading === 'tracking' ? <FiLoader size={13} className="animate-spin" /> : <FiRefreshCw size={13} />}
              Rastreio
            </button>
          </div>
        </div>

        {/* Formulário NF-e */}
        {showInvoiceForm && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-3">
            <p className="text-sm font-semibold text-orange-800">📄 Chave de Acesso NF-e</p>
            <input
              type="text"
              value={invoiceKey}
              onChange={(e) => setInvoiceKey(e.target.value.replace(/\D/g, '').slice(0, 44))}
              placeholder="44 dígitos numéricos"
              maxLength={44}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <p className="text-xs text-gray-400">{invoiceKey.length}/44</p>
            <div className="flex gap-2">
              <button
                onClick={handleUploadInvoice}
                disabled={invoiceKey.length !== 44 || busy}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-60">
                {loading === 'upload_invoice' ? <FiLoader size={13} className="animate-spin" /> : <FiCheckCircle size={13} />}
                Enviar à Shopee
              </button>
              <button onClick={() => { setShowInvoiceForm(false); setInvoiceKey('') }}
                className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Formulário init / ship */}
        {showShipForm && (
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg space-y-3">
            <p className="text-sm font-semibold text-indigo-800">📦 Configurar Envio</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de envio</label>
                <select
                  value={pickupType}
                  onChange={(e) => setPickupType(e.target.value as any)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="dropoff">Drop-off (entrega na agência)</option>
                  <option value="non_integrated">Não integrado (rastreio manual)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Código de rastreio {pickupType === 'non_integrated' ? '*' : '(opcional)'}
                </label>
                <input
                  type="text"
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                  placeholder="Ex: BR123456789BR"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleInitShipment}
                disabled={busy}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-60">
                {loading === 'init_shipment' ? <FiLoader size={13} className="animate-spin" /> : <FiCheckCircle size={13} />}
                Confirmar
              </button>
              <button onClick={() => setShowShipForm(false)}
                className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">
                Cancelar
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
