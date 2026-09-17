import { Suspense } from 'react';
import { Shell } from '@/components/layout/Shell';
import { ProposalBuilder } from '@/components/proposals/ProposalBuilder';

export default function NewProposalPage() {
  return <Shell><Suspense fallback={<p className="p-8 text-apex-muted">Teklif stüdyosu hazırlanıyor…</p>}><ProposalBuilder /></Suspense></Shell>;
}
