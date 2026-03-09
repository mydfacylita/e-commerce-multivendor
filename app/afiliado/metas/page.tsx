'use client';

import { useState, useEffect } from 'react';
import { FiTarget, FiAward, FiClock } from 'react-icons/fi';

const GOAL_TYPE_LABELS: Record<string, string> = {
  SALES_AMOUNT: 'Valor de Vendas',
  SALES_COUNT: 'Número de Vendas',
  CLICKS_COUNT: 'Cliques no Link',
  COMMISSION_AMOUNT: 'Comissões Ganhas',
};

const GOAL_TYPE_FORMAT: Record<string, (v: number) => string> = {
  SALES_AMOUNT: (v) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
  SALES_COUNT: (v) => `${v} venda${v !== 1 ? 's' : ''}`,
  CLICKS_COUNT: (v) => `${v} clique${v !== 1 ? 's' : ''}`,
  COMMISSION_AMOUNT: (v) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
};

interface Goal {
  id: string;
  title: string;
  description: string | null;
  type: string;
  targetValue: number;
  startDate: string;
  endDate: string;
  reward: string | null;
  currentValue: number;
  progressPercent: number;
  isCompleted: boolean;
  isExpired: boolean;
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function daysLeft(endDate: string) {
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function AffiliateMetasPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/affiliate/goals')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setGoals(d.goals ?? []); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const active = goals.filter((g) => !g.isExpired);
  const expired = goals.filter((g) => g.isExpired);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FiTarget className="text-blue-600" />
          Minhas Metas
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Acompanhe seu progresso e conquiste recompensas
        </p>
      </div>

      {goals.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <FiTarget size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700">Nenhuma meta disponível</h3>
          <p className="text-gray-400 text-sm mt-1">
            As metas serão exibidas aqui quando forem criadas pelo administrador
          </p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section className="mb-8">
              <h2 className="text-base font-semibold text-gray-700 mb-3">Metas Ativas</h2>
              <div className="space-y-4">
                {active.map((g) => (
                  <GoalCard key={g.id} goal={g} />
                ))}
              </div>
            </section>
          )}

          {expired.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-gray-500 mb-3">Metas Encerradas</h2>
              <div className="space-y-4 opacity-70">
                {expired.map((g) => (
                  <GoalCard key={g.id} goal={g} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const days = daysLeft(goal.endDate);
  const barColor = goal.isCompleted
    ? 'bg-green-500'
    : days <= 3
      ? 'bg-orange-400'
      : 'bg-blue-500';

  return (
    <div className={`bg-white rounded-xl shadow border ${goal.isCompleted ? 'border-green-200' : 'border-gray-100'}`}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900">{goal.title}</h3>
              {goal.isCompleted && (
                <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                  <FiAward size={10} /> Concluída!
                </span>
              )}
              {goal.isExpired && !goal.isCompleted && (
                <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                  Encerrada
                </span>
              )}
            </div>
            {goal.description && (
              <p className="text-sm text-gray-500 mt-1">{goal.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {fmt(goal.startDate)} → {fmt(goal.endDate)}
              {!goal.isExpired && days > 0 && (
                <span className={`ml-2 inline-flex items-center gap-1 ${days <= 3 ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>
                  <FiClock size={11} /> {days} dia{days !== 1 ? 's' : ''} restante{days !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500">{GOAL_TYPE_LABELS[goal.type]}</span>
            <span className="text-sm font-semibold text-gray-900">{goal.progressPercent}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${goal.progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs text-gray-500">
              {GOAL_TYPE_FORMAT[goal.type]?.(goal.currentValue) ?? goal.currentValue}
            </span>
            <span className="text-xs font-medium text-gray-700">
              Meta: {GOAL_TYPE_FORMAT[goal.type]?.(goal.targetValue) ?? goal.targetValue}
            </span>
          </div>
        </div>

        {/* Reward */}
        {goal.reward && (
          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 flex items-start gap-2">
            <FiAward className="text-yellow-500 shrink-0 mt-0.5" size={16} />
            <div>
              <p className="text-xs font-medium text-yellow-700 mb-0.5">Recompensa</p>
              <p className="text-sm text-yellow-800">{goal.reward}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
