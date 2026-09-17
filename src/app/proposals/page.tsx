'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ExternalLink, FileDown, FilePlus2, Send, Sparkles } from 'lucide-react';
import { Shell } from '@/components/layout/Shell';
import { Proposal, ProposalStatus, TeamMember } from '@/types';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';

const statusStyles: Record<ProposalStatus, string> = {
  Taslak: 'border-apex-border bg-apex-dark text-apex-muted',
  Gönderildi: 'border-apex-blue/40 bg-apex-blue-light text-apex-blue',
  Revizyon: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  Kabul: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  Reddedildi: 'border-red-400/30 bg-red-400/10 text-red-200',
};

export default function ProposalsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const configured = isSupabaseConfigured();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState<{ clientName: string; projectId: string } | null>(null);

  const load = useCallback(async () => {
    if (!configured) {
      setError('Supabase bağlantısı kurulmadan teklif listesi açılamaz.');
      return;
    }
    const [proposalResult, sessionResult] = await Promise.all([
      supabase.from('proposals').select('*').order('created_at', { ascending: false }),
      supabase.auth.getSession(),
    ]);
    if (proposalResult.error) {
      setError(`Teklifler yüklenemedi: ${proposalResult.error.message}`);
      return;
    }
    setProposals((proposalResult.data || []) as Proposal[]);
    const session = sessionResult.data.session;
    if (session?.user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
      if (data) setCurrentUser(data as TeamMember);
    }
    setError('');
  }, [configured, supabase]);

  useEffect(() => {
    load();
    if (!configured) return;
    const channel = supabase
      .channel('proposals-realtime-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposals' }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [configured, load, supabase]);

  const changeStatus = async (proposal: Proposal, nextStatus: ProposalStatus) => {
    if (!configured || proposal.status === 'Kabul') return;
    setError('');

    if (nextStatus === 'Kabul') {
      const confirmed = window.confirm(
        `“${proposal.lead_name}” teklifini kabul edilmiş olarak işaretlemek istiyor musunuz?\n\nBu işlem otomatik olarak:\n1. Müşteri 360° kartını oluşturur\n2. Aktif projeyi başlatır\n3. Kapora ve bakiye ödeme planını açar\n4. Başlangıç görevlerini atar.`
      );
      if (!confirmed) return;

      const { data: projectId, error: acceptError } = await supabase.rpc('crm_accept_proposal', {
        p_proposal: proposal.id,
        p_deposit_percent: 50,
      });

      if (acceptError) {
        setError(`Teklif kabul edilemedi: ${acceptError.message}`);
        return;
      }

      // Automatically generate standard onboarding tasks for the project
      if (projectId && currentUser) {
        const starterTasks = [
          {
            project_id: projectId,
            lead_id: proposal.lead_id || null,
            title: `Kickoff Toplantısı: ${proposal.lead_name}`,
            priority: 'Yüksek' as const,
            status: 'Yapılacak',
            assigned_to: currentUser.id,
            assigned_name: currentUser.name,
            due_date: new Date(Date.now() + 2 * 86400000).toISOString(),
          },
          {
            project_id: projectId,
            lead_id: proposal.lead_id || null,
            title: `Marka Başlangıç Brief'ini Doldurma & Onay`,
            priority: 'Yüksek' as const,
            status: 'Yapılacak',
            assigned_to: currentUser.id,
            assigned_name: currentUser.name,
            due_date: new Date(Date.now() + 4 * 86400000).toISOString(),
          },
          {
            project_id: projectId,
            lead_id: proposal.lead_id || null,
            title: `Kapora Tahsilat Takibi (%50)`,
            priority: 'Yüksek' as const,
            status: 'Yapılacak',
            assigned_to: currentUser.id,
            assigned_name: currentUser.name,
            due_date: new Date(Date.now() + 3 * 86400000).toISOString(),
          },
          {
            project_id: projectId,
            lead_id: proposal.lead_id || null,
            title: `Tasarım / İçerik Konsept Taslaklarını Hazırlama`,
            priority: 'Orta' as const,
            status: 'Yapılacak',
            assigned_to: currentUser.id,
            assigned_name: currentUser.name,
            due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
          },
        ];

        await supabase.from('tasks').insert(starterTasks);
      }

      setSuccessInfo({ clientName: proposal.lead_name, projectId: String(projectId || '') });
      await load();
      return;
    }

    const { error: updateError } = await supabase
      .from('proposals')
      .update({ status: nextStatus })
      .eq('id', proposal.id)
      .neq('status', 'Kabul');

    if (updateError) {
      setError(`Teklif durumu güncellenemedi: ${updateError.message}`);
      return;
    }

    if (nextStatus === 'Gönderildi' && proposal.lead_id) {
      await supabase
        .from('leads')
        .update({ status: 'Teklif Gönderildi', last_contact_date: new Date().toISOString().slice(0, 10) })
        .eq('id', proposal.lead_id);
    }

    await load();
  };

  const canWrite = currentUser && ['Yönetici', 'Satış'].includes(currentUser.role);
  const sent = proposals.filter((item) => item.status === 'Gönderildi' || item.status === 'Revizyon').length;
  const drafts = proposals.filter((item) => item.status === 'Taslak').length;

  return (
    <Shell>
      <div className="space-y-6 pb-12">
        <section className="relative overflow-hidden rounded-3xl border border-apex-border bg-apex-card p-6">
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-apex-blue/25 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.22em] text-apex-orange">APEX teklif stüdyosu</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Teklifler, müşteri dosyasının bir parçası.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-apex-muted">
                Kapsam, iş planı, yatırım ve ödeme bilgilerini PDF’deki APEX standardında hazırlayın. Teklif kabul edildiğinde tek tuşla proje, marka kartı ve görevler otomatik oluşur.
              </p>
            </div>
            {canWrite && (
              <Link
                href="/proposals/new"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-apex-orange px-5 py-3 text-sm font-black text-white shadow-lg shadow-apex-orange/20 transition hover:bg-apex-orange-hover"
              >
                <FilePlus2 className="h-4 w-4" />
                Yeni teklif oluştur
              </Link>
            )}
          </div>
        </section>

        {/* Success Feedback Modal for Accepted Proposal */}
        {successInfo && (
          <div className="rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-wider">
                <Sparkles className="h-4 w-4" />
                <span>Teklif Kabul Edildi ve Projeye Dönüştü!</span>
              </div>
              <h3 className="text-lg font-black text-white mt-1">
                &ldquo;{successInfo.clientName}&rdquo; için proje, ödeme planı ve 4 başlangıç görevi hazırlandı.
              </h3>
              <p className="text-xs text-neutral-300 mt-1">
                WhatsApp notlarında kaybolmadan tüm operasyonu Müşteri 360° veya Projeler panelinden yönetebilirsiniz.
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                href="/brands"
                className="rounded-xl bg-white px-4 py-2.5 text-xs font-black text-apex-dark shadow hover:bg-neutral-200 transition"
              >
                Müşteri 360° Aç →
              </Link>
              <button
                type="button"
                onClick={() => setSuccessInfo(null)}
                className="rounded-xl border border-white/20 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-white/10"
              >
                Kapat
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Taslaklar" value={String(drafts)} hint="Henüz müşteriyle paylaşılmadı" />
          <Metric label="Takipteki teklifler" value={String(sent)} hint="Gönderildi veya revizyonda" />
          <Metric
            label="Kabul edilen"
            value={String(proposals.filter((item) => item.status === 'Kabul').length)}
            hint="Projeye dönüştürüldü"
          />
        </div>

        {error && <p className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">{error}</p>}

        <section className="overflow-hidden rounded-2xl border border-apex-border bg-apex-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="border-b border-apex-border bg-apex-dark/75 text-[10px] font-black uppercase tracking-[.13em] text-apex-muted">
                <tr>
                  <th className="px-5 py-4">Müşteri / teklif</th>
                  <th className="px-4 py-4">Hizmet</th>
                  <th className="px-4 py-4 text-right">Net teklif</th>
                  <th className="px-4 py-4">Geçerlilik</th>
                  <th className="px-4 py-4">Durum</th>
                  <th className="px-5 py-4 text-right">Aksiyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apex-border/60">
                {proposals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center text-sm text-apex-muted">
                      Henüz teklif yok. İlk teklifiniz; müşteri kartında ve proje dönüşümünde de görünür.
                    </td>
                  </tr>
                ) : (
                  proposals.map((proposal) => (
                    <tr key={proposal.id} className="transition hover:bg-apex-hover/45">
                      <td className="px-5 py-4">
                        <p className="font-bold text-white">{proposal.lead_name}</p>
                        <p className="mt-1 max-w-[280px] truncate text-xs text-apex-muted">{proposal.title}</p>
                      </td>
                      <td className="px-4 py-4 text-xs font-semibold text-neutral-200">{proposal.service_package}</td>
                      <td className="px-4 py-4 text-right font-mono text-sm font-black text-emerald-300">
                        {formatCurrency(Number(proposal.amount))}
                      </td>
                      <td className="px-4 py-4 text-xs text-apex-muted">
                        {proposal.valid_until ? formatDate(proposal.valid_until) : 'Belirtilmedi'}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${statusStyles[proposal.status]}`}>
                          {proposal.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/proposals/${proposal.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-apex-border px-2.5 py-2 text-xs font-bold text-apex-muted hover:border-apex-blue hover:text-white"
                            title="Teklif belgesini aç"
                          >
                            <FileDown className="h-4 w-4" />
                            PDF
                          </Link>
                          {canWrite && proposal.status === 'Taslak' && (
                            <button
                              onClick={() => changeStatus(proposal, 'Gönderildi')}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-apex-blue/50 bg-apex-blue-light px-2.5 py-2 text-xs font-bold text-apex-blue hover:text-white"
                            >
                              <Send className="h-4 w-4" />
                              Gönderildi
                            </button>
                          )}
                          {canWrite && proposal.status !== 'Kabul' && proposal.status !== 'Reddedildi' && (
                            <button
                              onClick={() => changeStatus(proposal, 'Kabul')}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-apex-orange px-2.5 py-2 text-xs font-black text-white hover:bg-apex-orange-hover shadow"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Kabul & Proje
                            </button>
                          )}
                          {proposal.status === 'Kabul' && (
                            <span className="inline-flex items-center gap-1.5 px-2 text-xs font-bold text-emerald-300">
                              <Sparkles className="h-4 w-4" />
                              Projeye Dönüştü
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="flex items-start gap-2 rounded-2xl border border-apex-blue/25 bg-apex-blue-light p-4 text-xs leading-5 text-apex-muted">
          <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-apex-blue" />
          “Gönderildi” düğmesi yalnızca paneldeki satış aşamasını günceller; e-posta/WhatsApp üzerinden hiçbir belge otomatik olarak iletilmez.
        </p>
      </div>
    </Shell>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-apex-border bg-apex-card p-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-apex-muted">{label}</p>
      <p className="mt-2 text-2xl font-black font-mono text-white">{value}</p>
      <p className="mt-1 text-[11px] text-apex-muted">{hint}</p>
    </div>
  );
}
