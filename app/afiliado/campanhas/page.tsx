'use client';

import { useState, useEffect } from 'react';
import { FiCamera, FiExternalLink, FiCheck, FiClock, FiX, FiSend, FiHash } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface MyPost {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  postUrl: string;
  adminNotes: string | null;
  submittedAt: string;
}

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  hashtags: string | null;
  contentGuide: string | null;
  products: string[];
  startDate: string;
  endDate: string;
  totalPosts: number;
  myPost: MyPost | null;
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysLeft(endDate: string) {
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const STATUS_INFO: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: 'Aguardando revisão', color: 'bg-yellow-100 text-yellow-700', icon: <FiClock size={12} /> },
  APPROVED: { label: 'Aprovado!', color: 'bg-green-100 text-green-700', icon: <FiCheck size={12} /> },
  REJECTED: { label: 'Rejeitado', color: 'bg-red-100 text-red-700', icon: <FiX size={12} /> },
};

export default function AffiliateCampanhasPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitState, setSubmitState] = useState<Record<string, { url: string; caption: string; open: boolean }>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/affiliate/campaigns')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setCampaigns(d.campaigns ?? []); })
      .finally(() => setLoading(false));
  }, []);

  function getSubmit(id: string) {
    return submitState[id] ?? { url: '', caption: '', open: false };
  }

  function setSubmit(id: string, patch: Partial<{ url: string; caption: string; open: boolean }>) {
    setSubmitState((prev) => ({ ...prev, [id]: { ...getSubmit(id), ...patch } }));
  }

  async function handleSubmit(campaign: Campaign) {
    const s = getSubmit(campaign.id);
    if (!s.url.trim()) {
      toast.error('Informe a URL do post');
      return;
    }
    setSubmitting(campaign.id);
    try {
      const res = await fetch(`/api/affiliate/campaigns/${campaign.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postUrl: s.url.trim(), caption: s.caption.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Erro ao enviar post');
        return;
      }
      toast.success('Post enviado! Aguarde a revisão da equipe.');
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === campaign.id
            ? { ...c, myPost: data.post, totalPosts: c.myPost ? c.totalPosts : c.totalPosts + 1 }
            : c
        )
      );
      setSubmit(campaign.id, { open: false, url: '', caption: '' });
    } finally {
      setSubmitting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FiCamera className="text-pink-500" />
          Campanhas
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Participe das campanhas e envie o link do seu post para aprovação
        </p>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <FiCamera size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700">Nenhuma campanha ativa</h3>
          <p className="text-gray-400 text-sm mt-1">
            As campanhas ativas aparecerão aqui
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {campaigns.map((c) => {
            const days = daysLeft(c.endDate);
            const s = getSubmit(c.id);
            const canResubmit = c.myPost?.status === 'REJECTED';

            return (
              <div key={c.id} className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
                {/* Campaign header */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-lg">{c.title}</h3>
                      {c.description && (
                        <p className="text-sm text-gray-500 mt-1">{c.description}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-xs font-medium mb-1 ${days <= 3 ? 'text-orange-500' : 'text-gray-400'}`}>
                        <FiClock className="inline mr-1" size={11} />
                        {days} dia{days !== 1 ? 's' : ''} restante{days !== 1 ? 's' : ''}
                      </div>
                      <div className="text-xs text-gray-400">{fmt(c.startDate)} → {fmt(c.endDate)}</div>
                    </div>
                  </div>

                  {/* Hashtags */}
                  {c.hashtags && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {c.hashtags.split(/\s+/).filter(Boolean).map((tag, i) => (
                        <span key={i} className="inline-flex items-center gap-0.5 bg-pink-50 text-pink-600 text-xs px-2 py-0.5 rounded-full font-medium">
                          <FiHash size={10} />{tag.replace(/^#/, '')}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Stats */}
                  <p className="text-xs text-gray-400">{c.totalPosts} influenciador{c.totalPosts !== 1 ? 'es' : ''} participando</p>
                </div>

                {/* Content guide */}
                {c.contentGuide && (
                  <div className="mx-5 mb-4 bg-gray-50 border border-gray-100 rounded-lg p-4">
                    <p className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Guia de Conteúdo</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.contentGuide}</p>
                  </div>
                )}

                {/* My post status OR submission form */}
                <div className="px-5 pb-5">
                  {c.myPost && !canResubmit ? (
                    // Post already submitted and not rejected
                    <div className={`rounded-lg p-4 ${c.myPost.status === 'APPROVED' ? 'bg-green-50 border border-green-100' : 'bg-yellow-50 border border-yellow-100'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_INFO[c.myPost.status]?.color}`}>
                          {STATUS_INFO[c.myPost.status]?.icon}
                          {STATUS_INFO[c.myPost.status]?.label}
                        </span>
                      </div>
                      <a
                        href={c.myPost.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1 mb-1"
                      >
                        <FiExternalLink size={13} /> {c.myPost.postUrl}
                      </a>
                      {c.myPost.adminNotes && (
                        <p className="text-xs text-gray-600 mt-2">
                          <span className="font-medium">Nota da equipe:</span> {c.myPost.adminNotes}
                        </p>
                      )}
                    </div>
                  ) : (
                    // Show form (either no submission yet, or rejected and can resubmit)
                    <>
                      {canResubmit && (
                        <div className="mb-3 bg-red-50 border border-red-100 rounded-lg p-3">
                          <p className="text-xs text-red-600 font-medium mb-0.5">Post rejeitado</p>
                          {c.myPost?.adminNotes && (
                            <p className="text-xs text-red-500">Motivo: {c.myPost.adminNotes}</p>
                          )}
                          <p className="text-xs text-red-600 mt-1">Corrija seu post e envie novamente.</p>
                        </div>
                      )}

                      {!s.open && !canResubmit ? (
                        <button
                          onClick={() => setSubmit(c.id, { open: true })}
                          className="w-full bg-pink-600 text-white py-2.5 rounded-lg hover:bg-pink-700 transition-colors flex items-center justify-center gap-2 font-medium"
                        >
                          <FiCamera size={16} /> Participar e Enviar Post
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              URL do Post no Instagram *
                            </label>
                            <input
                              type="url"
                              value={s.url}
                              onChange={(e) => setSubmit(c.id, { url: e.target.value })}
                              placeholder="https://www.instagram.com/p/..."
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Legenda do Post <span className="text-gray-400 font-normal">(opcional)</span>
                            </label>
                            <textarea
                              value={s.caption}
                              onChange={(e) => setSubmit(c.id, { caption: e.target.value })}
                              rows={3}
                              placeholder="Cole a legenda que você usou no post..."
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                            />
                          </div>
                          <div className="flex gap-2">
                            {!canResubmit && (
                              <button
                                type="button"
                                onClick={() => setSubmit(c.id, { open: false, url: '', caption: '' })}
                                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                              >
                                Cancelar
                              </button>
                            )}
                            <button
                              onClick={() => handleSubmit(c)}
                              disabled={submitting === c.id}
                              className="flex-1 bg-pink-600 text-white py-2 rounded-lg hover:bg-pink-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50"
                            >
                              <FiSend size={14} />
                              {submitting === c.id ? 'Enviando…' : 'Enviar para Revisão'}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
