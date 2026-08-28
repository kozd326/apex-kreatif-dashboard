'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  PhoneCall,
  FileSpreadsheet,
  Briefcase,
  CheckSquare,
  MessageSquareQuote,
  UploadCloud,
  Settings,
  Zap,
  ChartNoAxesCombined,
  WalletCards,
  Landmark,
  ContactRound,
  Goal,
  CircleHelp,
  Send,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Müşteri Adayları', href: '/leads', icon: Users },
  { name: 'Bugün Aranacaklar', href: '/today-calls', icon: PhoneCall, badge: 'Öncelikli' },
  { name: 'Teklifler', href: '/proposals', icon: FileSpreadsheet },
  { name: 'Satış & Kârlılık', href: '/sales-control', icon: ChartNoAxesCombined },
  { name: 'Tahsilatlar', href: '/payments', icon: WalletCards },
  { name: 'Finans & İşletme', href: '/finance', icon: Landmark },
  { name: 'Müşteri & Markalar', href: '/brands', icon: ContactRound },
  { name: 'Hedefler & Raporlar', href: '/reports', icon: Goal },
  { name: 'Kullanım Rehberi', href: '/guide', icon: CircleHelp },
  { name: 'Mesaj Gönderimi', href: '/outreach', icon: Send },
  { name: 'Projeler', href: '/projects', icon: Briefcase },
  { name: 'Görevler', href: '/tasks', icon: CheckSquare },
  { name: 'Mesaj Şablonları', href: '/templates', icon: MessageSquareQuote },
  { name: 'CSV İçe Aktar', href: '/import-csv', icon: UploadCloud },
  { name: 'Ekip & Ayarlar', href: '/team', icon: Settings },
];

interface SidebarProps { mobileOpen?: boolean; onMobileClose?: () => void; }

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onMobileClose }) => {
  const pathname = usePathname();

  return (
    <aside className={`${mobileOpen ? 'flex fixed inset-y-0 left-0 z-50 shadow-2xl' : 'hidden'} md:flex md:sticky md:top-0 w-64 bg-apex-dark border-r border-apex-border flex-col justify-between h-screen shrink-0`}>
      <div>
        {/* APEX KREATİF Brand Header */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-apex-border">
          <div className="w-8 h-8 rounded-lg bg-apex-orange flex items-center justify-center font-black text-white text-sm transform -skew-x-12 shadow-lg shadow-apex-orange/30">
            A
          </div>
          <div>
            <span className="text-base font-black tracking-widest text-white block leading-tight">
              APEX <span className="text-apex-orange font-bold">KREATİF</span>
            </span>
            <span className="text-[9px] font-mono text-apex-muted tracking-widest uppercase block leading-none">
              SALES & PROJECT CRM
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (pathname === '/' && item.href === '/dashboard');

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-apex-orange text-white shadow-md shadow-apex-orange/20 font-bold'
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
          })}
        </nav>
      </div>

      {/* Agency Services Footer Box */}
      <div className="p-4 border-t border-apex-border">
        <div className="bg-apex-card border border-apex-border rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <Zap className="w-4 h-4 text-apex-orange" />
            <span>Ajans Hizmetleri</span>
          </div>
          <p className="text-[11px] text-apex-muted leading-relaxed">
            Web, Özel Yazılım, Randevu Dashboard, Sosyal Medya, Çekim & Edit, Marka Kimliği.
          </p>
        </div>
      </div>
    </aside>
  );
};
