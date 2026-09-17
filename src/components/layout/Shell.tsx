'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { TeamMember, Lead } from '@/types';
import { LeadModal } from '@/components/leads/LeadModal';
import { AlertTriangle } from 'lucide-react';

interface ShellProps {
  children: React.ReactNode;
}

export const Shell: React.FC<ShellProps> = ({ children }) => {
  // A new browser client on each render retriggers the profile effect below.
  // Keep one client for this mounted application shell.
  const supabase = useMemo(() => createClient(), []);
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const isConfigured = isSupabaseConfigured();

  useEffect(() => {
    let cancelled = false;

    async function loadUserProfile() {
      if (!isConfigured) return;
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          const fallbackName = session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Kullanıcı';
          const normalizedProfile = {
            ...profile,
            name: typeof profile.name === 'string' && profile.name.trim() ? profile.name : fallbackName,
            email: typeof profile.email === 'string' ? profile.email : session.user.email || '',
            role: profile.role || session.user.user_metadata?.role || 'Görüntüleme',
          } as TeamMember;
          if (!cancelled) setCurrentUser(normalizedProfile);
        } else {
          // Fallback profile from metadata
          if (!cancelled) {
            setCurrentUser({
              id: session.user.id,
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Kullanıcı',
              email: session.user.email || '',
              role: session.user.user_metadata?.role || 'Görüntüleme',
            });
          }
        }
      }
    }

    void loadUserProfile();
    return () => {
      cancelled = true;
    };
  }, [isConfigured, supabase]);

  const handleSaveLead = async (newLead: Lead) => {
    // Insert into Supabase
    const { error } = await supabase.from('leads').insert({
      company_name: newLead.company_name,
      sector: newLead.sector,
      city_district: newLead.city_district,
      website: newLead.website,
      instagram: newLead.instagram,
      phone: newLead.phone,
      email: newLead.email,
      decision_maker: newLead.decision_maker,
      priority: newLead.priority,
      status: newLead.status,
      assigned_to: newLead.assigned_to,
      assigned_name: newLead.assigned_name,
      contact_reason: newLead.contact_reason,
      recommended_package: newLead.recommended_package,
      estimated_deal_value: newLead.estimated_deal_value,
      win_probability: newLead.win_probability,
      notes: newLead.notes,
      next_step_date: newLead.next_step_date,
      created_by: currentUser?.id,
    });

    if (error) {
      console.error('Error inserting lead to Supabase:', error);
      alert(`Müşteri kaydedilirken hata oluştu: ${error.message}`);
    } else {
      setIsLeadModalOpen(false);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('apex_data_updated'));
      }
    }
  };

  return (
    <div className="min-h-screen bg-apex-dark text-white flex">
      {/* Sidebar Navigation */}
      <Sidebar mobileOpen={isMobileNavOpen} onMobileClose={() => setIsMobileNavOpen(false)} />
      {isMobileNavOpen && <button aria-label="Menüyü kapat" onClick={() => setIsMobileNavOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden" />}

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          currentUser={currentUser}
          onOpenAddLeadModal={() => setIsLeadModalOpen(true)}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
        />

        {/* Supabase Unconfigured Banner */}
        {!isConfigured && (
          <div className="bg-amber-950/90 border-b border-amber-800 p-4 px-6 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Supabase Bağlantısı Eksik:</strong> `.env.local` dosyasında URL ve ANON_KEY tanımlayarak canlı veritabanını aktif hale getirin.
              </span>
            </div>
          </div>
        )}

        <main className="p-4 md:p-8 flex-1 overflow-y-auto">{children}</main>
      </div>

      {/* Quick Add Lead Modal */}
      {isLeadModalOpen && currentUser && (
        <LeadModal
          isOpen={isLeadModalOpen}
          currentUser={currentUser}
          onClose={() => setIsLeadModalOpen(false)}
          onSave={handleSaveLead}
        />
      )}
    </div>
  );
};
