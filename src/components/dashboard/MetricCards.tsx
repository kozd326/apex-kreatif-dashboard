'use client';

import React from 'react';
import { Lead, Proposal } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Users, PhoneCall, Calendar, FileSpreadsheet, Trophy, TrendingUp } from 'lucide-react';

interface MetricCardsProps {
  leads: Lead[];
  proposals: Proposal[];
}

export const MetricCards: React.FC<MetricCardsProps> = ({ leads, proposals }) => {
  const totalLeads = leads.length;
  const callsMade = leads.filter((l) => l.status !== 'Yeni').length;
  const meetingsScheduled = leads.filter((l) => l.status === 'Görüşme Planlandı').length;
  const proposalsSent = proposals.length;
  const dealsWon = leads.filter((l) => l.status === 'Kazanıldı').length;
  const expectedRevenue = leads.reduce((acc, l) => acc + l.expected_revenue, 0);

  const CARDS = [
    {
      title: 'Toplam Müşteri Adayı',
      value: totalLeads,
      subtitle: 'Aktif Havuz',
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-950/20 border-blue-900/50',
    },
    {
      title: 'Bu Hafta Aranan',
      value: callsMade,
      subtitle: 'Temas Edilen',
      icon: PhoneCall,
      color: 'text-purple-400',
      bg: 'bg-purple-950/20 border-purple-900/50',
    },
    {
      title: 'Planlanan Toplantı',
      value: meetingsScheduled,
      subtitle: 'Takvimde Bekleyen',
      icon: Calendar,
      color: 'text-amber-400',
      bg: 'bg-amber-950/20 border-amber-900/50',
    },
    {
      title: 'Gönderilen Teklif',
      value: proposalsSent,
      subtitle: 'Yanıt Bekleniyor',
      icon: FileSpreadsheet,
      color: 'text-apex-orange',
      bg: 'bg-apex-orange-light border-apex-orange/30',
    },
    {
      title: 'Kazanılan İş (Won)',
      value: dealsWon,
      subtitle: 'Sözleşmeli',
      icon: Trophy,
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/20 border-emerald-900/50',
    },
    {
      title: 'Beklenen Toplam Gelir',
      value: formatCurrency(expectedRevenue),
      subtitle: 'Ağırlıklı Olasılık',
      icon: TrendingUp,
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/20 border-emerald-900/50',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {CARDS.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`border rounded-xl p-4 flex flex-col justify-between transition-all hover:scale-[1.02] ${card.bg}`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs text-apex-muted font-medium">{card.title}</span>
              <Icon className={`w-4 h-4 ${card.color}`} />
            </div>

            <div>
              <span className={`text-xl font-extrabold font-mono tracking-tight block ${card.color}`}>
                {card.value}
              </span>
              <span className="text-[10px] font-mono text-apex-muted block mt-0.5">{card.subtitle}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
