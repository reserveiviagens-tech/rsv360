'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { Calendar as CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { startOfDay } from 'date-fns';
import {
  isPastDate,
  isValidDateRange,
  normalizeDateRange,
} from '@/components/cotacao/wizard/wizard-date-utils';

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [breakpoint]);

  return isMobile;
}

function formatRangeLabel(range: DateRange | undefined): string {
  if (!range?.from) return 'Selecione as datas';
  if (!range.to) return format(range.from, 'dd/MM/yyyy', { locale: ptBR });
  return `${format(range.from, 'dd/MM/yyyy', { locale: ptBR })} — ${format(range.to, 'dd/MM/yyyy', { locale: ptBR })}`;
}

export interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  className?: string;
  variant?: 'default' | 'compact';
  disabled?: boolean;
}

export function DateRangePicker({
  value,
  onChange,
  className,
  variant = 'default',
  disabled = false,
}: DateRangePickerProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DateRange | undefined>(value);

  React.useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleSelect = (next: DateRange | undefined) => {
    if (!next?.from) {
      setDraft(undefined);
      onChange(undefined);
      return;
    }

    // DayPicker com min=0 seta from===to no 1º clique — tratar como só check-in.
    const sameOrMissingTo =
      !next.to || startOfDay(next.to).getTime() <= startOfDay(next.from).getTime();
    if (sameOrMissingTo) {
      const incomplete = { from: next.from };
      setDraft(incomplete);
      onChange(incomplete);
      return;
    }

    const normalized = normalizeDateRange(next);
    setDraft(normalized ?? { from: next.from, to: next.to });

    if (isValidDateRange(normalized)) {
      onChange(normalized);
      setOpen(false);
      return;
    }

    // Período com 1 diária (ou inválido): propaga para o wizard mostrar o aviso e bloquear avanço.
    if (normalized?.from && normalized.to) {
      onChange(normalized);
    }
  };

  const displayRange = open ? draft : value;

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            type="button"
            variant="outline"
            disabled={disabled}
            data-testid="wizard-date-range-trigger"
            className={cn(
              'w-full justify-start text-left font-normal',
              variant === 'compact' ? 'h-10 text-sm' : 'h-12',
              !displayRange?.from && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">{formatRangeLabel(displayRange)}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            // min=1: 1º clique só define check-in (to fica aberto). Não auto-completa 2ª data.
            // Mínimo comercial de 2 diárias é validado no wizard (não no DayPicker).
            min={1}
            defaultMonth={displayRange?.from ?? new Date()}
            selected={displayRange}
            onSelect={handleSelect}
            numberOfMonths={isMobile ? 1 : 2}
            locale={ptBR}
            disabled={isPastDate}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
