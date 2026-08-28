'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { TeamMember } from '@/types';
import { Bell, LogOut, Plus, Search, User } from 'lucide-react';

interface HeaderProps {
  currentUser: TeamMember | null;
  onOpenAddLeadModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentUser, onOpenAddLeadModal }) => {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="h-16 border-b border-apex-border bg-apex-dark/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Search Input */}
      <div className="flex items-center gap-3 w-80">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-apex-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Müşteri, teklif veya proje ara..."
            className="w-full bg-apex-card border border-apex-border text-xs text-white pl-9 pr-4 py-2 rounded-lg focus:outline-none focus:border-apex-orange transition-colors"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Quick Add Button */}
        {onOpenAddLeadModal && currentUser && (currentUser.role === 'Yönetici' || currentUser.role === 'Satış') && (
          <button
            onClick={onOpenAddLeadModal}
            className="flex items-center gap-2 bg-apex-orange hover:bg-apex-orange-hover text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors shadow-lg shadow-apex-orange/20"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Müşteri Ekle</span>
          </button>
        )}

        {/* Notifications Icon */}
        <div className="relative">
          <button className="w-9 h-9 rounded-lg bg-apex-card border border-apex-border flex items-center justify-center text-apex-muted hover:text-white hover:border-neutral-700 transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-apex-orange"></span>
          </button>
        </div>

        {/* Real Authenticated User Profile & Sign Out Button */}
        <div className="flex items-center gap-3 pl-3 border-l border-apex-border">
          {currentUser ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-apex-orange/20 border border-apex-orange/40 flex items-center justify-center text-apex-orange font-bold text-xs">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-white leading-tight">{currentUser.name}</p>
                <p className="text-[10px] text-apex-muted leading-tight">{currentUser.role}</p>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-apex-card animate-pulse"></div>
          )}

          <button
            onClick={handleSignOut}
            className="p-2 rounded-lg bg-apex-card border border-apex-border text-apex-muted hover:text-rose-400 hover:border-rose-800 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Çıkış Yap"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Çıkış</span>
          </button>
        </div>
      </div>
    </header>
  );
};
