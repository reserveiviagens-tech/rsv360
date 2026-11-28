import type { BookViewingForm } from './portfolio-map';
import { BOOK_VIEWING_PROPERTIES } from './portfolio-map';
import type { CrmLocale } from './crm-locale';
import { getCrmCopy } from './crm-copy';

export type RentalPropertyPrefill = {
  id: string;
  name: string;
  address: string;
  area: string;
};

export type LintelCreatePrefill = {
  rentalProperty?: RentalPropertyPrefill;
};

function resolveViewingPropertyName(name: string): string {
  if (BOOK_VIEWING_PROPERTIES.includes(name as (typeof BOOK_VIEWING_PROPERTIES)[number])) {
    return name;
  }
  const fuzzy = BOOK_VIEWING_PROPERTIES.find((p) => name.toLowerCase().includes(p.toLowerCase().split(' ')[0]!));
  return fuzzy ?? name;
}

export function buildViewingFormFromPrefill(
  base: BookViewingForm,
  prefill: LintelCreatePrefill | null,
  locale: CrmLocale,
): BookViewingForm {
  const rental = prefill?.rentalProperty;
  if (!rental) return base;

  const title =
    locale === 'en'
      ? `Viewing — ${rental.name}`
      : `Visita — ${rental.name}`;

  return {
    ...base,
    title,
    kind: locale === 'en' ? 'Viewing' : 'Viewing',
    property: resolveViewingPropertyName(rental.name),
  };
}

export function leadPrefillFromRental(
  prefill: LintelCreatePrefill | null,
  locale: CrmLocale,
): { interest: string; looking: string; message: string; area: string } | null {
  const rental = prefill?.rentalProperty;
  if (!rental) return null;
  const msg =
    locale === 'en'
      ? `Rental request for ${rental.name} (${rental.address}, ${rental.area}).`
      : `Solicitação de locação — ${rental.name} (${rental.address}, ${rental.area}).`;
  return {
    interest: rental.name,
    looking: 'Rent',
    message: msg,
    area: rental.area,
  };
}

export function contactNoteFromRental(prefill: LintelCreatePrefill | null, locale: CrmLocale): string | undefined {
  const rental = prefill?.rentalProperty;
  if (!rental) return undefined;
  return locale === 'en'
    ? `Message to owner — ${rental.name}, ${rental.address}`
    : `Mensagem ao proprietário — ${rental.name}, ${rental.address}`;
}
