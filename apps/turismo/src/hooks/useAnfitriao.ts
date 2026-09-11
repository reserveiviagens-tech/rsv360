import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fase1Api } from '@/lib/fase1-api';

export function useAnfitriaoDashboard() {
  return useQuery({
    queryKey: ['anfitriao', 'dashboard'],
    queryFn: () => fase1Api.anfitriaoDashboard(),
  });
}

export function useAnfitriaoMinhas(
  page = 1,
  pageSize = 20,
  ativo?: 'true' | 'false' | 'all',
) {
  return useQuery({
    queryKey: ['anfitriao', 'minhas', page, pageSize, ativo ?? 'default'],
    queryFn: () => fase1Api.anfitriaoMinhas(page, pageSize, ativo),
  });
}

export function useAnfitriaoMinhasComissoes(page = 1) {
  return useQuery({
    queryKey: ['anfitriao', 'comissoes', page],
    queryFn: () => fase1Api.anfitriaoMinhasComissoes(page),
  });
}

export function useAnfitriaoUnidade(id: number) {
  return useQuery({
    queryKey: ['anfitriao', 'unidade', id],
    queryFn: () => fase1Api.anfitriaoUnidade(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useAtualizarAnfitriaoUnidade(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => fase1Api.atualizarAnfitriaoUnidade(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['anfitriao'] });
    },
  });
}

export function useAnfitriaoReservas(de: string, ate: string, acomodacaoId?: number) {
  return useQuery({
    queryKey: ['anfitriao', 'reservas', de, ate, acomodacaoId],
    queryFn: () => fase1Api.anfitriaoReservas(de, ate, acomodacaoId),
    enabled: Boolean(de && ate),
  });
}

export function useAnfitriaoHoje(hoje?: string) {
  return useQuery({
    queryKey: ['anfitriao', 'hoje', hoje ?? 'auto'],
    queryFn: () => fase1Api.anfitriaoHoje(hoje),
  });
}

export function useAnfitriaoInbox(de: string, ate: string) {
  return useQuery({
    queryKey: ['anfitriao', 'inbox', de, ate],
    queryFn: () => fase1Api.anfitriaoInboxMensagens(de, ate),
    enabled: Boolean(de && ate),
  });
}

export function useAnfitriaoMensagensThread(propostaId: number | null) {
  return useQuery({
    queryKey: ['anfitriao', 'thread', propostaId],
    queryFn: () => fase1Api.anfitriaoMensagensThread(propostaId!),
    enabled: propostaId != null && propostaId > 0,
  });
}

export function useEnviarMensagemAnfitriao(propostaId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: string) =>
      fase1Api.anfitriaoEnviarMensagem(propostaId!, message),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['anfitriao', 'thread', propostaId] });
      qc.invalidateQueries({ queryKey: ['anfitriao', 'inbox'] });
    },
  });
}

export function useDecidirPedidoReserva() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      propostaId,
      action,
    }: {
      propostaId: number;
      action: 'aprovar' | 'rejeitar';
    }) =>
      action === 'aprovar'
        ? fase1Api.anfitriaoAprovarPedido(propostaId)
        : fase1Api.anfitriaoRejeitarPedido(propostaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['anfitriao'] });
    },
  });
}

export function useAnfitriaoCalendario(id: number, de: string, ate: string) {
  return useQuery({
    queryKey: ['anfitriao', 'calendario', id, de, ate],
    queryFn: () => fase1Api.anfitriaoCalendario(id, de, ate),
    enabled: Number.isFinite(id) && id > 0 && Boolean(de && ate),
  });
}

export function useAnfitriaoCalendarioAgregado(de: string, ate: string) {
  return useQuery({
    queryKey: ['anfitriao', 'calendario-agregado', de, ate],
    queryFn: () => fase1Api.anfitriaoCalendarioAgregado(de, ate),
    enabled: Boolean(de && ate),
  });
}

export function useEnviarAprovacaoUnidade(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => fase1Api.enviarAprovacaoUnidade(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['anfitriao'] });
    },
  });
}

export function useUploadTrilhoThumb(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => fase1Api.anfitriaoUploadTrilhoThumb(id, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['anfitriao'] });
    },
  });
}

export function useUploadAcessibilidadeFoto(id: number) {
  return useMutation({
    mutationFn: (file: File) => fase1Api.anfitriaoUploadAcessibilidadeFoto(id, file),
  });
}

export function useUploadGaleriaFoto(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => fase1Api.anfitriaoUploadGaleriaFoto(id, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['anfitriao'] });
    },
  });
}

export function usePatchGaleria(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      removeUrl?: string;
      moveUrl?: string;
      direction?: 'left' | 'right';
      setCapaUrl?: string;
      setCategoriaUrl?: string;
      categoria?: string | null;
      setCaptionUrl?: string;
      caption?: string | null;
    }) => fase1Api.anfitriaoPatchGaleria(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['anfitriao'] });
    },
  });
}

export function useDefinirTrilhoCapa(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (url: string) => fase1Api.anfitriaoDefinirTrilhoCapa(id, url),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['anfitriao'] });
    },
  });
}
