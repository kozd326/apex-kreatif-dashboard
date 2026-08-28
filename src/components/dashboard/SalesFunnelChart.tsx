'use client';

import React from 'react';
import { Lead, LeadStatus } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Filter } from 'lucide-react';

interface SalesFunnelChartProps {
  leads: Lead[];
}

const STAGE_ORDER: { status: LeadStatus; label: string; color: string }[] = [
  { status: 'Yeni', label: '1. Yeni Adaylar', color: 'bg-blue-500' },
  { status: 'İlk Temas', label: '2. İlk Temas Yapıldı', color: 'bg-purple-500' },
  { status: 'Takipte', label: '3. Takipte', color: 'bg-amber-500' },
  { status: 'Görüşme Planlandı', label: '4. Görüşme Planlandı', color: 'bg-indigo-500' },
  { status: 'Teklif Gönderildi', label: '5. Teklif Gönderildi', color: 'bg-apex-orange' },
  { status: 'Kazanıldı', label: '6. Kazanıldı (Won)', color: 'bg-emerald-500' },
];

export const SalesFunnelChart: React.FC<SalesFunnelChartProps> = ({ leads }) => {
  const totalCount = leads.length || 1;

  return (
    <div className="bg-apex-card border border-apex-border rounded-xl p-5 space-y-4 shadow-xl">
      <div className="flex justify-between items-center border-b border-apex-border pb-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-apex-orange" />
          <h3 className="text-sm font-bold text-white">Satış Hunisi (Sales Pipeline Funnel)</h3>
        </div>
        <span className="text-xs font-mono text-apex-muted">Toplam {leads.length} Aday</span>
      </div>

      <div className="space-y-3">
        {STAGE_ORDER.map((stage) => {
          const count = leads.filter((l) => l.status === stage.status).length;
          const percentage = Math.round((count / totalCount) * 100);
          const totalVal = leads
            .filter((l) => l.status === stage.status)
            .reduce((acc, l) => acc + l.estimated_deal_value, 0);

          return (
            <div key={stage.status} className="space-y-1 text-xs">
              <div className="flex justify-between items-center text-neutral-300 font-semibold">
                <span>{stage.label}</span>
                <div className="font-mono text-right flex items-center gap-3">
                  <span className="text-apex-muted">{formatCurrency(totalVal)}</span>
                  <span className="font-bold text-white w-12 text-right">{count} adet (%{percentage})</span>
                </div>
              </div>

              {/* Progress Bar Container */}
              <div className="w-full bg-apex-dark border border-apex-border/60 rounded-full h-3 overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${stage.color}`}
                  style={{ width: `${Math.max(percentage, 4)}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
