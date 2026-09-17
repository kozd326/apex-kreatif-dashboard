import { Shell } from '@/components/layout/Shell';
import { ProposalPrintDocument } from '@/components/proposals/ProposalPrintDocument';

export default function ProposalDocumentPage({ params }: { params: { id: string } }) {
  return <Shell><ProposalPrintDocument proposalId={params.id}/></Shell>;
}
