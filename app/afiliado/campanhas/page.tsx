'use client';

import { useState, useEffect } from 'react';
import { FiCamera, FiExternalLink, FiCheck, FiClock, FiX, FiSend, FiHash, FiVideo, FiImage, FiFileText, FiLink } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface MyPost {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  postUrl: string;
  adminNotes: string | null;
  submittedAt: string;
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
  products: string[];
  materials: Material[];
  reelsCount: number;
  postsCount: number;
  storiesCount: number;
  startDate: string;
  endDate: string;
  totalParticipants: number;
  myPosts: Record<string, MyPost>;
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
  // submitState: campaignId -> postType -> url string
  const [submitState, setSubmitState] = useState<Record<string, Record<string, string>>>({});
  const [submitting, setSubmitting] = useState<string | null>(null); // "campaignId_postType"

  useEffect(() => {
    fetch('/api/affiliate/campaigns')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setCampaigns(d.campaigns ?? []); })
      .finally(() => setLoading(false));
  }, []);

  function getUrl(campaignId: string, postType: string) {
    return submitState[campaignId]?.[postType] ?? '';
  }

  function setUrl(campaignId: string, postType: string, url: string) {
    setSubmitState((prev) => ({
      ...prev,
      [campaignId]: { ...(prev[campaignId] ?? {}), [postType]: url }
    }));
  }

  async function handleSubmit(campaign: Campaign, postType: string) {
    const url = getUrl(campaign.id, postType).trim();
    if (!url) { toast.error('Informe a URL do post'); return; }
    const key = `${campaign.id}_${postType}`;
    setSubmitting(key);
    try {
      const res = await fetch(`/api/affiliate/campaigns/${campaign.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postUrl: url, postType }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Erro ao enviar post'); return; }
      toast.success('Link enviado! Aguarde a revisão.');
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === campaign.id
            ? { ...c, myPosts: { ...c.myPosts, [postType]: data.post } }
            : c
        )
      );
      setUrl(campaign.id, postType, '');
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

                  {/* Meta de conteúdo */}
                  {(c.reelsCount > 0 || c.postsCount > 0 || c.storiesCount > 0) && (
                    <div className="flex flex-wrap gap-2 mt-2 mb-1">
                      {c.reelsCount > 0 && (
                        <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 text-xs px-2.5 py-1 rounded-full font-medium">
                          🎬 {c.reelsCount} Reel{c.reelsCount !== 1 ? 's' : ''}
                        </span>
                      )}
                      {c.postsCount > 0 && (
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 text-xs px-2.5 py-1 rounded-full font-medium">
                          🖼️ {c.postsCount} Post{c.postsCount !== 1 ? 's' : ''}
                        </span>
                      )}
                      {c.storiesCount > 0 && (
                        <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-600 text-xs px-2.5 py-1 rounded-full font-medium">
                          📱 {c.storiesCount} Storie{c.storiesCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  <p className="text-xs text-gray-400">{c.totalParticipants} influenciador{c.totalParticipants !== 1 ? 'es' : ''} participando</p>
                </div>

                {/* Content guide */}
                {c.contentGuide && (
                  <div className="mx-5 mb-4 bg-gray-50 border border-gray-100 rounded-lg p-4">
                    <p className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Guia de Conteúdo</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.contentGuide}</p>
                  </div>
                )}

                {/* Material de Apoio */}
                {c.materials && c.materials.length > 0 && (
                  <div className="mx-5 mb-4 bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Material de Apoio</p>
                    <div className="space-y-2">
                      {c.materials.map((m, i) => (
                        <a
                          key={i}
                          href={m.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-900 hover:underline"
                        >
                          {m.type === 'video' && <FiVideo size={14} className="text-red-500 shrink-0" />}
                          {m.type === 'image' && <FiImage size={14} className="text-blue-500 shrink-0" />}
                          {m.type === 'document' && <FiFileText size={14} className="text-orange-500 shrink-0" />}
                          {m.type === 'link' && <FiLink size={14} className="text-gray-500 shrink-0" />}
                          <span>{m.title || m.url}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Envio de links por tipo */}
                <div className="px-5 pb-5 space-y-3">
                  {[
                    ...(c.reelsCount > 0 ? [{ type: 'REEL', emoji: '🎬', label: 'Reel', color: 'red' }] : []),
                    ...(c.postsCount > 0 ? [{ type: 'POST', emoji: '🖼️', label: 'Post no Feed', color: 'blue' }] : []),
                    ...(c.storiesCount > 0 ? [{ type: 'STORY', emoji: '📱', label: 'Story', color: 'purple' }] : []),
                  ].map(({ type, emoji, label, color }) => {
                    const myPost = c.myPosts[type];
                    const key = `${c.id}_${type}`;
                    const isSubmitting = submitting === key;
                    const canResubmit = myPost?.status === 'REJECTED';

                    const borderColor = color === 'red' ? 'border-red-100' : color === 'blue' ? 'border-blue-100' : 'border-purple-100';
                    const bgColor = color === 'red' ? 'bg-red-50' : color === 'blue' ? 'bg-blue-50' : 'bg-purple-50';
                    const textColor = color === 'red' ? 'text-red-700' : color === 'blue' ? 'text-blue-700' : 'text-purple-700';

                    return (
                      <div key={type} className={`rounded-lg border p-4 ${borderColor} ${bgColor}`}>
                        <p className={`text-xs font-semibold ${textColor} mb-2`}>{emoji} {label}</p>

                        {myPost && !canResubmit ? (
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_INFO[myPost.status]?.color}`}>
                                {STATUS_INFO[myPost.status]?.icon}
                                {STATUS_INFO[myPost.status]?.label}
                              </span>
                            </div>
                            <a href={myPost.postUrl} target="_blank" rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <FiExternalLink size={13} /> {myPost.postUrl}
                            </a>
                            {myPost.adminNotes && (
                              <p className="text-xs text-gray-600 mt-1"><span className="font-medium">Nota:</span> {myPost.adminNotes}</p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {canResubmit && (
                              <div className="mb-2 bg-red-100 rounded p-2">
                                <p className="text-xs text-red-600 font-medium">Rejeitado — corrija e reenvie</p>
                                {myPost?.adminNotes && <p className="text-xs text-red-500">Motivo: {myPost.adminNotes}</p>}
                              </div>
                            )}
                            <div className="flex gap-2">
                              <input
                                type="url"
                                value={getUrl(c.id, type)}
                                onChange={(e) => setUrl(c.id, type, e.target.value)}
                                placeholder={`https://www.instagram.com/${type === 'REEL' ? 'reel' : type === 'STORY' ? 'stories' : 'p'}/...`}
                                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white"
                              />
                              <button
                                onClick={() => handleSubmit(c, type)}
                                disabled={isSubmitting || !getUrl(c.id, type).trim()}
                                className="shrink-0 bg-pink-600 text-white px-3 py-2 rounded-lg hover:bg-pink-700 transition-colors flex items-center gap-1 text-sm font-medium disabled:opacity-50"
                              >
                                <FiSend size={14} />
                                {isSubmitting ? '…' : 'Enviar'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {c.reelsCount === 0 && c.postsCount === 0 && c.storiesCount === 0 && (
                    <p className="text-center text-gray-400 text-sm py-2">Nenhuma meta de conteúdo definida para esta campanha</p>
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
