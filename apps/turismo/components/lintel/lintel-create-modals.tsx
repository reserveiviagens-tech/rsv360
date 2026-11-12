'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { X } from 'lucide-react';
import { lintelBtnGhost, lintelBtnPrimary, lintelIconBtn } from './overview-primitives';
import {
  BookViewingModal,
  type BookViewingForm,
  BOOK_VIEWING_PROPERTIES,
} from './portfolio-map';
import { getCrmCopy } from './crm-copy';
import { useCrmLocaleOptional } from './crm-locale-provider';
import {
  buildViewingFormFromPrefill,
  contactNoteFromRental,
  leadPrefillFromRental,
  type LintelCreatePrefill,
} from './lintel-create-prefill';

export type LintelCreateModalId =
  | 'listing-sale'
  | 'listing-rental'
  | 'offer'
  | 'lead'
  | 'contact'
  | 'viewing';

const FIELD =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5bea]/35 dark:border-slate-600 dark:bg-[#1d222c] dark:text-white';

const LABEL = 'text-xs font-bold text-slate-500 dark:text-slate-400';

const AGENTS = ['Imani Brooks', 'Camila Duarte', 'Jordan Ellis', 'Henrik Dahl'] as const;
const SELLERS = ['Elise Marchetti', 'Ingrid Solberg', 'Marcus Adebayo', 'Ashby White'] as const;
const PROPERTIES = [...BOOK_VIEWING_PROPERTIES];
const PROPERTY_TYPE_SALE_VALUES = ['House', 'Condo', 'Apartment', 'Land'] as const;
const PROPERTY_TYPE_RENTAL_VALUES = ['House', 'Condo', 'Apartment'] as const;
const LEAD_SOURCE_VALUES = ['Website', 'Referral', 'Portal', 'Open house', 'Social'] as const;
const LOOKING_VALUES = ['Buy', 'Rent', 'Sell', 'Invest'] as const;
const CONTACT_TYPE_VALUES = ['Buyer', 'Seller', 'Agent', 'Partner'] as const;
const OFFER_STAGE_VALUES = ['Offer', 'Negotiation'] as const;

function LintelModalShell({
  title,
  subtitle,
  onClose,
  closeLabel = 'Close',
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  closeLabel?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/35 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col rounded-[24px] border border-slate-100 bg-white shadow-2xl dark:border-white/10 dark:bg-[#171b23]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-6 py-5 dark:border-slate-700/80">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label={closeLabel} className={`h-9 w-9 ${lintelIconBtn}`}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{children}</div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-slate-700/80">
          {footer}
        </div>
      </div>
    </div>
  );
}

function FooterActions({
  onClose,
  primaryLabel,
  onPrimary,
  cancelLabel = 'Cancel',
}: {
  onClose: () => void;
  primaryLabel: string;
  onPrimary: () => void;
  cancelLabel?: string;
}) {
  return (
    <>
      <button type="button" onClick={onClose} className={`${lintelBtnGhost} px-4 py-2`}>
        {cancelLabel}
      </button>
      <button type="button" onClick={onPrimary} className={`${lintelBtnPrimary} px-5 py-2.5`}>
        {primaryLabel}
      </button>
    </>
  );
}

function ListingForSaleModal({ onClose, onDraft }: { onClose: () => void; onDraft: () => void }) {
  const crm = useCrmLocaleOptional();
  const c = crm?.copy ?? getCrmCopy('pt');
  const m = c.modals.listingSale;
  const L = c.forms.labels;
  const O = c.forms.options;
  const P = c.forms.placeholders;
  return (
    <LintelModalShell
      title={m.title}
      subtitle={m.subtitle}
      onClose={onClose}
      closeLabel={c.common.close}
      footer={
        <FooterActions
          onClose={onClose}
          primaryLabel={m.primary}
          onPrimary={onDraft}
          cancelLabel={c.common.cancel}
        />
      }
    >
      <FormGrid
        fields={[
          { id: 'name', span: 2, label: L.propertyName, placeholder: P.propertyName },
          { id: 'street', label: L.streetAddress, defaultValue: '12 Juniper Court' },
          { id: 'hood', label: L.neighbourhood, defaultValue: 'North Park' },
          { id: 'price', label: L.askingPrice, type: 'number' },
          {
            id: 'type',
            label: L.type,
            select: [...PROPERTY_TYPE_SALE_VALUES],
            selectLabels: O.propertyTypeSale,
          },
          { id: 'beds', label: L.bedrooms, defaultValue: '3' },
          { id: 'baths', label: L.bathrooms, defaultValue: '2' },
          { id: 'area', label: L.area, defaultValue: '1800' },
          { id: 'seller', label: L.seller, select: [...SELLERS] },
          { id: 'agent', span: 2, label: L.listingAgent, select: [...AGENTS], defaultValue: 'Imani Brooks' },
        ]}
      />
    </LintelModalShell>
  );
}

function ListingRentalModal({ onClose, onDraft }: { onClose: () => void; onDraft: () => void }) {
  const crm = useCrmLocaleOptional();
  const c = crm?.copy ?? getCrmCopy('pt');
  const m = c.modals.listingRental;
  const L = c.forms.labels;
  const O = c.forms.options;
  const P = c.forms.placeholders;
  return (
    <LintelModalShell
      title={m.title}
      subtitle={m.subtitle}
      onClose={onClose}
      closeLabel={c.common.close}
      footer={
        <FooterActions
          onClose={onClose}
          primaryLabel={m.primary}
          onPrimary={onDraft}
          cancelLabel={c.common.cancel}
        />
      }
    >
      <FormGrid
        fields={[
          { id: 'name', span: 2, label: L.propertyName, placeholder: P.propertyName },
          { id: 'street', label: L.streetAddress, defaultValue: '12 Juniper Court' },
          { id: 'hood', label: L.neighbourhood, defaultValue: 'North Park' },
          { id: 'rent', label: L.monthlyRent, type: 'number' },
          {
            id: 'type',
            label: L.type,
            select: [...PROPERTY_TYPE_RENTAL_VALUES],
            selectLabels: O.propertyTypeRental,
            defaultValue: 'House',
          },
          { id: 'beds', label: L.bedrooms, defaultValue: '3' },
          { id: 'baths', label: L.bathrooms, defaultValue: '2' },
          { id: 'area', label: L.area, defaultValue: '1800' },
          { id: 'landlord', label: L.landlord, select: [...SELLERS], defaultValue: 'Ingrid Solberg' },
          { id: 'agent', span: 2, label: L.listingAgent, select: [...AGENTS], defaultValue: 'Imani Brooks' },
        ]}
      />
    </LintelModalShell>
  );
}

function OfferModal({ onClose, onAdd }: { onClose: () => void; onAdd: () => void }) {
  const crm = useCrmLocaleOptional();
  const c = crm?.copy ?? getCrmCopy('pt');
  const m = c.modals.offer;
  const L = c.forms.labels;
  const O = c.forms.options;
  const P = c.forms.placeholders;
  return (
    <LintelModalShell
      title={m.title}
      subtitle={m.subtitle}
      onClose={onClose}
      closeLabel={c.common.close}
      footer={
        <FooterActions
          onClose={onClose}
          primaryLabel={m.primary}
          onPrimary={onAdd}
          cancelLabel={c.common.cancel}
        />
      }
    >
      <FormGrid
        fields={[
          { id: 'property', span: 2, label: L.property, select: PROPERTIES, defaultValue: 'Hollis Modern House' },
          { id: 'from', label: L.from, select: ['Marcus Adebayo', 'Priya Natarajan', 'Spencer Hale'] },
          { id: 'amount', label: L.amount, type: 'number' },
          {
            id: 'stage',
            label: L.stage,
            select: [...OFFER_STAGE_VALUES],
            selectLabels: O.offerStages,
            defaultValue: 'Offer',
          },
          { id: 'close', label: L.targetClose, type: 'date' },
          { id: 'note', span: 2, label: L.note, textarea: true, placeholder: P.offerNote },
        ]}
      />
    </LintelModalShell>
  );
}

function LeadModal({
  onClose,
  onAdd,
  prefill,
}: {
  onClose: () => void;
  onAdd: () => void;
  prefill: LintelCreatePrefill | null;
}) {
  const crm = useCrmLocaleOptional();
  const c = crm?.copy ?? getCrmCopy('pt');
  const locale = crm?.locale ?? 'pt';
  const m = c.modals.lead;
  const L = c.forms.labels;
  const O = c.forms.options;
  const leadDefaults = leadPrefillFromRental(prefill, locale);
  const extraInterest =
    leadDefaults?.interest && !PROPERTIES.includes(leadDefaults.interest) ? leadDefaults.interest : null;
  const interestSelect = extraInterest ? (['—', extraInterest, ...PROPERTIES] as string[]) : (['—', ...PROPERTIES] as string[]);
  const interestLabels = extraInterest
    ? [L.none, extraInterest, ...PROPERTIES]
    : [L.none, ...PROPERTIES];
  return (
    <LintelModalShell
      title={m.title}
      subtitle={m.subtitle}
      onClose={onClose}
      closeLabel={c.common.close}
      footer={
        <FooterActions
          onClose={onClose}
          primaryLabel={m.primary}
          onPrimary={onAdd}
          cancelLabel={c.common.cancel}
        />
      }
    >
      <FormGrid
        fields={[
          { id: 'name', label: L.name },
          { id: 'email', label: L.email, type: 'email' },
          { id: 'phone', label: L.phone, type: 'tel' },
          {
            id: 'source',
            label: L.source,
            select: [...LEAD_SOURCE_VALUES],
            selectLabels: O.leadSources,
            defaultValue: 'Website',
          },
          {
            id: 'looking',
            label: L.lookingTo,
            select: [...LOOKING_VALUES],
            selectLabels: O.looking,
            defaultValue: leadDefaults?.looking ?? 'Buy',
          },
          { id: 'budget', label: L.budget, type: 'number' },
          { id: 'area', label: L.areaInterest, defaultValue: leadDefaults?.area ?? 'La Jolla' },
          {
            id: 'interest',
            label: L.interestedIn,
            select: interestSelect,
            selectLabels: interestLabels,
            defaultValue: leadDefaults?.interest ?? '—',
          },
          { id: 'message', span: 2, label: L.message, textarea: true, defaultValue: leadDefaults?.message },
        ]}
      />
    </LintelModalShell>
  );
}

function ContactModal({
  onClose,
  onAdd,
  prefill,
}: {
  onClose: () => void;
  onAdd: () => void;
  prefill: LintelCreatePrefill | null;
}) {
  const crm = useCrmLocaleOptional();
  const c = crm?.copy ?? getCrmCopy('pt');
  const locale = crm?.locale ?? 'pt';
  const m = c.modals.contact;
  const L = c.forms.labels;
  const O = c.forms.options;
  const ownerNote = contactNoteFromRental(prefill, locale);
  return (
    <LintelModalShell
      title={m.title}
      subtitle={m.subtitle}
      onClose={onClose}
      closeLabel={c.common.close}
      footer={
        <FooterActions
          onClose={onClose}
          primaryLabel={c.modals.contactPrimary}
          onPrimary={onAdd}
          cancelLabel={c.common.cancel}
        />
      }
    >
      <FormGrid
        fields={[
          { id: 'fullName', span: 2, label: L.fullName },
          {
            id: 'type',
            label: L.contactType,
            select: [...CONTACT_TYPE_VALUES],
            selectLabels: O.contactTypes,
            defaultValue: 'Buyer',
          },
          { id: 'city', label: L.city, defaultValue: 'San Diego' },
          { id: 'email', label: L.email, type: 'email' },
          { id: 'phone', label: L.phone, type: 'tel' },
          { id: 'note', span: 2, label: L.note, textarea: true, defaultValue: ownerNote },
        ]}
      />
    </LintelModalShell>
  );
}

type FieldSpec = {
  id: string;
  label: string;
  span?: 1 | 2;
  placeholder?: string;
  defaultValue?: string;
  type?: string;
  select?: string[];
  selectLabels?: string[];
  textarea?: boolean;
};

function FormGrid({ fields }: { fields: FieldSpec[] }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {fields.map((f) => (
        <label key={f.id} className={f.span === 2 ? 'col-span-2 block' : 'block'}>
          <span className={LABEL}>{f.label}</span>
          {f.textarea ? (
            <textarea className={`${FIELD} min-h-[88px] resize-y`} placeholder={f.placeholder} defaultValue={f.defaultValue} />
          ) : f.select ? (
            <select className={FIELD} defaultValue={f.defaultValue ?? f.select[0]}>
              {f.select.map((opt, idx) => (
                <option key={opt} value={opt}>
                  {f.selectLabels?.[idx] ?? opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              className={FIELD}
              type={f.type ?? 'text'}
              placeholder={f.placeholder}
              defaultValue={f.defaultValue}
            />
          )}
        </label>
      ))}
    </div>
  );
}

function defaultViewingForm(): BookViewingForm {
  const today = new Date();
  const iso = today.toISOString().slice(0, 10);
  return {
    title: '',
    kind: 'Viewing',
    assignedTo: 'Imani Brooks',
    date: iso,
    time: '12:30',
    withContact: '—',
    property: '—',
  };
}

export function LintelCreateModalHost({
  modal,
  prefill,
  onClose,
}: {
  modal: LintelCreateModalId | null;
  prefill: LintelCreatePrefill | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const crm = useCrmLocaleOptional();
  const locale = crm?.locale ?? 'pt';
  const [viewing, setViewing] = useState<BookViewingForm>(defaultViewingForm);

  useEffect(() => {
    if (modal === 'viewing') {
      setViewing(buildViewingFormFromPrefill(defaultViewingForm(), prefill, locale));
    }
  }, [modal, prefill, locale]);

  const saveDraftListing = useCallback(
    (mode: 'sale' | 'rental') => {
      onClose();
      const qs = mode === 'rental' ? '?tipo=aluguel&draft=1' : '?draft=1';
      void router.push(`/anfitriao/unidades${qs}`);
    },
    [onClose, router],
  );

  const demoSaved = useCallback(
    (redirect?: string) => {
      onClose();
      if (redirect) void router.push(redirect);
    },
    [onClose, router],
  );

  if (!modal) return null;

  if (modal === 'listing-sale') {
    return <ListingForSaleModal onClose={onClose} onDraft={() => saveDraftListing('sale')} />;
  }
  if (modal === 'listing-rental') {
    return <ListingRentalModal onClose={onClose} onDraft={() => saveDraftListing('rental')} />;
  }
  if (modal === 'offer') {
    return <OfferModal onClose={onClose} onAdd={() => demoSaved('/deals')} />;
  }
  if (modal === 'lead') {
    return <LeadModal prefill={prefill} onClose={onClose} onAdd={() => demoSaved('/leads')} />;
  }
  if (modal === 'contact') {
    return <ContactModal prefill={prefill} onClose={onClose} onAdd={() => demoSaved('/overview')} />;
  }
  if (modal === 'viewing') {
    return (
      <BookViewingModal
        open
        locale={crm?.locale}
        onClose={onClose}
        form={viewing}
        onChange={(patch) => setViewing((prev) => ({ ...prev, ...patch }))}
        onSave={() => demoSaved('/deals')}
      />
    );
  }

  return null;
}
