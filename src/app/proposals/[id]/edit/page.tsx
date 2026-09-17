import { Suspense } from 'react';
import { Shell } from '@/components/layout/Shell';
import { ProposalBuilder } from '@/components/proposals/ProposalBuilder';

export default function EditProposalPage({ params }: { params: { id: string } }) {
  return (
    <Shell>
      <Suspense fallback={<p className="p-8 text-apex-muted">Teklif düzenleme hazırlanıyor…</p>}>
        <ProposalBuilder proposalId={params.id} />
      </Suspense>
    </Shell>
  );
}
