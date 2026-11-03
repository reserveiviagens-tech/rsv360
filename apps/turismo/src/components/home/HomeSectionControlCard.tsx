'use client';

import {
  ArrowDown,
  ArrowUp,
  ImageIcon,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  defaultCtaFor,
  isVideoUrl,
  type HomeSectionId,
  type HomeSectionPlacement,
} from '../../lib/home-sections';

type Props = {
  item: HomeSectionPlacement;
  index: number;
  section: HomeSectionId;
  total: number;
  onToggleActive: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function HomeSectionControlCard({
  item,
  index,
  section,
  total,
  onToggleActive,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
}: Props) {
  const cta = item.ctaHref || defaultCtaFor(section, item.entityType, item.entityId);
  const title = item.titleOverride || item.entityId;

  return (
    <li
      data-testid={`control-card-${item.id ?? index}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      {/* 16:9 preview */}
      <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-slate-800 to-blue-950">
        {item.imageUrl ? (
          isVideoUrl(item.imageUrl) ? (
            <video
              src={item.imageUrl}
              className="h-full w-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- admin thumb preview
            <img
              src={item.imageUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-8 w-8 text-slate-400" aria-hidden />
          </div>
        )}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
          {item.badgeText ? (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow">
              {item.badgeText}
            </span>
          ) : null}
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase shadow ${
              item.isActive ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'
            }`}
          >
            {item.isActive ? 'Ativo' : 'Inativo'}
          </span>
        </div>
        <span className="absolute bottom-2 right-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          #{index + 1}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1 px-4 pt-3">
        <h3 className="line-clamp-1 text-sm font-bold text-slate-900">{title}</h3>
        <p className="text-[11px] text-slate-500">
          {item.entityType} · {item.entityId}
        </p>
        {item.subtitleOverride ? (
          <p className="line-clamp-2 text-xs text-slate-600">{item.subtitleOverride}</p>
        ) : null}
        <p className="mt-1 break-all font-mono text-[10px] text-blue-700">{cta}</p>
      </div>

      {/* Footer actions — Fitts 44px */}
      <div
        className="mt-3 flex flex-wrap items-stretch gap-1.5 border-t border-slate-100 bg-slate-50/80 px-2 py-2"
        data-testid={`control-card-actions-${item.id ?? index}`}
      >
        <button
          type="button"
          data-testid={`btn-toggle-active-${item.id ?? index}`}
          onClick={onToggleActive}
          className={`inline-flex min-h-[44px] min-w-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-colors ${
            item.isActive
              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          {item.isActive ? 'Ativo' : 'Inativo'}
        </button>
        <button
          type="button"
          aria-label="Mover para cima"
          data-testid={`btn-move-up-${item.id ?? index}`}
          disabled={index === 0}
          onClick={onMoveUp}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-white disabled:opacity-40"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Mover para baixo"
          data-testid={`btn-move-down-${item.id ?? index}`}
          disabled={index >= total - 1}
          onClick={onMoveDown}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-white disabled:opacity-40"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Editar"
          data-testid={`btn-edit-${item.id ?? index}`}
          onClick={onEdit}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Excluir"
          data-testid={`btn-delete-${item.id ?? index}`}
          onClick={onDelete}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}
