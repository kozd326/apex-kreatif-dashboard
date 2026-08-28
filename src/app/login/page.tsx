'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Lock, Mail, ArrowRight, AlertTriangle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isConfigured = isSupabaseConfigured();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    if (!isConfigured) {
      setErrorMsg('Supabase bağlantı bilgileri unconfigured. Lütfen .env.local dosyasını doldurun.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message === 'Invalid login credentials' ? 'Geçersiz e-posta adresi veya şifre.' : error.message);
      } else if (data.session) {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Giriş sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-apex-dark text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-apex-card border border-apex-border rounded-3xl p-8 space-y-6 shadow-2xl">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-apex-orange flex items-center justify-center font-black text-white text-xl transform -skew-x-12 mx-auto shadow-lg shadow-apex-orange/30">
            A
          </div>
          <h1 className="text-2xl font-black tracking-widest text-white">APEX KREATİF</h1>
          <p className="text-xs text-apex-muted">Sales & Project Management CRM Portal</p>
        </div>

        {/* Supabase Connection Warning */}
        {!isConfigured && (
          <div className="bg-amber-950/80 border border-amber-800 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Supabase Bağlantısı Gerekli</strong>
              <span>`.env.local` dosyasında NEXT_PUBLIC_SUPABASE_URL ve ANON_KEY değerlerini tanımlayın.</span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-rose-950/80 border border-rose-800 rounded-xl p-3.5 text-xs text-rose-300 font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Real Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-apex-muted mb-1">E-posta Adresi</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-apex-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kaan@apexkreatif.com"
                className="w-full bg-apex-dark border border-apex-border rounded-xl text-xs text-white pl-9 pr-4 py-3 focus:border-apex-orange focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-apex-muted mb-1">Şifre</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-apex-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-apex-dark border border-apex-border rounded-xl text-xs text-white pl-9 pr-4 py-3 focus:border-apex-orange focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-apex-orange hover:bg-apex-orange-hover disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-apex-orange/20 flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-apex-border text-center">
          <p className="text-[11px] text-apex-muted font-mono">
            Sadece davetli APEX KREATİF ekip üyeleri erişebilir.
          </p>
        </div>
      </div>
    </div>
  );
}
