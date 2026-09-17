'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  PhoneCall,
  FileSpreadsheet,
  Boxes,
  Clapperboard,
  Briefcase,
  CheckSquare,
  Settings,
  Zap,
  WalletCards,
  Landmark,
  ContactRound,
  Goal,
  Send,
  Megaphone,
  Bot,
  Radar,
  Map,
} from 'lucide-react';

const NAV_GROUPS = [
  { label: 'GENEL', items: [
    { name: 'Genel Bakış', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Başlangıç Rehberi', href: '/guide', icon: Map },
    { name: 'APEX Asistan', href: '/assistant', icon: Bot, badge: 'Yeni' },
  ] },
  { label: 'SATIŞ', items: [
    { name: 'Müşteri Adayları', href: '/leads', icon: Users },
    { name: 'Bugünkü Takipler', href: '/today-calls', icon: PhoneCall, badge: 'Öncelikli' },
    { name: 'Teklifler', href: '/proposals', icon: FileSpreadsheet },
    { name: 'Çözüm Kütüphanesi', href: '/solutions', icon: Boxes },
    { name: 'Mesajlar & Akışlar', href: '/outreach', icon: Send },
  ] },
  { label: 'MÜŞTERİLER', items: [
    { name: 'Aktif Müşteriler', href: '/brands', icon: ContactRound },
    { name: 'Projeler', href: '/projects', icon: Briefcase },
    { name: 'Marka Başlangıcı', href: '/onboarding', icon: FileSpreadsheet },
  ] },
  { label: 'BÜYÜME', items: [
    { name: 'Büyüme Merkezi', href: '/growth', icon: Radar, badge: 'Yeni' },
    { name: 'Reklam Verileri', href: '/ads', icon: Megaphone },
    { name: 'Hedefler & Raporlar', href: '/reports', icon: Goal },
  ] },
  { label: 'OPERASYON', items: [
    { name: 'Görevler', href: '/tasks', icon: CheckSquare },
    { name: 'Kreatif Stüdyo', href: '/content', icon: Clapperboard },
    { name: 'Tahsilatlar', href: '/payments', icon: WalletCards },
    { name: 'Finans', href: '/finance', icon: Landmark },
  ] },
  { label: 'SİSTEM', items: [
    { name: 'Otomasyonlar', href: '/automations', icon: Zap },
    { name: 'Uzman Çalışmaları', href: '/agents', icon: Bot },
    { name: 'Şablonlar & Araçlar', href: '/templates', icon: Settings },
  ] },
];

interface SidebarProps { mobileOpen?: boolean; onMobileClose?: () => void; }

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onMobileClose }) => {
  const pathname = usePathname();

  return (
    <aside className={`${mobileOpen ? 'flex fixed inset-y-0 left-0 z-50 shadow-2xl' : 'hidden'} md:flex md:sticky md:top-0 w-64 bg-apex-dark border-r border-apex-border flex-col justify-between h-screen shrink-0`}>
      <div>
        {/* APEX KREATİF Brand Header */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-apex-border bg-gradient-to-r from-apex-blue/15 to-transparent">
          <div className="w-9 h-9 rounded-lg bg-white/95 border border-white/30 flex items-center justify-center shadow-lg shadow-apex-blue/20 overflow-hidden">
            <img src="/logo-apex-transparent.png" alt="APEX Kreatif" className="w-full h-full object-contain p-1" />
          </div>
          <div>
            <span className="text-base font-black tracking-widest text-white block leading-tight">
              APEX <span className="text-apex-blue font-bold">KREATİF</span>
            </span>
            <span className="text-[9px] font-mono text-apex-muted tracking-widest uppercase block leading-none">
              GROWTH OPERATING SYSTEM
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-150px)]">
          {NAV_GROUPS.map((group) => <div key={group.label}><p className="px-3.5 mb-1 text-[9px] font-black tracking-widest text-apex-muted/70">{group.label}</p>{group.items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (pathname === '/' && item.href === '/dashboard');

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-apex-blue text-white shadow-md shadow-apex-blue/30 font-bold'
                    : 'text-apex-muted hover:text-white hover:bg-apex-card'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-apex-muted'}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                    <span className="text-[10px] bg-apex-orange-light text-apex-orange border border-apex-orange/30 px-1.5 py-0.5 rounded font-mono font-bold">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}</div>)}
        </nav>
      </div>

      {/* Agency Services Footer Box */}
      <div className="p-4 border-t border-apex-border">
        <div className="bg-apex-card border border-apex-border rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <Zap className="w-4 h-4 text-apex-orange" />
            <span>APEX Büyüme Sistemi</span>
          </div>
          <p className="text-[11px] text-apex-muted leading-relaxed">
            İşi anlatın; sistem taslağı hazırlasın. Uygulama her zaman sizin onayınızla ilerler.
          </p>
        </div>
      </div>
    </aside>
  );
};
