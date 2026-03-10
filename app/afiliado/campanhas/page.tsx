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
  myPosts: Record<string, MyPost[]>;
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
  const [newUrls, setNewUrls] = useState<Record<string, string>>({}); // `${cid}_${type}` -> url
  const [resubUrls, setResubUrls] = useState<Record<string, string>>({}); // postId -> url
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/affiliate/campaigns')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setCampaigns(d.campaigns ?? []); })
      .finally(() => setLoading(false));
  }, []);

  function getNUrl(cid: string, type: string) { return newUrls[`${cid}_${type}`] ?? ''; }
  function setNUrl(cid: string, type: string, url: string) {
    setNewUrls((p) => ({ ...p, [`${cid}_${type}`]: url }));
  }

  async function handleNew(campaign: Campaign, type: string) {
    const url = getNUrl(campaign.id, type).trim();
    if (!url) { toast.error('Informe a URL'); return; }
    const key = `new_${campaign.id}_${type}`;
    setSubmitting(key);
    try {
      const res = await fetch(`/api/affiliate/campaigns/${campaign.id}/submit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postUrl: url, postType: type }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Erro'); return; }
      toast.success('Link enviado!');
      setCampaigns((prev) => prev.map((c) => c.id !== campaign.id ? c : {
        ...c, myPosts: { ...c.myPosts, [type]: [...(c.myPosts[type] ?? []), data.post] }
      }));
      setNUrl(campaign.id, type, '');
    } finally { setSubmitting(null); }
  }

  async function handleResub(campaign: Campaign, postId: string, type: string) {
    const url = (resubUrls[postId] ?? '').trim();
    if (!url) { toast.error('Informe a nova URL'); return; }
    const key = `resub_${postId}`;
    setSubmitting(key);
    try {
      const res = await fetch(`/api/affiliate/campaigns/${campaign.id}/submit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postUrl: url, postType: type, postId }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Erro'); return; }
      toast.success('Reenviado!');
      setCampaigns((prev) => prev.map((c) => c.id !== campaign.id ? c : {
        ...c, myPosts: { ...c.myPosts, [type]: (c.myPosts[type] ?? []).map((p) => p.id === postId ? data.post : p) }
      }));
      setResubUrls((p) => ({ ...p, [postId]: '' }));
    } finally { setSubmitting(null); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" />
      </div>
    );
  }

  return (
    <div className="p-4">
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
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
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

                {/* Envio de links por tipo — múltiplos */}
                <div className="px-5 pb-5 space-y-3">
                  {[
                    ...(c.reelsCount > 0 ? [{ type: 'REEL', emoji: '🎬', label: 'Reels', target: c.reelsCount, barColor: 'bg-red-500', borderColor: 'border-red-100', bgColor: 'bg-red-50', textColor: 'text-red-700' }] : []),
                    ...(c.postsCount > 0 ? [{ type: 'POST', emoji: '🖼️', label: 'Posts no Feed', target: c.postsCount, barColor: 'bg-blue-500', borderColor: 'border-blue-100', bgColor: 'bg-blue-50', textColor: 'text-blue-700' }] : []),
                    ...(c.storiesCount > 0 ? [{ type: 'STORY', emoji: '📱', label: 'Stories', target: c.storiesCount, barColor: 'bg-purple-500', borderColor: 'border-purple-100', bgColor: 'bg-purple-50', textColor: 'text-purple-700' }] : []),
                  ].map(({ type, emoji, label, target, barColor, borderColor, bgColor, textColor }) => {
                    const posts = c.myPosts[type] ?? [];
                    const nonRejected = posts.filter((p) => p.status !== 'REJECTED');
                    const approved = posts.filter((p) => p.status === 'APPROVED');
                    const canAddMore = nonRejected.length < target;
                    const allDone = approved.length >= target;
                    const progress = Math.min(100, (nonRejected.length / target) * 100);
                    const newKey = `new_${c.id}_${type}`;

                    return (
                      <div key={type} className={`rounded-lg border ${borderColor} ${bgColor}`}>
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 pt-3 pb-1">
                          <p className={`text-sm font-semibold ${textColor}`}>{emoji} {label}</p>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            allDone ? 'bg-green-100 text-green-700' : 'bg-white/80 text-gray-600'
                          }`}>
                            {allDone ? '✓ Meta concluída!' : `${nonRejected.length} / ${target} enviados`}
                          </span>
                        </div>
                        {/* Barra de progresso */}
                        <div className="px-4 pb-3">
                          <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                            <div className={`h-full transition-all ${allDone ? 'bg-green-500' : barColor}`} style={{ width: `${progress}%` }} />
                          </div>
                        </div>

                        {/* Lista de posts enviados */}
                        {posts.length > 0 && (
                          <div className="px-4 pb-2 space-y-2">
                            {posts.map((post, idx) => (
                              <div key={post.id} className="bg-white rounded-lg p-2.5 border border-white shadow-sm">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs text-gray-400 font-medium">#{idx + 1}</span>
                                  <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full ${STATUS_INFO[post.status]?.color}`}>
                                    {STATUS_INFO[post.status]?.icon} {STATUS_INFO[post.status]?.label}
                                  </span>
                                </div>
                                <a href={post.postUrl} target="_blank" rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline flex items-center gap-1 truncate"
                                >
                                  <FiExternalLink size={11} className="shrink-0" />
                                  <span className="truncate">{post.postUrl}</span>
                                </a>
                                {post.adminNotes && (
                                  <p className="text-xs text-orange-600 mt-1">Nota: {post.adminNotes}</p>
                                )}
                                {/* Campo de reenvio para rejeitados */}
                                {post.status === 'REJECTED' && (
                                  <div className="mt-2 flex gap-1.5">
                                    <input
                                      type="url"
                                      value={resubUrls[post.id] ?? ''}
                                      onChange={(e) => setResubUrls((p) => ({ ...p, [post.id]: e.target.value }))}
                                      placeholder="Cole nova URL..."
                                      className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-pink-500 bg-gray-50"
                                    />
                                    <button
                                      onClick={() => handleResub(c, post.id, type)}
                                      disabled={submitting === `resub_${post.id}` || !(resubUrls[post.id] ?? '').trim()}
                                      className="shrink-0 bg-pink-600 text-white px-2.5 py-1 rounded text-xs font-medium hover:bg-pink-700 disabled:opacity-50 flex items-center gap-1"
                                    >
                                      <FiSend size={11} />
                                      {submitting === `resub_${post.id}` ? '…' : 'Reenviar'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Campo para adicionar novo */}
                        <div className="px-4 pb-4">
                          {canAddMore ? (
                            <div className="flex gap-2">
                              <input
                                type="url"
                                value={getNUrl(c.id, type)}
                                onChange={(e) => setNUrl(c.id, type, e.target.value)}
                                placeholder={`https://www.instagram.com/${type === 'REEL' ? 'reel' : type === 'STORY' ? 'stories' : 'p'}/...`}
                                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 bg-white"
                              />
                              <button
                                onClick={() => handleNew(c, type)}
                                disabled={submitting === newKey || !getNUrl(c.id, type).trim()}
                                className="shrink-0 bg-pink-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-pink-700 disabled:opacity-50 flex items-center gap-1"
                              >
                                <FiSend size={14} />
                                {submitting === newKey ? '…' : 'Enviar'}
                              </button>
                            </div>
                          ) : !allDone ? (
                            <p className="text-xs text-center text-gray-500 bg-white/60 rounded py-2">⏳ Aguardando revisão dos {nonRejected.length} envios</p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  {c.reelsCount === 0 && c.postsCount === 0 && c.storiesCount === 0 && (
                    <p className="text-center text-gray-400 text-sm py-2">Nenhuma meta de conteúdo definida</p>
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
