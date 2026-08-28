'use client';

import React from 'react';
import { LeadActivity } from '@/types';
import { formatDate } from '@/lib/utils';
import { Activity, MessageSquare, PhoneCall, Calendar, FileText } from 'lucide-react';

interface ActivityFeedProps {
  activities: LeadActivity[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  return (
    <div className="bg-apex-card border border-apex-border rounded-xl p-5 space-y-4 shadow-xl">
      <div className="flex justify-between items-center border-b border-apex-border pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-apex-orange" />
          <h3 className="text-sm font-bold text-white">Ekip Aktivite Akışı</h3>
        </div>
        <span className="text-xs font-mono text-apex-muted">Son Hareketler</span>
      </div>

      <div className="space-y-3">
        {activities.length === 0 ? (
          <p className="text-xs text-apex-muted italic text-center py-6">Aktivite kaydı bulunmuyor.</p>
        ) : (
          activities.slice(0, 6).map((act) => (
            <div key={act.id} className="bg-apex-dark border border-apex-border rounded-xl p-3 text-xs space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-apex-orange flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {act.user_name} ({act.type})
                </span>
                <span className="text-[10px] font-mono text-apex-muted">{formatDate(act.created_at)}</span>
              </div>
              <p className="text-neutral-200 leading-relaxed">{act.description}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
