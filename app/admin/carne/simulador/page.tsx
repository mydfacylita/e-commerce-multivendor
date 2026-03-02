'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiArrowLeft,
  FiDollarSign,
  FiPercent,
  FiCalendar,
  FiRefreshCw,
  FiDownload,
  FiCopy,
  FiCheck,
  FiTrendingUp,
  FiInfo,
  FiPrinter,
} from 'react-icons/fi';

// ─── Types ────────────────────────────────────────────────────────────────────

type Sistema = 'price' | 'sac';

interface ParcelaSimulada {
  numero: number;
  vencimento: Date;
  prestacao: number;
  juros: number;
  amortizacao: number;
  saldoDevedor: number;
}

interface Simulacao {
  valorFinanciado: number;
  totalPago: number;
  totalJuros: number;
  cet: number;
  parcelas: ParcelaSimulada[];
}

interface OpcaoComparativa {
  n: number;
  valorParcela: number;
  totalPago: number;
  totalJuros: number;
  percentualJuros: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtPct = (v: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) + '%';

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function calcPrice(pv: number, i: number, n: number): ParcelaSimulada[] {
  if (n === 0 || pv === 0) return [];
  const pmt = i === 0 ? pv / n : (pv * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
  const rows: ParcelaSimulada[] = [];
  let saldo = pv;
  const hoje = new Date();
  hoje.setDate(1);
  for (let k = 1; k <= n; k++) {
    const juros = saldo * i;
    const amort = pmt - juros;
    saldo = Math.max(0, saldo - amort);
    rows.push({
      numero: k,
      vencimento: addMonths(hoje, k),
      prestacao: pmt,
      juros,
      amortizacao: amort,
      saldoDevedor: saldo,
    });
  }
  return rows;
}

function calcSAC(pv: number, i: number, n: number): ParcelaSimulada[] {
  if (n === 0 || pv === 0) return [];
  const amortConst = pv / n;
  const rows: ParcelaSimulada[] = [];
  let saldo = pv;
  const hoje = new Date();
  hoje.setDate(1);
  for (let k = 1; k <= n; k++) {
    const juros = saldo * i;
    const pmt = amortConst + juros;
    saldo = Math.max(0, saldo - amortConst);
    rows.push({
      numero: k,
      vencimento: addMonths(hoje, k),
      prestacao: pmt,
      juros,
      amortizacao: amortConst,
      saldoDevedor: saldo,
    });
  }
  return rows;
}

function calcCET(pv: number, n: number, pmt: number): number {
  // Aproximação numérica (Newton-Raphson) para a taxa mensal efetiva
  let i = 0.01;
  for (let iter = 0; iter < 200; iter++) {
    const f = pmt * ((1 - Math.pow(1 + i, -n)) / i) - pv;
    const df = pmt * (Math.pow(1 + i, -n) * n / (i * (1 + i)) - (1 - Math.pow(1 + i, -n)) / (i * i));
    const iNext = i - f / df;
    if (Math.abs(iNext - i) < 1e-10) break;
    i = Math.abs(iNext) < 0.0001 ? 0.0001 : iNext;
  }
  return (Math.pow(1 + i, 12) - 1) * 100;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SimuladorPage() {
  const router = useRouter();

  // Inputs
  const [valorBem, setValorBem] = useState('');
  const [entrada, setEntrada] = useState('');
  const [taxaMensal, setTaxaMensal] = useState('');
  const [parcelas, setParcelas] = useState(12);
  const [sistema, setSistema] = useState<Sistema>('price');
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [copiedRow, setCopiedRow] = useState<number | null>(null);

  // Load default interest rate
  useEffect(() => {
    fetch('/api/admin/config?prefix=financing')
      .then((r) => r.json())
      .then((data) => {
        const rate = data?.find?.((c: { key: string; value: string }) => c.key === 'financing.interestRate')?.value;
        if (rate) setTaxaMensal(String(parseFloat(rate)));
      })
      .catch(() => {})
      .finally(() => setLoadingConfig(false));
  }, []);

  const pv = useMemo(() => {
    const bem = parseFloat(valorBem.replace(',', '.')) || 0;
    const ent = parseFloat(entrada.replace(',', '.')) || 0;
    return Math.max(0, bem - ent);
  }, [valorBem, entrada]);

  const iMensal = useMemo(() => {
    const t = parseFloat(taxaMensal.replace(',', '.')) || 0;
    return t / 100;
  }, [taxaMensal]);

  const simulacao = useMemo<Simulacao | null>(() => {
    if (pv <= 0 || parcelas < 1) return null;
    const rows = sistema === 'price' ? calcPrice(pv, iMensal, parcelas) : calcSAC(pv, iMensal, parcelas);
    if (rows.length === 0) return null;
    const totalPago = rows.reduce((a, r) => a + r.prestacao, 0);
    const totalJuros = totalPago - pv;
    const primeiraP = rows[0].prestacao;
    const cet = iMensal > 0 ? calcCET(pv, parcelas, primeiraP) : 0;
    return { valorFinanciado: pv, totalPago, totalJuros, cet, parcelas: rows };
  }, [pv, iMensal, parcelas, sistema]);

  const comparativo = useMemo<OpcaoComparativa[]>(() => {
    if (pv <= 0) return [];
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map((n) => {
      const rows = sistema === 'price' ? calcPrice(pv, iMensal, n) : calcSAC(pv, iMensal, n);
      const totalPago = rows.reduce((a, r) => a + r.prestacao, 0);
      const totalJuros = totalPago - pv;
      return {
        n,
        valorParcela: rows[0]?.prestacao ?? 0,
        totalPago,
        totalJuros,
        percentualJuros: pv > 0 ? (totalJuros / pv) * 100 : 0,
      };
    });
  }, [pv, iMensal, sistema]);

  const handleCopy = useCallback(
    (row: ParcelaSimulada, idx: number) => {
      const text = `Parcela ${row.numero} – Venc: ${row.vencimento.toLocaleDateString('pt-BR')} – ${fmt(row.prestacao)}`;
      navigator.clipboard.writeText(text).catch(() => {});
      setCopiedRow(idx);
      setTimeout(() => setCopiedRow(null), 1500);
    },
    []
  );

  const handleReset = () => {
    setValorBem('');
    setEntrada('');
    setParcelas(12);
    setSistema('price');
  };

  const handlePrint = useCallback(() => {
    if (!simulacao) return;
    const dataHora = new Date().toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    const bem = parseFloat(valorBem.replace(',', '.')) || 0;
    const ent = parseFloat(entrada.replace(',', '.')) || 0;
    const taxaAnual = (Math.pow(1 + iMensal, 12) - 1) * 100;
    const principalPct = ((simulacao.valorFinanciado / simulacao.totalPago) * 100).toFixed(1);
    const jurosPct = ((simulacao.totalJuros / simulacao.totalPago) * 100).toFixed(1);

    const linhasTabela = simulacao.parcelas.map((p, i) => {
      const bg = i % 2 === 0 ? '#ffffff' : '#f9fafb';
      return `<tr style="background:${bg}">
        <td style="padding:7px 10px;text-align:center;font-weight:600;color:#374151">${p.numero}</td>
        <td style="padding:7px 10px;text-align:center;color:#374151">${p.vencimento.toLocaleDateString('pt-BR')}</td>
        <td style="padding:7px 10px;text-align:right;font-weight:700;color:#111827">${fmt(p.prestacao)}</td>
        <td style="padding:7px 10px;text-align:right;color:#059669">${fmt(p.amortizacao)}</td>
        <td style="padding:7px 10px;text-align:right;color:#d97706">${fmt(p.juros)}</td>
        <td style="padding:7px 10px;text-align:right;color:#6b7280">${fmt(p.saldoDevedor)}</td>
      </tr>`;
    }).join('');

    const logoSvg = `<svg width="200" height="54" viewBox="0 0 260 70" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bagGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2563EB;stop-opacity:1" />
    </linearGradient>
  </defs>
  <g filter="url(#shadow)">
    <path d="M18 22 L15 49 C15 51.5 16 53 18 53 L34 53 C36 53 37 51.5 37 49 L34 22 Z" fill="url(#bagGrad)" stroke="#2563EB" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M19 22 C19 16 22.5 13 26 13 C29.5 13 33 16 33 22" stroke="#F97316" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <circle cx="23" cy="33" r="2.5" fill="white"/>
    <circle cx="29" cy="33" r="2.5" fill="white"/>
    <path d="M22 40 Q26 44 30 40" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
  </g>
  <text x="50" y="44" font-family="Arial, sans-serif" font-size="40" font-weight="900" letter-spacing="-1.5">
    <tspan fill="#F97316">MYD</tspan><tspan fill="#3B82F6">SHOP</tspan>
  </text>
  <text x="50" y="59" font-family="Arial, sans-serif" font-size="9" font-weight="600" fill="#6B7280" letter-spacing="2.5">MARKETPLACE ONLINE</text>
</svg>`;

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Simulação de Financiamento – MydShop</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #111; background: #fff; }
    @page { size: A4 portrait; margin: 15mm 15mm 20mm 15mm; }
    @media print { .no-print { display: none !important; } }

    /* ── Header ── */
    .page-header { display: flex; align-items: center; justify-content: space-between;
      padding-bottom: 14px; border-bottom: 3px solid #2563EB; margin-bottom: 18px; }
    .page-header .logo { display: flex; align-items: center; }
    .page-header .doc-info { text-align: right; }
    .page-header .doc-info .title { font-size: 18px; font-weight: 800; color: #1e40af; letter-spacing: -0.5px; }
    .page-header .doc-info .subtitle { font-size: 10px; color: #6b7280; margin-top: 2px; }

    /* ── Sections ── */
    .section { margin-bottom: 16px; }
    .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 1px; color: #2563EB; border-left: 3px solid #2563EB;
      padding-left: 8px; margin-bottom: 10px; }

    /* ── Cards grid ── */
    .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
      padding: 10px 12px; }
    .card.highlight { background: #eff6ff; border-color: #93c5fd; }
    .card.warn { background: #fffbeb; border-color: #fcd34d; }
    .card .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px;
      color: #6b7280; font-weight: 600; margin-bottom: 4px; }
    .card .value { font-size: 16px; font-weight: 800; color: #111827; }
    .card.highlight .value { color: #1d4ed8; }
    .card.warn .value { color: #b45309; }
    .card .sub { font-size: 9px; color: #9ca3af; margin-top: 2px; }

    /* ── Params row ── */
    .params { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 16px; }
    .param { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; }
    .param .plabel { font-size: 8px; text-transform: uppercase; color: #9ca3af; font-weight: 600; margin-bottom: 3px; letter-spacing: 0.5px; }
    .param .pvalue { font-size: 12px; font-weight: 700; color: #374151; }

    /* ── Progress bar ── */
    .prog-wrap { margin-bottom: 16px; }
    .prog-labels { display: flex; justify-content: space-between; font-size: 9px; color: #6b7280; margin-bottom: 4px; }
    .prog-bar { height: 10px; display: flex; border-radius: 20px; overflow: hidden; }
    .prog-principal { background: #10b981; }
    .prog-juros { background: #f59e0b; }
    .prog-legend { display: flex; gap: 16px; margin-top: 5px; }
    .prog-legend span { font-size: 9px; display: flex; align-items: center; gap: 4px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }

    /* ── Table ── */
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    thead tr { background: #1e40af; color: white; }
    thead th { padding: 8px 10px; text-align: left; font-size: 9px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.8px; }
    thead th.r { text-align: right; }
    tfoot tr { background: #dbeafe; }
    tfoot td { padding: 8px 10px; font-weight: 700; font-size: 11px; color: #1e3a8a; border-top: 2px solid #93c5fd; }
    tfoot td.r { text-align: right; }
    td.r { text-align: right; }
    td.c { text-align: center; }
    tbody tr td { border-bottom: 1px solid #f1f5f9; }

    /* ── Badge ── */
    .badge { display: inline-block; padding: 2px 8px; border-radius: 20px;
      font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .badge-blue { background: #dbeafe; color: #1d4ed8; }
    .badge-orange { background: #ffedd5; color: #c2410c; }

    /* ── Footer ── */
    .page-footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid #e5e7eb;
      display: flex; justify-content: space-between; align-items: center; }
    .page-footer .disclaimer { font-size: 8px; color: #9ca3af; max-width: 420px; line-height: 1.5; }
    .page-footer .stamp { font-size: 9px; color: #6b7280; text-align: right; }

    /* ── Print button ── */
    .print-btn { no-print; display:flex; align-items:center; gap:8px;
      background:#2563EB; color:white; border:none; padding:10px 22px;
      border-radius:8px; font-size:13px; font-weight:600; cursor:pointer;
      margin: 0 auto 20px; }
    .print-btn:hover { background:#1d4ed8; }
    .btn-bar { text-align:center; margin-bottom:20px; }
  </style>
</head>
<body>
  <div class="btn-bar no-print">
    <button class="print-btn" onclick="window.print()">
      🖨️ &nbsp;Imprimir / Salvar PDF
    </button>
  </div>

  <!-- Page Header -->
  <div class="page-header">
    <div class="logo">${logoSvg}</div>
    <div class="doc-info">
      <div class="title">Simulação de Financiamento</div>
      <div class="subtitle">Gerado em ${dataHora}</div>
      <div style="margin-top:6px">
        <span class="badge badge-blue">${sistema === 'price' ? 'Tabela Price' : 'SAC'}</span>
      </div>
    </div>
  </div>

  <!-- Parâmetros -->
  <div class="section">
    <div class="section-title">Parâmetros da Simulação</div>
    <div class="params">
      <div class="param"><div class="plabel">Valor do Bem</div><div class="pvalue">${fmt(bem)}</div></div>
      <div class="param"><div class="plabel">Entrada</div><div class="pvalue">${fmt(ent)}${ent > 0 ? ` <span style="font-size:9px;color:#9ca3af">(${((ent/bem)*100).toFixed(1)}%)</span>` : ''}</div></div>
      <div class="param"><div class="plabel">Valor Financiado</div><div class="pvalue">${fmt(simulacao.valorFinanciado)}</div></div>
      <div class="param"><div class="plabel">Taxa Mensal</div><div class="pvalue">${fmtPct(iMensal * 100)}</div></div>
      <div class="param"><div class="plabel">Taxa Anual</div><div class="pvalue">${fmtPct(taxaAnual)}</div></div>
    </div>
  </div>

  <!-- Resumo -->
  <div class="section">
    <div class="section-title">Resumo Financeiro</div>
    <div class="cards">
      <div class="card highlight">
        <div class="label">${parcelas}x de</div>
        <div class="value">${fmt(simulacao.parcelas[0].prestacao)}</div>
        ${sistema === 'sac' ? `<div class="sub">Última: ${fmt(simulacao.parcelas[simulacao.parcelas.length - 1].prestacao)}</div>` : ''}
      </div>
      <div class="card">
        <div class="label">Total Pago</div>
        <div class="value">${fmt(simulacao.totalPago)}</div>
        <div class="sub">${parcelas} parcelas</div>
      </div>
      <div class="card warn">
        <div class="label">Total de Juros</div>
        <div class="value">${fmt(simulacao.totalJuros)}</div>
        <div class="sub">+${((simulacao.totalJuros / simulacao.valorFinanciado) * 100).toFixed(2)}% sobre o principal</div>
      </div>
      ${simulacao.cet > 0 ? `<div class="card"><div class="label">CET Estimado a.a.</div><div class="value">${fmtPct(simulacao.cet)}</div><div class="sub">Custo efetivo total</div></div>` : ''}
      <div class="card">
        <div class="label">Principal</div>
        <div class="value" style="color:#059669">${fmt(simulacao.valorFinanciado)}</div>
        <div class="sub">${principalPct}% do total pago</div>
      </div>
      <div class="card">
        <div class="label">Encargos</div>
        <div class="value" style="color:#d97706">${fmt(simulacao.totalJuros)}</div>
        <div class="sub">${jurosPct}% do total pago</div>
      </div>
    </div>

    <!-- Barra de composição -->
    <div class="prog-wrap">
      <div class="prog-labels"><span>◼ Principal</span><span>◼ Juros / Encargos</span></div>
      <div class="prog-bar">
        <div class="prog-principal" style="width:${principalPct}%"></div>
        <div class="prog-juros" style="width:${jurosPct}%"></div>
      </div>
      <div class="prog-legend">
        <span><span class="dot" style="background:#10b981"></span> Principal: ${principalPct}%</span>
        <span><span class="dot" style="background:#f59e0b"></span> Juros: ${jurosPct}%</span>
      </div>
    </div>
  </div>

  <!-- Tabela de amortização -->
  <div class="section">
    <div class="section-title">Tabela de Amortização — ${sistema === 'price' ? 'Tabela Price' : 'Sistema SAC'}</div>
    <table>
      <thead>
        <tr>
          <th class="c">#</th>
          <th>Vencimento</th>
          <th class="r">Prestação</th>
          <th class="r">Amortização</th>
          <th class="r">Juros</th>
          <th class="r">Saldo Devedor</th>
        </tr>
      </thead>
      <tbody>${linhasTabela}</tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding:8px 10px;font-weight:700">TOTAL</td>
          <td class="r">${fmt(simulacao.totalPago)}</td>
          <td class="r" style="color:#059669">${fmt(simulacao.valorFinanciado)}</td>
          <td class="r" style="color:#d97706">${fmt(simulacao.totalJuros)}</td>
          <td class="r">—</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- Rodapé -->
  <div class="page-footer">
    <div class="disclaimer">
      ⚠️ Esta simulação é meramente informativa e não constitui proposta de crédito.
      Valores sujeitos a alteração conforme condições de mercado e análise de crédito.
      Gerado pelo sistema MydShop.
    </div>
    <div class="stamp">
      <strong>MydShop</strong> — marketplace.mydshop.com.br<br/>
      ${dataHora}
    </div>
  </div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(html);
    win.document.close();
  }, [simulacao, valorBem, entrada, parcelas, sistema, iMensal]);

  // ─── Render ────────────────────────────────────────────────────────────────

  const entradaNum = parseFloat(entrada.replace(',', '.')) || 0;
  const valorBemNum = parseFloat(valorBem.replace(',', '.')) || 0;
  const entradaPct = valorBemNum > 0 ? (entradaNum / valorBemNum) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link
            href="/admin/carne"
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <FiArrowLeft className="text-xl" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Simulador de Financiamento</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Simule financiamentos no sistema de carnê antes de emitir
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {simulacao && (
            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
            >
              <FiPrinter className="text-base" />
              <span>Imprimir / PDF</span>
            </button>
          )}
          <button
            onClick={handleReset}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FiRefreshCw className="text-base" />
            <span>Limpar</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Inputs panel ──────────────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-primary-600 to-primary-500">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wide">
                Parâmetros
              </h2>
            </div>
            <div className="p-6 space-y-5">
              {/* Valor do bem */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor do bem / crédito
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={valorBem}
                    onChange={(e) => setValorBem(e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  />
                </div>
              </div>

              {/* Entrada */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entrada{' '}
                  {entradaPct > 0 && (
                    <span className="text-primary-600 font-semibold">({entradaPct.toFixed(1)}%)</span>
                  )}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={entrada}
                    onChange={(e) => setEntrada(e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  />
                </div>
                {pv > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Valor financiado: <span className="font-semibold text-gray-700">{fmt(pv)}</span>
                  </p>
                )}
              </div>

              {/* Taxa mensal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Taxa de juros mensal (%)
                </label>
                <div className="relative">
                  <FiPercent className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={taxaMensal}
                    onChange={(e) => setTaxaMensal(e.target.value)}
                    placeholder={loadingConfig ? 'Carregando...' : '0,00'}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  />
                </div>
                {iMensal > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Equivalente a{' '}
                    <span className="font-semibold text-gray-700">
                      {fmtPct((Math.pow(1 + iMensal, 12) - 1) * 100)}
                    </span>{' '}
                    a.a.
                  </p>
                )}
              </div>

              {/* Número de parcelas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de parcelas: <span className="text-primary-600 font-semibold">{parcelas}x</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={24}
                  value={parcelas}
                  onChange={(e) => setParcelas(Number(e.target.value))}
                  className="w-full accent-primary-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1x</span>
                  <span>6x</span>
                  <span>12x</span>
                  <span>18x</span>
                  <span>24x</span>
                </div>
              </div>

              {/* Sistema de amortização */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sistema de amortização
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['price', 'sac'] as Sistema[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSistema(s)}
                      className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                        sistema === s
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {s === 'price' ? 'Tabela Price' : 'SAC'}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2 flex items-start space-x-1">
                  <FiInfo className="mt-0.5 shrink-0" />
                  <span>
                    {sistema === 'price'
                      ? 'Prestações fixas. Mais usado em carnês.'
                      : 'Amortização constante, juros decrescentes. Parcelas maiores no início.'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* ── Resumo rápido ─────────────────────────────────────── */}
          {simulacao && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-emerald-500">
                <h2 className="text-sm font-semibold text-white uppercase tracking-wide">
                  Resumo
                </h2>
              </div>
              <div className="p-6 space-y-3">
                <Row label="Valor financiado" value={fmt(simulacao.valorFinanciado)} />
                <Row
                  label={`${parcelas}x de`}
                  value={fmt(simulacao.parcelas[0].prestacao)}
                  highlight
                />
                {sistema === 'sac' && (
                  <Row
                    label={`Última parcela`}
                    value={fmt(simulacao.parcelas[simulacao.parcelas.length - 1].prestacao)}
                  />
                )}
                <div className="border-t border-gray-100 pt-3">
                  <Row label="Total pago" value={fmt(simulacao.totalPago)} />
                  <Row
                    label="Total de juros"
                    value={fmt(simulacao.totalJuros)}
                    sub={`+${((simulacao.totalJuros / simulacao.valorFinanciado) * 100).toFixed(2)}%`}
                    warn={simulacao.totalJuros > simulacao.valorFinanciado * 0.3}
                  />
                  {simulacao.cet > 0 && (
                    <Row label="CET estimado a.a." value={fmtPct(simulacao.cet)} />
                  )}
                </div>

                {/* Principal vs Juros bar */}
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Principal</span>
                    <span>Juros</span>
                  </div>
                  <div className="h-3 flex rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 transition-all"
                      style={{
                        width: `${(simulacao.valorFinanciado / simulacao.totalPago) * 100}%`,
                      }}
                    />
                    <div className="bg-amber-400 flex-1" />
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-emerald-600 font-medium">
                      {((simulacao.valorFinanciado / simulacao.totalPago) * 100).toFixed(1)}%
                    </span>
                    <span className="text-amber-600 font-medium">
                      {((simulacao.totalJuros / simulacao.totalPago) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right panel ───────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabela de amortização */}
          {simulacao ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-800">
                  Tabela de Amortização — {sistema === 'price' ? 'Tabela Price' : 'SAC'}
                </h2>
                <span className="text-xs text-gray-400">{parcelas} parcelas</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                      <th className="px-4 py-3 font-medium">#</th>
                      <th className="px-4 py-3 font-medium">Vencimento</th>
                      <th className="px-4 py-3 font-medium text-right">Prestação</th>
                      <th className="px-4 py-3 font-medium text-right">Amort.</th>
                      <th className="px-4 py-3 font-medium text-right">Juros</th>
                      <th className="px-4 py-3 font-medium text-right">Saldo</th>
                      <th className="px-2 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {simulacao.parcelas.map((p, idx) => (
                      <tr
                        key={p.numero}
                        className={`border-t border-gray-50 hover:bg-gray-50 transition-colors ${
                          idx === 0 ? 'bg-primary-50/30' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-700">{p.numero}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {p.vencimento.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit', day: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">
                          {fmt(p.prestacao)}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-600">{fmt(p.amortizacao)}</td>
                        <td className="px-4 py-3 text-right text-amber-600">{fmt(p.juros)}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{fmt(p.saldoDevedor)}</td>
                        <td className="px-2 py-3">
                          <button
                            onClick={() => handleCopy(p, idx)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Copiar linha"
                          >
                            {copiedRow === idx ? (
                              <FiCheck className="text-emerald-500" />
                            ) : (
                              <FiCopy />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-sm">
                      <td colSpan={2} className="px-4 py-3 text-gray-700">
                        Total
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900">
                        {fmt(simulacao.totalPago)}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-700">
                        {fmt(simulacao.valorFinanciado)}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-600">
                        {fmt(simulacao.totalJuros)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <Placeholder />
          )}

          {/* Comparativo de parcelas */}
          {comparativo.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center space-x-2">
                <FiTrendingUp className="text-primary-600" />
                <h2 className="text-sm font-semibold text-gray-800">Comparativo de Opções</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                      <th className="px-4 py-3 font-medium">Parcelas</th>
                      <th className="px-4 py-3 font-medium text-right">Valor/Parcela</th>
                      <th className="px-4 py-3 font-medium text-right">Total pago</th>
                      <th className="px-4 py-3 font-medium text-right">Total juros</th>
                      <th className="px-4 py-3 font-medium text-right">% Juros</th>
                      <th className="px-4 py-3 font-medium text-right">Custo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparativo.map((op) => {
                      const isActive = op.n === parcelas;
                      const barWidth = Math.min(100, op.percentualJuros * 3);
                      return (
                        <tr
                          key={op.n}
                          onClick={() => setParcelas(op.n)}
                          className={`border-t border-gray-50 cursor-pointer transition-colors ${
                            isActive
                              ? 'bg-primary-50 font-semibold'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className="px-4 py-3 text-gray-700">
                            <span
                              className={`inline-block w-7 h-7 rounded-full text-center leading-7 text-xs mr-2 ${
                                isActive
                                  ? 'bg-primary-600 text-white'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {op.n}
                            </span>
                            {op.n}x
                          </td>
                          <td className="px-4 py-3 text-right text-gray-800">{fmt(op.valorParcela)}</td>
                          <td className="px-4 py-3 text-right text-gray-700">{fmt(op.totalPago)}</td>
                          <td
                            className={`px-4 py-3 text-right ${
                              op.totalJuros > 0 ? 'text-amber-600' : 'text-emerald-600'
                            }`}
                          >
                            {fmt(op.totalJuros)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={`text-xs font-medium ${
                                op.percentualJuros > 30
                                  ? 'text-red-600'
                                  : op.percentualJuros > 15
                                  ? 'text-amber-600'
                                  : 'text-emerald-600'
                              }`}
                            >
                              {op.percentualJuros.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 pr-6">
                            <div className="h-2 w-full max-w-[80px] ml-auto bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  op.percentualJuros > 30
                                    ? 'bg-red-400'
                                    : op.percentualJuros > 15
                                    ? 'bg-amber-400'
                                    : 'bg-emerald-400'
                                }`}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="px-6 py-3 text-xs text-gray-400 border-t border-gray-100">
                Clique em uma linha para selecionar e ver a tabela de amortização completa.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Row({
  label,
  value,
  sub,
  highlight,
  warn,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="text-right">
        <span
          className={`text-sm font-semibold ${
            highlight ? 'text-primary-700 text-base' : warn ? 'text-amber-600' : 'text-gray-800'
          }`}
        >
          {value}
        </span>
        {sub && <div className="text-xs text-gray-400">{sub}</div>}
      </div>
    </div>
  );
}

function Placeholder() {
  return (
    <div className="bg-white rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center py-20 text-center">
      <FiDollarSign className="text-4xl text-gray-300 mb-4" />
      <p className="text-gray-500 font-medium">Preencha os parâmetros para simular</p>
      <p className="text-sm text-gray-400 mt-1">
        Informe o valor do bem, taxa de juros e número de parcelas
      </p>
    </div>
  );
}
