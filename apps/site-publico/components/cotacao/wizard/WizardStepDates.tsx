'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Calendar, Loader2, Users } from 'lucide-react';
import { useWizard } from './WizardContext';
import {
  isValidWizardRange,
  wizardMinNightsLabel,
  wizardSelectCheckoutHint,
  wizardStateToDateRange,
} from './wizard-date-utils';
import { countNights } from './wizard-types';

interface WizardStepDatesProps {
  onNextClick?: () => void;
}

export function WizardStepDates({ onNextClick }: WizardStepDatesProps = {}) {
  const { state, updateState, nextStep, availabilityLoading, updateTravelDates } = useWizard();
  const handleNext = onNextClick ?? nextStep;
  const dateRange = wizardStateToDateRange(state.checkIn, state.checkOut);
  const nights = countNights(state.checkIn, state.checkOut);
  const rangeValid = isValidWizardRange(state.checkIn, state.checkOut);
  const awaitingCheckout = Boolean(state.checkIn && !state.checkOut);
  const belowMinNights = Boolean(state.checkIn && state.checkOut && !rangeValid && nights >= 1);
  const dateHint = awaitingCheckout
    ? wizardSelectCheckoutHint()
    : belowMinNights
      ? wizardMinNightsLabel()
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Datas e hóspedes
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Quando você pretende viajar e quantas pessoas?
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="date">Quando pretende viajar? *</Label>
          <DateRangePicker value={dateRange} onChange={updateTravelDates} />
          <p className="text-xs text-muted-foreground">
            Toque no calendário: 1º clique = check-in, 2º = check-out. {wizardMinNightsLabel()}
          </p>
          {dateHint ? (
            <p
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900"
              role="alert"
              data-testid="wizard-min-nights-hint"
            >
              {dateHint}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="w-4 h-4" />
          <span className="text-sm">Número de pessoas</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="adults">Adultos *</Label>
            <Input
              id="adults"
              type="number"
              min={1}
              max={20}
              value={state.adults}
              onChange={(e) =>
                updateState({ adults: Math.max(1, parseInt(e.target.value, 10) || 1) })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="children">Crianças</Label>
            <Input
              id="children"
              type="number"
              min={0}
              max={20}
              value={state.children}
              onChange={(e) =>
                updateState({ children: Math.max(0, parseInt(e.target.value, 10) || 0) })
              }
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Perfil detectado: <strong className="capitalize">{state.profile}</strong>
        </p>
        <Button
          onClick={handleNext}
          disabled={!rangeValid || availabilityLoading}
          className="w-full"
        >
          {availabilityLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verificando disponibilidade...
            </>
          ) : (
            'Próximo: escolher hotel'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
