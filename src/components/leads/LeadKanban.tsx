'use client';

import React from 'react';
import { Lead, LeadStatus } from '@/types';
import { formatCurrency, formatDate, isOverdue } from '@/lib/utils';
import { AlertCircle, Phone, Building, User } from 'lucide-react';

interface LeadKanbanProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateStatus: (leadId: string, newStatus: LeadStatus) => void;
}

const STAGES: { id: LeadStatus; title: string; color: string }[] = [
  { id: 'Yeni', title: 'Yeni Aday', color: 'border-blue-500/40 text-blue-400' },
  { id: 'İlk Temas', title: 'İlk Temas Yapıldı', color: 'border-purple-500/40 text-purple-400' },
  { id: 'Takipte', title: 'Takipte', color: 'border-amber-500/40 text-amber-400' },
  { id: 'Görüşme Planlandı', title: 'Görüşme Planlandı', color: 'border-indigo-500/40 text-indigo-400' },
  { id: 'Teklif Gönderildi', title: 'Teklif Gönderildi', color: 'border-apex-orange/40 text-apex-orange' },
  { id: 'Kazanıldı', title: 'Kazanıldı (Won)', color: 'border-emerald-500/40 text-emerald-400' },
  { id: 'Kaybedildi', title: 'Kaybedildi', color: 'border-neutral-700 text-neutral-500' },
];

export const LeadKanban: React.FC<LeadKanbanProps> = ({
  leads,
  onSelectLead,
  onUpdateStatus,
}) => {
  return (
    <div className="flex gap-4 overflow-x-auto pb-6 pt-1 snap-x min-h-[600px]">
      {STAGES.map((stage) => {
        const stageLeads = leads.filter((l) => l.status === stage.id);
        const stageTotal = stageLeads.reduce((acc, l) => acc + l.estimated_deal_value, 0);

        return (
          <div
            key={stage.id}
            className="w-72 shrink-0 bg-apex-card/60 border border-apex-border rounded-xl flex flex-col snap-start"
          >
            {/* Stage Column Header */}
            <div className="p-3.5 border-b border-apex-border flex items-center justify-between bg-apex-dark/50">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-extrabold uppercase tracking-wider ${stage.color}`}>
                  {stage.title}
                </span>
                <span className="w-5 h-5 rounded-full bg-apex-dark border border-apex-border text-[10px] font-mono font-bold text-white flex items-center justify-center">
                  {stageLeads.length}
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold text-neutral-400">
                {formatCurrency(stageTotal)}
              </span>
            </div>

            {/* Stage Lead Cards List */}
            <div className="p-2 space-y-2.5 flex-1 overflow-y-auto max-h-[680px]">
              {stageLeads.length === 0 ? (
                <div className="border border-dashed border-apex-border/50 rounded-lg p-6 text-center text-xs text-apex-muted italic">
                  İlan yok
                </div>
              ) : (
                stageLeads.map((lead) => {
                  const overdue = isOverdue(lead.next_step_date);
                  const isHighPriority = lead.priority === 'Yüksek';

                  return (
                    <div
                      key={lead.id}
                      onClick={() => onSelectLead(lead)}
                      className={`bg-apex-dark border rounded-xl p-3.5 cursor-pointer transition-all hover:border-apex-orange/80 hover:shadow-lg ${
                        overdue
                          ? 'border-rose-800/80 bg-rose-950/20'
                          : isHighPriority
                          ? 'border-apex-orange/40'
                          : 'border-apex-border'
                      }`}
                    >
                      {/* Priority Tag & Stage Selector */}
                      <div className="flex justify-between items-center mb-2">
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            lead.priority === 'Yüksek'
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : 'bg-apex-card text-apex-muted border border-apex-border'
                          }`}
                        >
                          {lead.priority}
                        </span>

                        <select
                          value={lead.status}
                          onChange={(e) => {
                            e.stopPropagation();
                            onUpdateStatus(lead.id, e.target.value as LeadStatus);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-apex-card border border-apex-border text-[10px] text-apex-muted rounded px-1.5 py-0.5 focus:outline-none focus:border-apex-orange"
                        >
                          {STAGES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Company Name */}
                      <h4 className="text-xs font-bold text-white mb-1 line-clamp-1 hover:text-apex-orange transition-colors">
                        {lead.company_name}
                      </h4>
                      <p className="text-[10px] text-apex-muted mb-2">{lead.sector} • {lead.city_district}</p>

                      {/* Contact & Amount info */}
                      <div className="pt-2 border-t border-apex-border/60 flex justify-between items-center text-xs">
                        <div className="text-[10px] text-neutral-300 font-medium flex items-center gap-1">
                          <User className="w-3 h-3 text-apex-muted" />
                          <span>{lead.decision_maker}</span>
                        </div>
                        <span className="font-mono font-bold text-emerald-400">
                          {formatCurrency(lead.estimated_deal_value)}
                        </span>
                      </div>

                      {/* Next Step Date Alert */}
                      {lead.next_step_date && (
                        <div className="mt-2 text-[10px] font-mono flex items-center justify-between text-apex-muted">
                          <span>Takip:</span>
                          <span className={overdue ? 'text-rose-400 font-bold flex items-center gap-1' : 'text-neutral-300'}>
                            {overdue && <AlertCircle className="w-3 h-3" />}
                            {formatDate(lead.next_step_date)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
