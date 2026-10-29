'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import type { DateRange } from 'react-day-picker';
import { ajustarPassoNavegacao, type EntradaContextual } from '@rsv360/shared';
import { trackCotacaoEvent, WIZARD_STEP_NAMES } from '@/lib/cotacao-analytics';
import type { EntradaBootstrap } from '@/hooks/useEntradaContextual';
import {
  dateRangeToWizardState,
  formatWizardDateString,
  isValidWizardRange,
  isWizardDateOrderRange,
  isWizardDateOrderValid,
  normalizeDateRange,
  sanitizeWizardDates,
  wizardMinNightsLabel,
} from './wizard-date-utils';
import { updateProfileFromGuests } from './wizard-behavior';
import { calculateWizardPricingBreakdown } from './wizard-pricing';
import {
  initialWizardState,
  TOTAL_STEPS,
  WIZARD_CATALOG_STORAGE_KEY,
  WIZARD_DRAFT_MAX_AGE_MS,
  WIZARD_STEP_STORAGE_KEY,
  WIZARD_STORAGE_KEY,
  type StoredWizardDraft,
  type WizardCatalog,
  type WizardState,
} from './wizard-types';

interface WizardContextValue {
  currentStep: number;
  state: WizardState;
  catalog: WizardCatalog;
  entrada: EntradaContextual;
  passosColapsados: number[];
  hotelTravado: boolean;
  unlockHotelTravado: () => void;
  editarPassoColapsado: (step: number) => void;
  setCatalog: (catalog: WizardCatalog) => void;
  updateState: (updates: Partial<WizardState>) => void;
  nextStep: () => boolean;
  prevStep: () => void;
  goToStep: (step: number) => void;
  resetWizard: (options?: { silent?: boolean }) => void;
  runningTotal: number;
  pricingBreakdown: ReturnType<typeof calculateWizardPricingBreakdown>;
  availabilityLoading: boolean;
  setAvailabilityLoading: (v: boolean) => void;
  availabilityError: string | null;
  setAvailabilityError: (v: string | null) => void;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  updateTravelDates: (range: DateRange | undefined) => void;
  registerRefetchAvailability: (
    fn: (dates?: { checkIn: string; checkOut: string }) => Promise<void>,
  ) => void;
  refetchAvailability: (dates?: { checkIn: string; checkOut: string }) => Promise<void>;
  onHotelIndisponivel: () => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

const emptyCatalog: WizardCatalog = { hotels: [], tickets: [], attractions: [] };

function sanitizeWizardState(partial: Partial<WizardState>): WizardState {
  const merged: WizardState = { ...initialWizardState, ...partial };
  if (merged.paymentMethod !== 'pix' && merged.paymentMethod !== 'credit') {
    merged.paymentMethod = 'pix';
  }
  merged.adults = Math.max(1, Number(merged.adults) || 1);
  merged.children = Math.max(0, Number(merged.children) || 0);
  merged.upgradeVaranda = Boolean(merged.upgradeVaranda);
  merged.upgradeVarandaValor = Math.max(0, Number(merged.upgradeVarandaValor) || 0);
  merged.selectedArquetipoId =
    merged.selectedArquetipoId != null ? String(merged.selectedArquetipoId) : null;
  merged.selectedCodigoExterno =
    merged.selectedCodigoExterno != null ? String(merged.selectedCodigoExterno) : null;
  const dates = sanitizeWizardDates(merged.checkIn, merged.checkOut);
  merged.checkIn = dates.checkIn;
  merged.checkOut = dates.checkOut;
  return merged;
}

function saveDraft(state: WizardState, step: number) {
  try {
    const payload: StoredWizardDraft = { state, step, savedAt: Date.now() };
    localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(payload));
    localStorage.setItem(WIZARD_STEP_STORAGE_KEY, String(step));
  } catch {
    /* ignore quota */
  }
}

function loadCatalogFromSession(): WizardCatalog | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(WIZARD_CATALOG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WizardCatalog;
    if (!parsed.hotels?.length && !parsed.tickets?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCatalogToSession(catalog: WizardCatalog) {
  if (catalog.hotels.length === 0 && catalog.tickets.length === 0) return;
  try {
    sessionStorage.setItem(WIZARD_CATALOG_STORAGE_KEY, JSON.stringify(catalog));
  } catch {
    /* ignore quota */
  }
}

function validateStep(step: number, state: WizardState): string | null {
  switch (step) {
    case 0:
      if (!state.checkIn || !state.checkOut) return 'Informe check-in e check-out';
      if (!isWizardDateOrderValid(state.checkIn, state.checkOut)) {
        return 'Check-out deve ser após check-in';
      }
      if (!isValidWizardRange(state.checkIn, state.checkOut)) return wizardMinNightsLabel();
      if (state.adults < 1) return 'Informe ao menos 1 adulto';
      return null;
    case 1:
      if (!state.hotelId) return 'Selecione um hotel';
      return null;
    case 4:
      if (!state.breakfastId) return 'Selecione uma opção de café da manhã';
      return null;
    case 5:
      if (state.accommodationMode === 'kit' && !state.accommodationKitId) {
        return 'Selecione um kit de acomodação';
      }
      if (state.accommodationMode === 'items' && state.accommodationItemIds.length === 0) {
        return 'Selecione ao menos um item';
      }
      return null;
    case 6:
      return null;
    case 7:
      if (!state.name.trim()) return 'Informe seu nome';
      if (!state.phone.trim()) return 'Informe seu telefone';
      return null;
    default:
      return null;
  }
}

interface WizardProviderProps {
  children: ReactNode;
  bootstrap: EntradaBootstrap;
}

export function WizardProvider({ children, bootstrap }: WizardProviderProps) {
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastStepRef = useRef(bootstrap.initialStep);
  const entradaTracked = useRef(false);
  const refetchAvailabilityRef = useRef<
    ((dates?: { checkIn: string; checkOut: string }) => Promise<void>) | null
  >(null);

  const [currentStep, setCurrentStep] = useState(bootstrap.initialStep);
  const [state, setState] = useState<WizardState>(() => sanitizeWizardState(bootstrap.initialState));
  const [catalog, setCatalogState] = useState<WizardCatalog>(emptyCatalog);
  const [passosColapsados, setPassosColapsados] = useState<number[]>(bootstrap.passosColapsados);
  const [hotelTravado, setHotelTravado] = useState(bootstrap.hotelTravado);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fromSession = loadCatalogFromSession();
    if (fromSession) setCatalogState(fromSession);
  }, []);

  useEffect(() => {
    if (entradaTracked.current) return;
    entradaTracked.current = true;

    if (bootstrap.restoredFromDraft) {
      toast.info('Sessão restaurada', { description: 'Continuamos de onde você parou.' });
    } else if (bootstrap.ctx.origem === 'deeplink') {
      toast.info('Montando sua viagem', { description: 'Pré-preenchemos com a oferta da vitrine.' });
    }

    if (bootstrap.hadInvalidDates) {
      toast.info('Datas expiradas, selecione novamente.', { duration: 5000 });
    }

    trackCotacaoEvent('cotacao_entrada_contextual', {
      variant: bootstrap.ctx.variant,
      source: bootstrap.ctx.origem,
      ref: bootstrap.ctx.ref ?? state.ref ?? undefined,
      canal: bootstrap.ctx.canal ?? state.canal ?? undefined,
      hotelTravado: bootstrap.hotelTravado,
      passosColapsados: bootstrap.passosColapsados,
      step: bootstrap.initialStep,
      profile: bootstrap.initialState.profile,
    });
  }, [bootstrap]);

  const setCatalog = useCallback((next: WizardCatalog) => {
    setCatalogState(next);
    saveCatalogToSession(next);
  }, []);

  useEffect(() => {
    saveDraft(state, currentStep);
  }, [state, currentStep]);

  useEffect(() => {
    trackCotacaoEvent('cotacao_step_viewed', {
      step: currentStep,
      stepName: WIZARD_STEP_NAMES[currentStep],
      profile: state.profile,
      variant: bootstrap.ctx.variant,
    });
    lastStepRef.current = currentStep;
  }, [currentStep, state.profile, bootstrap.ctx.variant]);

  useEffect(() => {
    const resetIdle = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        trackCotacaoEvent('cotacao_step_abandoned', {
          step: lastStepRef.current,
          stepName: WIZARD_STEP_NAMES[lastStepRef.current],
          lastAction: 'idle_5min',
          profile: state.profile,
        });
      }, 5 * 60 * 1000);
    };
    resetIdle();
    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keydown', resetIdle);
    const onBeforeUnload = () => {
      trackCotacaoEvent('cotacao_step_abandoned', {
        step: lastStepRef.current,
        stepName: WIZARD_STEP_NAMES[lastStepRef.current],
        lastAction: 'beforeunload',
        profile: state.profile,
      });
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [state.profile]);

  const unlockHotelTravado = useCallback(() => {
    setHotelTravado(false);
    setPassosColapsados((prev) => prev.filter((s) => s !== 1));
  }, []);

  const editarPassoColapsado = useCallback((step: number) => {
    setPassosColapsados((prev) => prev.filter((s) => s !== step));
    if (step === 1) setHotelTravado(false);
    setCurrentStep(step);
  }, []);

  const onHotelIndisponivel = useCallback(() => {
    if (!hotelTravado) return;
    setHotelTravado(false);
    setPassosColapsados((prev) => prev.filter((s) => s !== 1));
    setState((prev) => ({ ...prev, hotelId: null }));
    toast.info('Hotel indisponível', {
      description: 'O hotel escolhido na vitrine não está disponível nestas datas. Escolha outro.',
    });
  }, [hotelTravado]);

  const updateState = useCallback((updates: Partial<WizardState>) => {
    setState((prev) => {
      const next = { ...prev, ...updates };
      if ('adults' in updates || 'children' in updates) {
        next.profile = updateProfileFromGuests(next);
      }
      return next;
    });
  }, []);

  const pricingBreakdown = useMemo(
    () => calculateWizardPricingBreakdown(state, catalog, [], catalog.taxaHospedePublica),
    [state, catalog],
  );
  const runningTotal = pricingBreakdown.totalFinal;

  const nextStep = useCallback((): boolean => {
    const err = validateStep(currentStep, state);
    if (err) {
      toast.error(err);
      return false;
    }
    trackCotacaoEvent('cotacao_step_completed', {
      step: currentStep,
      stepName: WIZARD_STEP_NAMES[currentStep],
      profile: state.profile,
      runningTotal,
      selectionCount:
        (state.hotelId ? 1 : 0) +
        state.ticketIds.length +
        state.attractionIds.length +
        (state.breakfastId ? 1 : 0),
    });
    setCurrentStep((s) => ajustarPassoNavegacao(s, passosColapsados, 1));
    return true;
  }, [currentStep, state, runningTotal, passosColapsados]);

  const prevStep = useCallback(() => {
    setCurrentStep((s) => ajustarPassoNavegacao(s, passosColapsados, -1));
  }, [passosColapsados]);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(Math.min(TOTAL_STEPS - 1, Math.max(0, step)));
  }, []);

  const resetWizard = useCallback((options?: { silent?: boolean }) => {
    setState(initialWizardState);
    setCurrentStep(0);
    setCatalogState(emptyCatalog);
    setPassosColapsados([]);
    setHotelTravado(false);
    try {
      localStorage.removeItem(WIZARD_STORAGE_KEY);
      localStorage.removeItem(WIZARD_STEP_STORAGE_KEY);
      sessionStorage.removeItem(WIZARD_CATALOG_STORAGE_KEY);
      sessionStorage.removeItem('rsv360-lead-abandono-sent');
    } catch {
      /* ignore */
    }
    if (!options?.silent) {
      toast.success('Cotação reiniciada');
    }
  }, []);

  const registerRefetchAvailability = useCallback(
    (fn: (dates?: { checkIn: string; checkOut: string }) => Promise<void>) => {
      refetchAvailabilityRef.current = fn;
    },
    [],
  );

  const refetchAvailability = useCallback(
    async (dates?: { checkIn: string; checkOut: string }) => {
      await refetchAvailabilityRef.current?.(dates);
    },
    [],
  );

  const updateTravelDates = useCallback(
    (range: DateRange | undefined) => {
      if (!range?.from) return;

      const normalized = normalizeDateRange(range);

      if (range.from && !range.to) {
        setState((prev) => ({
          ...prev,
          checkIn: formatWizardDateString(range.from!),
          checkOut: '',
        }));
        // Feedback imediato no 1º clique (só 1 data) — o alerta inline no calendário reforça.
        toast.message(wizardMinNightsLabel(), { duration: 4500 });
        return;
      }

      if (!isWizardDateOrderRange(normalized)) {
        toast.error('Selecione um período válido (check-out após check-in, sem datas passadas).');
        return;
      }

      const nextDates = dateRangeToWizardState(normalized);
      if (!nextDates) return;

      if (!isValidWizardRange(nextDates.checkIn, nextDates.checkOut)) {
        setState((prev) => ({
          ...prev,
          checkIn: nextDates.checkIn,
          checkOut: nextDates.checkOut,
        }));
        toast.error(wizardMinNightsLabel());
        return;
      }

      setState((prev) => {
        const changed =
          nextDates.checkIn !== prev.checkIn || nextDates.checkOut !== prev.checkOut;
        if (!changed) return prev;

        const hadSelections = prev.ticketIds.length > 0 || prev.attractionIds.length > 0;
        if (hadSelections) {
          toast.info(
            'Como você alterou as datas, suas seleções de parques foram reiniciadas para garantir a disponibilidade.',
            { duration: 5000 },
          );
        }

        return {
          ...prev,
          checkIn: nextDates.checkIn,
          checkOut: nextDates.checkOut,
          ...(hadSelections ? { ticketIds: [], attractionIds: [] } : {}),
        };
      });

      const shouldRefetch = currentStep >= 2 || catalog.hotels.length > 0;
      if (shouldRefetch) {
        void refetchAvailabilityRef.current?.(nextDates);
      }
    },
    [currentStep, catalog.hotels.length],
  );

  const value = useMemo(
    () => ({
      currentStep,
      state,
      catalog,
      entrada: bootstrap.ctx,
      passosColapsados,
      hotelTravado,
      unlockHotelTravado,
      editarPassoColapsado,
      setCatalog,
      updateState,
      nextStep,
      prevStep,
      goToStep,
      resetWizard,
      runningTotal,
      pricingBreakdown,
      availabilityLoading,
      setAvailabilityLoading,
      availabilityError,
      setAvailabilityError,
      submitting,
      setSubmitting,
      updateTravelDates,
      registerRefetchAvailability,
      refetchAvailability,
      onHotelIndisponivel,
    }),
    [
      currentStep,
      state,
      catalog,
      bootstrap.ctx,
      passosColapsados,
      hotelTravado,
      unlockHotelTravado,
      editarPassoColapsado,
      updateState,
      nextStep,
      prevStep,
      goToStep,
      resetWizard,
      runningTotal,
      pricingBreakdown,
      availabilityLoading,
      availabilityError,
      submitting,
      updateTravelDates,
      registerRefetchAvailability,
      refetchAvailability,
      onHotelIndisponivel,
      setCatalog,
    ],
  );

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWizard must be used within WizardProvider');
  return ctx;
}
