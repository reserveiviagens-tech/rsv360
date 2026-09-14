/**
 * RSV360 PMS/CRM — Reservei Viagens
 * Copyright (c) 2024-2026 Reservei Viagens LTDA. Todos os direitos reservados.
 * Desenvolvido por Douglas P. Figueiredo <douglas@reserveiviagens.com.br>
 * @author Douglas P. Figueiredo
 * @license UNLICENSED
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { GuestService, ServiceRequestPayload } from '@/types/service';

export function useServices() {
  return useQuery({
    queryKey: ['guest-portal', 'services'],
    queryFn: async () => {
      // No silent static catalog fallback (Aruanda C2) — empty when API unavailable.
      return api.get<GuestService[]>('/api/guest-portal/services');
    },
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

export function useServiceRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ServiceRequestPayload) =>
      api.post('/api/portal/requests', {
        type: payload.type,
        description: payload.description,
        priority: payload.priority || 'medium',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['guest-portal', 'messages'] });
      void queryClient.invalidateQueries({ queryKey: ['guest-portal', 'requests'] });
    },
  });
}
