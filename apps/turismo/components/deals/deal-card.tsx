import { ArrowUpRight, MapPin, Building2 } from 'lucide-react';

export type DealStage = 'viewing' | 'offer' | 'negotiation' | 'under_contract' | 'closed';

export interface Deal {
  id: string;
  agentId: string;
  agentName: string;
  propertyId: string;
  propertyName: string;
  location: string;
  propertyType: string;
  beds: number;
  baths: number;
  sqft: number;
  price: number;
  commission: number;
  stage: DealStage;
  nextStep?: string;
  createdAt: string;
  updatedAt: string;
  listingSource?: 'zillow' | 'realtor' | 'direct';
  status: 'active' | 'won' | 'lost' | 'pending';
  notes?: string;
}

export const DEAL_STAGES: { id: DealStage; label: string; hint: string }[] = [
  { id: 'viewing', label: 'Viewing', hint: 'Agendamentos' },
  { id: 'offer', label: 'Oferta', hint: 'Propostas' },
  { id: 'negotiation', label: 'Negociação', hint: 'Objetivando' },
  { id: 'under_contract', label: 'Encerro', hint: 'Contrato' },
  { id: 'closed', label: 'Fechado', hint: 'Concluído' },
];

export function formatPrice(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value}`;
}

export function DealCard({
  deal,
  onDragStart,
}: {
  deal: Deal;
  onDragStart: (id: string) => void;
}) {
  const stageIndex = DEAL_STAGES.findIndex((s) => s.id === deal.stage);

  return (
    <div
      className="group cursor-grab active:cursor-grabbing border border-slate-200/80 rounded-2xl bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-slate-300"
      onDragStart={(e) => {
        onDragStart(deal.id);
        e.dataTransfer.setData('text/plain', deal.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      draggable
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#121722] flex items-center justify-center text-white shrink-0">
            {deal.propertyType === 'House' ? (
              <Building2 className="w-5 h-5" />
            ) : (
              <MapPin className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0 leading-tight">
            <p className="font-semibold text-sm text-slate-900 truncate">
              {deal.propertyName}
            </p>
            <p className="text-xs text-slate-500 truncate">{deal.location}</p>
          </div>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
          {deal.beds}B / {deal.baths}b
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-lg font-black text-slate-900 tracking-tight">
          {formatPrice(deal.price)}
        </span>
        <span className="text-xs text-slate-400">{deal.propertyType}</span>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium text-slate-700">{deal.agentName}</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
        </div>
        <span className="text-[11px] font-semibold text-slate-400">
          Comissão {formatPrice(deal.commission)}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        {Array.from({ length: 5 }, (_, i) => (
          <svg
            key={i}
            className={`w-3.5 h-3.5 ${i < Math.ceil((deal.beds + deal.baths) / 2) ? 'text-[#121722]' : 'text-slate-300'}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    </div>
  );
}
