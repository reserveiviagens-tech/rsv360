import React from 'react';
import { Home, Key, MapPin, X, ArrowUpRight } from 'lucide-react';
import { lintelBtnGhost, lintelBtnPrimary, lintelEase, lintelIconBtn } from './overview-primitives';
import { getCrmCopy } from './crm-copy';
import { useCrmLocaleOptional } from './crm-locale-provider';
import type { CrmLocale } from './crm-locale';

export type PortfolioMapPinKind = 'sale' | 'rent' | 'offer' | 'closed';

export type PortfolioMapPriceTone = 'listing' | 'offer' | 'sold' | 'draft';

export type PortfolioMapPin = {
  id: string;
  top: string;
  left: string;
  kind: PortfolioMapPinKind;
  title: string;
  location: string;
  statusLabel: string;
  price: string;
  thumb: string;
  /** Sales map price marker color (Lintel). */
  priceTone?: PortfolioMapPriceTone;
};

export const PORTFOLIO_MAP_PINS: PortfolioMapPin[] = [
  {
    id: 'cedar',
    top: '38%',
    left: '42%',
    kind: 'sale',
    title: 'Cedar Ridge House',
    location: 'Julian',
    statusLabel: 'À venda',
    price: '$1.4M',
    thumb:
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 'hollis',
    top: '28%',
    left: '58%',
    kind: 'offer',
    title: 'Hollis Modern House',
    location: 'La Jolla',
    statusLabel: 'Em proposta',
    price: '$1.24M',
    thumb:
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 'quayside',
    top: '62%',
    left: '48%',
    kind: 'rent',
    title: 'Quayside Apartments',
    location: 'Marina',
    statusLabel: 'Locação',
    price: '$3,200/mo',
    thumb:
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 'arbor',
    top: '44%',
    left: '78%',
    kind: 'rent',
    title: 'Arbor Tower',
    location: 'Downtown',
    statusLabel: 'Locação',
    price: '$2,850/mo',
    thumb:
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 'linden',
    top: '52%',
    left: '34%',
    kind: 'closed',
    title: 'Linden Long House',
    location: 'Mission Hills',
    statusLabel: 'Vendido',
    price: '$1.56M',
    thumb:
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 'stonebrook',
    top: '72%',
    left: '62%',
    kind: 'closed',
    title: 'Stonebrook Cabin',
    location: 'Julian',
    statusLabel: 'Locado',
    price: '$2,800/mo',
    thumb:
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=120&q=80',
  },
];

const PIN_STYLE: Record<
  PortfolioMapPinKind,
  { bg: string; Icon: typeof Home }
> = {
  sale: { bg: 'bg-[#2f5bea]', Icon: Home },
  rent: { bg: 'bg-[#138a63]', Icon: Key },
  offer: { bg: 'bg-[#ff8a3d]', Icon: Home },
  closed: { bg: 'bg-gray-400 dark:bg-gray-500', Icon: Home },
};

const PRICE_MARKER_BG: Record<PortfolioMapPriceTone, string> = {
  listing: 'bg-slate-900',
  draft: 'bg-slate-900',
  offer: 'bg-orange-500',
  sold: 'bg-emerald-500',
};

function priceMarkerClass(pin: PortfolioMapPin): string {
  if (pin.priceTone) return PRICE_MARKER_BG[pin.priceTone];
  if (pin.kind === 'offer') return PRICE_MARKER_BG.offer;
  if (pin.kind === 'closed') return PRICE_MARKER_BG.sold;
  return PRICE_MARKER_BG.listing;
}

export function PortfolioMapLegend({ compact = false }: { compact?: boolean }) {
  const items = [
    { color: 'bg-[#2f5bea]', label: 'À venda' },
    { color: 'bg-[#138a63]', label: 'Locação' },
    { color: 'bg-[#ff8a3d]', label: 'Em proposta' },
    { color: 'bg-gray-400', label: 'Vendido/locado/rascunho' },
  ];
  return (
    <div
      className={`flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500 font-semibold ${
        compact ? 'justify-start' : 'justify-between'
      }`}
    >
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${item.color}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export type PortfolioMapPinVariant = 'icon' | 'price';

type PortfolioMapCanvasProps = {
  heightClass?: string;
  activePinId: string | null;
  onPinHover: (id: string | null) => void;
  onPinSelect?: (pin: PortfolioMapPin) => void;
  pins?: PortfolioMapPin[];
  pinVariant?: PortfolioMapPinVariant;
  mapSurfaceClass?: string;
};

export function PortfolioMapCanvas({
  heightClass = 'h-56',
  activePinId,
  onPinHover,
  onPinSelect,
  pins = PORTFOLIO_MAP_PINS,
  pinVariant = 'icon',
  mapSurfaceClass,
}: PortfolioMapCanvasProps) {
  const pinList = pins.length > 0 ? pins : PORTFOLIO_MAP_PINS;
  return (
    <div
      className={`relative ${heightClass} overflow-hidden rounded-xl border border-gray-200/60 dark:border-gray-700/60 ${
        mapSurfaceClass ?? 'bg-[#d9e2ec]'
      }`}
    >
      <img
        src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=900&q=80"
        alt=""
        className="h-full w-full object-cover opacity-75 grayscale-[0.15]"
      />
      {pinList.map((pin) => {
        const { bg, Icon } = PIN_STYLE[pin.kind];
        const active = activePinId === pin.id;
        return (
          <div
            key={pin.id}
            className="absolute z-10"
            style={{
              top: pin.top,
              left: pin.left,
              transform: pinVariant === 'price' ? 'translateX(-50%)' : undefined,
            }}
          >
            {active && (
              <div
                className={`lintel-map-tooltip absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 rounded-xl bg-white dark:bg-[#1d222c] border border-gray-100 dark:border-white/10 shadow-lg p-2 flex gap-2 pointer-events-none`}
                role="tooltip"
              >
                <img
                  src={pin.thumb}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover flex-none"
                />
                <div className="min-w-0 text-left">
                  <span className="text-[11px] font-black text-gray-900 dark:text-white block truncate">
                    {pin.title}
                  </span>
                  <span className="text-[10px] text-gray-500 block truncate">
                    {pin.location} · {pin.statusLabel}
                  </span>
                  <span className="text-[11px] font-black text-gray-900 dark:text-white">
                    {pin.price}
                  </span>
                </div>
              </div>
            )}
            {pinVariant === 'price' ? (
              <div className={`flex flex-col items-center drop-shadow-md ${active ? 'z-20' : ''}`}>
                <button
                  type="button"
                  aria-label={`${pin.title}, ${pin.statusLabel}, ${pin.price}`}
                  onMouseEnter={() => onPinHover(pin.id)}
                  onMouseLeave={() => onPinHover(null)}
                  onFocus={() => onPinHover(pin.id)}
                  onBlur={() => onPinHover(null)}
                  onClick={() => onPinSelect?.(pin)}
                  className={[
                    'max-w-[6rem] truncate rounded-md px-2 py-1 text-xs font-bold tabular-nums text-white transition-transform',
                    priceMarkerClass(pin),
                    lintelEase,
                    'hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80',
                    active ? 'scale-105 ring-2 ring-white/90' : '',
                  ].join(' ')}
                >
                  {pin.price}
                </button>
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-slate-900 dark:bg-slate-200" aria-hidden />
              </div>
            ) : (
              <button
                type="button"
                aria-label={`${pin.title}, ${pin.statusLabel}, ${pin.price}`}
                onMouseEnter={() => onPinHover(pin.id)}
                onMouseLeave={() => onPinHover(null)}
                onFocus={() => onPinHover(pin.id)}
                onBlur={() => onPinHover(null)}
                onClick={() => onPinSelect?.(pin)}
                className={[
                  `flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-white shadow-lg transition-transform ${bg}`,
                  lintelEase,
                  'hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5bea]/50',
                  active ? 'scale-110 ring-2 ring-white/90' : '',
                ].join(' ')}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

type PortfolioMapCardProps = {
  onExpand: () => void;
  activePinId: string | null;
  onPinHover: (id: string | null) => void;
  onPinSelect?: (pin: PortfolioMapPin) => void;
  pins?: PortfolioMapPin[];
  summaryLabel?: string;
};

export function PortfolioMapCard({
  onExpand,
  activePinId,
  onPinHover,
  onPinSelect,
  pins,
  summaryLabel,
}: PortfolioMapCardProps) {
  const subtitle = summaryLabel ?? '10 à venda · 6 para locar';
  return (
    <div className="lintel-overview-map lg:col-span-5 min-h-[340px] lg:min-h-[420px] rounded-2xl border border-white/80 bg-white/70 p-4 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-[#171b23]/80 flex flex-col justify-between lintel-card-hover">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold flex items-center gap-2 text-gray-900 dark:text-white">
            <MapPin className="w-4 h-4 text-gray-500" /> Mapa de Imóveis
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-semibold hidden sm:inline">
              {subtitle}
            </span>
            <button
              type="button"
              onClick={onExpand}
              aria-label="Expandir mapa da carteira"
              className={`w-7 h-7 ${lintelIconBtn}`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <PortfolioMapCanvas
          activePinId={activePinId}
          onPinHover={onPinHover}
          onPinSelect={onPinSelect}
          pins={pins}
        />
      </div>
      <div className="pt-2">
        <PortfolioMapLegend />
      </div>
    </div>
  );
}

export function PortfolioMapExpandModal({
  open,
  onClose,
  activePinId,
  onPinHover,
  onPinSelect,
  pins,
  summaryLabel,
}: {
  open: boolean;
  onClose: () => void;
  activePinId: string | null;
  onPinHover: (id: string | null) => void;
  onPinSelect?: (pin: PortfolioMapPin) => void;
  pins?: PortfolioMapPin[];
  summaryLabel?: string;
}) {
  const subtitle = summaryLabel ?? '10 à venda · 6 para locar';
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm lintel-overview-enter"
      role="dialog"
      aria-modal="true"
      aria-labelledby="portfolio-map-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-[26px] bg-white dark:bg-[#171b23] border border-white/80 dark:border-white/10 shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            id="portfolio-map-modal-title"
            className="text-base font-black flex items-center gap-2 text-gray-900 dark:text-white"
          >
            <MapPin className="w-4 h-4 text-gray-500" /> Mapa da carteira
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-semibold">
              {subtitle}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className={`w-9 h-9 ${lintelIconBtn}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <PortfolioMapCanvas
          heightClass="h-[min(52vh,420px)]"
          activePinId={activePinId}
          onPinHover={onPinHover}
          onPinSelect={onPinSelect}
          pins={pins}
        />
        <div className="mt-3">
          <PortfolioMapLegend compact />
        </div>
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={onClose} className={lintelBtnGhost + ' px-4 py-2'}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

export type BookViewingForm = {
  title: string;
  kind: string;
  assignedTo: string;
  date: string;
  time: string;
  withContact: string;
  property: string;
};

/** Valores estáveis do formulário (rótulo vem de `crm-copy` → forms.options.viewingKinds). */
export const VIEWING_KIND_VALUES = [
  'Viewing',
  'Call',
  'Task',
  'Open house',
  'Signing',
] as const;

/** @deprecated Use VIEWING_KIND_VALUES + locale copy */
export const BOOK_VIEWING_KINDS = VIEWING_KIND_VALUES;

export const BOOK_VIEWING_CONTACTS = [
  '—',
  'Priya Natarajan',
  'Spencer Hale',
  'Elise Marchetti',
  'Tom Castellano',
  'Ashby White',
  'Omar Saleh',
] as const;

export const BOOK_VIEWING_PROPERTIES = [
  'Hollis Modern House',
  'Cedar Ridge House',
  'Quayside Apartments',
  'Casa Alva',
  'Linden Long House',
  'Marea Desert Villa',
] as const;

export function BookViewingModal({
  open,
  onClose,
  form,
  onChange,
  onSave,
  locale,
  copy,
}: {
  open: boolean;
  onClose: () => void;
  form: BookViewingForm;
  onChange: (patch: Partial<BookViewingForm>) => void;
  onSave: () => void;
  /** @deprecated Prefer `locale` */
  copy?: 'pt' | 'en';
  locale?: CrmLocale;
}) {
  const crmLocale = useCrmLocaleOptional();
  const resolvedLocale = locale ?? copy ?? crmLocale?.locale ?? 'pt';
  const crm = getCrmCopy(resolvedLocale);
  const v = crm.modals.viewing;
  const kindLabels = crm.forms.options.viewingKinds;

  const propertyOptions = React.useMemo(() => {
    const list = [...BOOK_VIEWING_PROPERTIES];
    if (form.property && form.property !== '—' && !list.includes(form.property as (typeof BOOK_VIEWING_PROPERTIES)[number])) {
      return [form.property, ...list];
    }
    return list;
  }, [form.property]);

  if (!open) return null;

  const fieldClass =
    'w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1d222c] px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5bea]/30';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/35 backdrop-blur-md lintel-overview-enter"
      role="dialog"
      aria-modal="true"
      aria-labelledby="book-viewing-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[24px] bg-white dark:bg-[#171b23] border border-gray-100 dark:border-white/10 shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 id="book-viewing-title" className="text-lg font-black text-gray-900 dark:text-white">
            {v.title}
          </h2>
          <button type="button" onClick={onClose} aria-label={crm.common.close} className={`w-9 h-9 ${lintelIconBtn}`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <label className="block">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{v.titleField}</span>
            <input
              className={fieldClass + ' mt-1'}
              value={form.title}
              onChange={(e) => onChange({ title: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{v.kind}</span>
            <select
              className={fieldClass + ' mt-1'}
              value={form.kind}
              onChange={(e) => onChange({ kind: e.target.value })}
            >
              {VIEWING_KIND_VALUES.map((value, idx) => (
                <option key={value} value={value}>
                  {kindLabels[idx] ?? value}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{v.assigned}</span>
            <select
              className={fieldClass + ' mt-1'}
              value={form.assignedTo}
              onChange={(e) => onChange({ assignedTo: e.target.value })}
            >
              <option>Imani Brooks</option>
              <option>Camila Duarte</option>
              <option>Jordan Ellis</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{v.date}</span>
              <input
                type="date"
                className={fieldClass + ' mt-1'}
                value={form.date}
                onChange={(e) => onChange({ date: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{v.time}</span>
              <input
                type="time"
                className={fieldClass + ' mt-1'}
                value={form.time}
                onChange={(e) => onChange({ time: e.target.value })}
              />
            </label>
          </div>
          <label className="block">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{v.with}</span>
            <select
              className={fieldClass + ' mt-1'}
              value={form.withContact}
              onChange={(e) => onChange({ withContact: e.target.value })}
            >
              {BOOK_VIEWING_CONTACTS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{v.property}</span>
            <select
              className={fieldClass + ' mt-1'}
              value={form.property}
              onChange={(e) => onChange({ property: e.target.value })}
            >
              {propertyOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className={lintelBtnGhost + ' px-4 py-2'}>
            {crm.common.cancel}
          </button>
          <button type="button" onClick={onSave} className={lintelBtnPrimary + ' px-5 py-2.5'}>
            {v.save}
          </button>
        </div>
      </div>
    </div>
  );
}
