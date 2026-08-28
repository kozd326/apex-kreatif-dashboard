'use client';

import React from 'react';
import { Lead } from '@/types';
import { formatCurrency, formatDate, isOverdue } from '@/lib/utils';
import { Eye, Edit2, AlertCircle } from 'lucide-react';

interface LeadTableProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onEditLead: (lead: Lead) => void;
}

export const LeadTable: React.FC<LeadTableProps> = ({
  leads,
  onSelectLead,
  onEditLead,
}) => {
  return (
    <div className="bg-apex-card border border-apex-border rounded-xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-apex-dark border-b border-apex-border text-apex-muted font-mono uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">İşletme Adı</th>
              <th className="py-3 px-4">Sektör / Konum</th>
              <th className="py-3 px-4">Karar Verici</th>
              <th className="py-3 px-4">Öncelik</th>
              <th className="py-3 px-4">Fırsat Skoru</th>
              <th className="py-3 px-4">Satış Durumu</th>
              <th className="py-3 px-4">Sorumlu</th>
              <th className="py-3 px-4 text-right">Proje Değeri</th>
              <th className="py-3 px-4 text-right">Beklenen Gelir</th>
              <th className="py-3 px-4">Sonraki Adım</th>
              <th className="py-3 px-4 text-center">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-apex-border/60">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-apex-muted italic">
                  Arama kriterlerine uygun müşteri adayı bulunamadı.
                </td>
              </tr>
            ) : (
              leads.map((lead) => {
                const overdue = isOverdue(lead.next_step_date);
                const isHighPriority = lead.priority === 'Yüksek';
                const auditScore = Math.round(((lead.website_score || 0) + (lead.social_score || 0) + (lead.booking_score || 0) + (lead.brand_score || 0)) / 20 * 100);
                const contactScore = [lead.phone, lead.email, lead.instagram].filter(Boolean).length * 5;
                const score = Math.min(100, auditScore + contactScore);

                return (
                  <tr
                    key={lead.id}
                    className="hover:bg-apex-hover/50 transition-colors group cursor-pointer"
                    onClick={() => onSelectLead(lead)}
                  >
                    {/* Company Name */}
                    <td className="py-3.5 px-4 font-bold text-white group-hover:text-apex-orange transition-colors">
                      <div className="flex items-center gap-2">
                        {isHighPriority && (
                          <span className="w-2 h-2 rounded-full bg-apex-orange animate-pulse" title="Yüksek Öncelik"></span>
                        )}
                        <span>{lead.company_name}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4"><span className={`font-mono font-bold ${score >= 60 ? 'text-apex-orange' : 'text-apex-muted'}`}>{score || '—'}/100</span></td>

                    {/* Sector & Location */}
                    <td className="py-3.5 px-4 text-neutral-300">
                      <div>{lead.sector}</div>
                      <div className="text-[10px] text-apex-muted">{lead.city_district}</div>
                    </td>

                    {/* Decision Maker */}
                    <td className="py-3.5 px-4 text-white font-medium">
                      <div>{lead.decision_maker}</div>
                      <div className="text-[10px] text-apex-muted font-mono">{lead.phone}</div>
                    </td>

                    {/* Priority Badge */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                          lead.priority === 'Yüksek'
                            ? 'bg-rose-950/80 border border-rose-800 text-rose-300'
                            : lead.priority === 'Orta'
                            ? 'bg-amber-950/80 border border-amber-800 text-amber-300'
                            : 'bg-neutral-900 border border-neutral-800 text-neutral-400'
                        }`}
                      >
                        {lead.priority}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-bold bg-apex-dark border border-apex-border text-white">
                        {lead.status}
                      </span>
                    </td>

                    {/* Assigned Member */}
                    <td className="py-3.5 px-4 font-semibold text-neutral-200">{lead.assigned_name}</td>

                    {/* Estimated Deal Value */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                      {formatCurrency(lead.estimated_deal_value)}
                    </td>

                    {/* Expected Revenue */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                      {formatCurrency(lead.expected_revenue)}
                    </td>

                    {/* Next Step Date */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 font-mono text-[11px]">
                        {overdue ? (
                          <span className="text-rose-400 font-bold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {formatDate(lead.next_step_date)}
                          </span>
                        ) : (
                          <span className="text-neutral-300">{formatDate(lead.next_step_date)}</span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onSelectLead(lead)}
                          className="p-1.5 rounded bg-apex-dark border border-apex-border text-apex-muted hover:text-white hover:border-neutral-600 transition-colors"
                          title="Detay Gör"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEditLead(lead)}
                          className="p-1.5 rounded bg-apex-dark border border-apex-border text-apex-muted hover:text-apex-orange hover:border-apex-orange transition-colors"
                          title="Düzenle"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
