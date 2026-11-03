import { format, startOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { countWizardNights, WIZARD_MIN_NIGHTS } from '@rsv360/shared';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export { WIZARD_MIN_NIGHTS };

export function wizardMinNightsLabel(): string {
  return `Atenção: só é possível realizar a reserva a partir de ${WIZARD_MIN_NIGHTS} diárias. Selecione check-in e check-out com pelo menos ${WIZARD_MIN_NIGHTS} noites para avançar.`;
}

/** Check-in escolhido, check-out ainda pendente — mesmo tom de atenção (mín. 2 diárias). */
export function wizardSelectCheckoutHint(): string {
  return wizardMinNightsLabel();
}

export function parseWizardDateString(value: string): Date | undefined {
  if (!value || !ISO_DATE.test(value)) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

export function formatWizardDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function isPastDate(date: Date): boolean {
  return startOfDay(date) < startOfDay(new Date());
}

/** Check-out após check-in, sem datas passadas (não exige mínimo comercial). */
export function isWizardDateOrderValid(checkIn: string, checkOut: string): boolean {
  const from = parseWizardDateString(checkIn);
  const to = parseWizardDateString(checkOut);
  if (!from || !to) return false;
  if (isPastDate(from) || isPastDate(to)) return false;
  return startOfDay(to) > startOfDay(from);
}

export function isValidWizardRange(checkIn: string, checkOut: string): boolean {
  if (!isWizardDateOrderValid(checkIn, checkOut)) return false;
  return countWizardNights(checkIn, checkOut) >= WIZARD_MIN_NIGHTS;
}

export function isValidDateRange(
  range: DateRange | undefined,
): range is DateRange & { from: Date; to: Date } {
  if (!range?.from || !range.to) return false;
  const checkIn = formatWizardDateString(range.from);
  const checkOut = formatWizardDateString(range.to);
  return isValidWizardRange(checkIn, checkOut);
}

export function isWizardDateOrderRange(
  range: DateRange | undefined,
): range is DateRange & { from: Date; to: Date } {
  if (!range?.from || !range.to) return false;
  if (isPastDate(range.from) || isPastDate(range.to)) return false;
  return startOfDay(range.to) > startOfDay(range.from);
}

export function normalizeDateRange(range: DateRange | undefined): DateRange | undefined {
  if (!range?.from) return undefined;
  if (!range.to) return { from: range.from };
  if (startOfDay(range.to) <= startOfDay(range.from)) return undefined;
  if (isPastDate(range.from) || isPastDate(range.to)) return undefined;
  return { from: range.from, to: range.to };
}

export function wizardStateToDateRange(checkIn: string, checkOut: string): DateRange | undefined {
  const from = parseWizardDateString(checkIn);
  if (!from) return undefined;
  const to = parseWizardDateString(checkOut);
  if (!to) return { from };
  if (!isWizardDateOrderValid(checkIn, checkOut)) return { from };
  return { from, to };
}

export function dateRangeToWizardState(
  range: DateRange | undefined,
): { checkIn: string; checkOut: string } | null {
  const normalized = normalizeDateRange(range);
  if (!normalized?.from || !normalized.to) return null;
  return {
    checkIn: formatWizardDateString(normalized.from),
    checkOut: formatWizardDateString(normalized.to),
  };
}

export function sanitizeWizardDates(checkIn: string, checkOut: string): { checkIn: string; checkOut: string } {
  if (!checkIn && !checkOut) return { checkIn: '', checkOut: '' };
  if (!isValidWizardRange(checkIn, checkOut)) return { checkIn: '', checkOut: '' };
  return { checkIn, checkOut };
}
