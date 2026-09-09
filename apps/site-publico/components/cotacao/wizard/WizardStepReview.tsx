'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { TurnstileWidget } from '@/components/security/TurnstileWidget';
import { safeTrack } from '@/lib/cotacao-analytics';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { useWizard } from './WizardContext';
import { WizardClosingSummary } from './WizardClosingSummary';
import type { AvailabilityItem, WizardState } from './wizard-types';

function toCatalogPayload(items: AvailabilityItem[]) {
  return items.map(({ id, title, price, images, metadata, location }) => ({
    id,
    title,
    price,
    images,
    metadata,
    location,
  }));
}

/** Payload explícito — sem spread do state (evita vazar upgradeVarandaValor / suiteUpgrade). */
function buildGerarPropostaBody(
  state: WizardState,
  catalog: { hotels: AvailabilityItem[]; tickets: AvailabilityItem[]; attractions: AvailabilityItem[] },
  total: number,
  turnstileToken?: string,
) {
  const params =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const descontoRaw = params?.get('descontoParceiro') ?? params?.get('desconto');
  const descontoParceiroPercentual =
    descontoRaw != null && descontoRaw !== '' ? Number(descontoRaw) : undefined;
  const roleRaw = params?.get('descontoParceiroRole') ?? params?.get('parceiroRole');
  const descontoParceiroRole =
    roleRaw === 'agente' || roleRaw === 'promotor' || roleRaw === 'corretor'
      ? roleRaw
      : descontoParceiroPercentual != null
        ? 'corretor'
        : undefined;

  return {
    checkIn: state.checkIn,
    checkOut: state.checkOut,
    adults: state.adults,
    children: state.children,
    hotelId: state.hotelId,
    ticketIds: state.ticketIds,
    attractionIds: state.attractionIds,
    breakfastId: state.breakfastId,
    accommodationMode: state.accommodationMode,
    accommodationKitId: state.accommodationKitId,
    accommodationItemIds: state.accommodationItemIds,
    name: state.name,
    email: state.email,
    phone: state.phone,
    notes: state.notes,
    paymentMethod: state.paymentMethod,
    profile: state.profile,
    travelInsurance: state.travelInsurance,
    hotelOnlyFlow: state.hotelOnlyFlow,
    selectedAcomodacaoId: state.selectedAcomodacaoId,
    wizardAddonIds: state.wizardAddonIds,
    upgradeVaranda: state.upgradeVaranda,
    ...(Number.isFinite(descontoParceiroPercentual) && (descontoParceiroPercentual as number) > 0
      ? {
          descontoParceiroPercentual,
          descontoParceiroRole,
        }
      : {}),
    total,
    turnstileToken: turnstileToken || undefined,
    catalog: {
      hotels: toCatalogPayload(
        catalog.hotels.filter(
          (h) => h.id === state.hotelId || h.contentId === state.hotelId,
        ),
      ),
      tickets: toCatalogPayload(
        catalog.tickets.filter((t) =>
          state.ticketIds.some((id) => id === t.id || id === t.contentId),
        ),
      ),
      attractions: toCatalogPayload(
        catalog.attractions.filter((a) =>
          state.attractionIds.some((id) => id === a.id || id === a.contentId),
        ),
      ),
    },
  };
}

function validateBeforeSubmit(state: WizardState): { ok: true } | { ok: false; message: string } {
  if (!state.checkIn || !state.checkOut) {
    return { ok: false, message: 'Informe check-in e check-out antes de confirmar.' };
  }
  if (!state.hotelId) {
    return { ok: false, message: 'Selecione um hotel antes de confirmar.' };
  }
  if (!state.name.trim()) {
    return { ok: false, message: 'Por favor, preencha seu nome.' };
  }
  if (!state.phone.trim()) {
    return { ok: false, message: 'Por favor, preencha seu WhatsApp.' };
  }
  const email = state.email.trim();
  if (!email) {
    return { ok: false, message: 'Por favor, preencha seu e-mail.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: 'Informe um e-mail válido.' };
  }
  if (state.paymentMethod !== 'pix' && state.paymentMethod !== 'credit') {
    return { ok: false, message: 'Selecione uma forma de pagamento para continuar.' };
  }
  return { ok: true };
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      {message}
    </div>
  );
}

export function WizardStepReview() {
  const router = useRouter();
  const {
    state,
    catalog,
    updateState,
    prevStep,
    runningTotal,
    submitting,
    setSubmitting,
    availabilityLoading,
    resetWizard,
  } = useWizard();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState('');

  const handleSubmit = async () => {
    const validation = validateBeforeSubmit(state);
    if (!validation.ok) {
      setSubmitError(validation.message);
      if (validation.message.includes('pagamento')) {
        setPaymentError(validation.message);
      }
      toast.error(validation.message);
      return;
    }

    setSubmitError(null);
    setPaymentError(null);

    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      const msg = 'Confirme a verificação de segurança antes de continuar.';
      setSubmitError(msg);
      toast.error(msg);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/cotacao/gerar-proposta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildGerarPropostaBody(state, catalog, runningTotal, turnstileToken)),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || 'Falha ao gerar proposta');
      }

      safeTrack('cotacao_proposta_generated', {
        propostaId: json.propostaId,
        total: runningTotal,
        profile: state.profile,
      });

      toast.success('Proposta gerada!', { description: 'Redirecionando...' });
      const targetUrl = json.url || `/proposta/${json.tokenPublico}`;
      resetWizard({ silent: true });
      router.push(targetUrl);
    } catch (err) {
      const msg = (err as Error).message || 'Erro ao gerar proposta. Tente novamente.';
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-4">
      <WizardClosingSummary
        state={state}
        catalog={catalog}
        runningTotal={runningTotal}
        loading={availabilityLoading}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Falta pouco — confirme e receba seu roteiro
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Seus dados são protegidos. Enviaremos o roteiro completo no WhatsApp assim que confirmar.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Seu nome *</Label>
              <Input
                id="name"
                placeholder="Como podemos te chamar?"
                value={state.name}
                onChange={(e) => updateState({ name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp *</Label>
              <Input
                id="phone"
                placeholder="(64) 99999-9999"
                value={state.phone}
                onChange={(e) => updateState({ phone: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="Para enviar cópia da proposta"
              value={state.email}
              onChange={(e) => updateState({ email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Algum pedido especial?</Label>
            <Textarea
              id="notes"
              placeholder="Aniversário, restrição alimentar, horário de chegada..."
              value={state.notes}
              onChange={(e) => updateState({ notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Forma de pagamento preferida</Label>
            <PaymentMethodSelector
              selectedMethod={state.paymentMethod}
              onMethodChange={(m) => {
                setPaymentError(null);
                updateState({ paymentMethod: m });
              }}
              error={paymentError ?? undefined}
            />
          </div>
        </CardContent>
      </Card>

      {submitError ? <ErrorMessage message={submitError} /> : null}

      <TurnstileWidget onToken={setTurnstileToken} onExpire={() => setTurnstileToken('')} />

      <div className="flex gap-3">
        <Button variant="outline" onClick={prevStep} disabled={submitting} className="flex-1">
          Voltar: seu roteiro
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 bg-accent-lime text-gray-900 hover:bg-accent-lime/90"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando proposta...
            </>
          ) : (
            'Confirmar e gerar proposta'
          )}
        </Button>
      </div>
    </div>
  );
}
