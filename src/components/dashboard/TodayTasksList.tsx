'use client';

import React from 'react';
import { Lead, Task } from '@/types';
import { formatDate, isOverdue, isToday } from '@/lib/utils';
import { CheckCircle2, Clock, PhoneCall, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface TodayTasksListProps {
  leads: Lead[];
  tasks: Task[];
}

export const TodayTasksList: React.FC<TodayTasksListProps> = ({ leads, tasks }) => {
  // Urgent items: next step date is Today or Overdue
  const urgentLeads = leads.filter(
    (l) => l.status !== 'Kazanıldı' && l.status !== 'Kaybedildi' && (isToday(l.next_step_date) || isOverdue(l.next_step_date))
  );

  return (
    <div className="bg-apex-card border border-apex-border rounded-xl p-5 space-y-4 shadow-xl">
      <div className="flex justify-between items-center border-b border-apex-border pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-apex-orange" />
          <h3 className="text-sm font-bold text-white">Bugün Yapılacaklar & Takipler</h3>
        </div>
        <Link
          href="/today-calls"
          className="text-xs font-semibold text-apex-orange hover:underline flex items-center gap-1"
        >
          <span>Tüm Arama Listesi</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-2.5">
        {urgentLeads.length === 0 ? (
          <div className="text-center py-6 text-xs text-apex-muted italic">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
            <span>Bugün için geciken veya bekleyen acil takip araması bulunmuyor!</span>
          </div>
        ) : (
          urgentLeads.slice(0, 5).map((lead) => {
            const overdue = isOverdue(lead.next_step_date);

            return (
              <div
                key={lead.id}
                className="bg-apex-dark border border-apex-border rounded-xl p-3 flex items-center justify-between text-xs hover:border-apex-orange transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${overdue ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}`}>
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white leading-tight">{lead.company_name}</h4>
                    <p className="text-[10px] text-apex-muted">
                      {lead.decision_maker} • <span className="font-mono text-apex-orange">{lead.phone}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right font-mono">
                  {overdue ? (
                    <span className="text-rose-400 font-bold flex items-center gap-1 text-[10px]">
                      <AlertCircle className="w-3 h-3" /> Gecikti ({formatDate(lead.next_step_date)})
                    </span>
                  ) : (
                    <span className="text-amber-400 font-bold text-[10px]">Bugün Takip Edilecek</span>
                  )}
                  <span className="block text-[10px] text-apex-muted">{lead.assigned_name}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
