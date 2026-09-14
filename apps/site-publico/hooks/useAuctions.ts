'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface Auction {
  id: number;
  enterprise_id: number;
  property_id?: number;
  accommodation_id?: number;
  title: string;
  description?: string;
  start_price: number;
  current_price: number;
  min_increment: number;
  reserve_price?: number;
  start_date: string;
  end_date: string;
  status: 'scheduled' | 'active' | 'finished' | 'cancelled';
  winner_id?: number;
  winner_bid_id?: number;
  created_at: string;
  updated_at: string;
  enterprise_name?: string;
  property_name?: string;
  accommodation_name?: string;
  total_bids?: number;
  highest_bid?: number;
  // Coordenadas geográficas (do enterprise ou property relacionado)
  latitude?: number;
  longitude?: number;
}

export interface Bid {
  id: number;
  auction_id: number;
  customer_id: number;
  amount: number;
  status: 'pending' | 'accepted' | 'rejected' | 'outbid';
  created_at: string;
  updated_at: string;
  customer_name?: string;
  customer_email?: string;
}

export type AuctionFilters = {
  status?: string;
  enterprise_id?: number;
  property_id?: number;
  accommodation_id?: number;
  search?: string;
  checkIn?: string; // ISO date string
  checkOut?: string; // ISO date string
  minPrice?: number;
  maxPrice?: number;
};

export function useAuctionsQuery(filters?: AuctionFilters) {
  return useQuery({
    queryKey: ['auctions', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.enterprise_id) params.set('enterprise_id', filters.enterprise_id.toString());
      if (filters?.property_id) params.set('property_id', filters.property_id.toString());
      if (filters?.accommodation_id) params.set('accommodation_id', filters.accommodation_id.toString());
      if (filters?.search) params.set('search', filters.search);
      if (filters?.checkIn) params.set('checkIn', filters.checkIn);
      if (filters?.checkOut) params.set('checkOut', filters.checkOut);
      if (filters?.minPrice != null && !Number.isNaN(filters.minPrice)) params.set('minPrice', filters.minPrice.toString());
      if (filters?.maxPrice != null && !Number.isNaN(filters.maxPrice)) params.set('maxPrice', filters.maxPrice.toString());
      const url = `${API_BASE_URL}/api/v1/auctions/active${params.toString() ? `?${params.toString()}` : ''}`;
      
      let res: Response;
      try {
        res = await fetch(url, { 
          headers: getAuthHeaders(),
          signal: AbortSignal.timeout(10000), // Timeout de 10 segundos
        });
      } catch (fetchError) {
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Timeout ao conectar com o servidor. Verifique se o backend está rodando.');
        }
        if (fetchError instanceof TypeError && fetchError.message.includes('Failed to fetch')) {
          throw new Error('Não foi possível conectar ao servidor. Verifique se o backend está rodando na porta 5000.');
        }
        throw new Error(`Erro ao buscar leilões: ${fetchError instanceof Error ? fetchError.message : 'Erro desconhecido'}`);
      }
      
      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(`Erro ao buscar leilões (${res.status}): ${errorText || res.statusText}`);
      }
      
      const data = await res.json();
      const auctionsList = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
      
      // Buscar coordenadas do mapa para enriquecer os dados
      try {
        const mapRes = await fetch(`${API_BASE_URL}/api/v1/auctions/map-data`, { headers: getAuthHeaders() });
        if (mapRes.ok) {
          const mapData = await mapRes.json();
          const mapDataMap = new Map<number, { lat?: number; lng?: number }>(
            mapData.map((item: { id: number; lat?: number; lng?: number }) => [item.id, item])
          );
          
          // Enriquecer auctions com coordenadas
          return auctionsList.map((auction: any) => {
            const mapItem = mapDataMap.get(auction.id);
            return {
              ...auction,
              latitude: mapItem?.lat || auction.latitude || undefined,
              longitude: mapItem?.lng || auction.longitude || undefined,
            } as Auction;
          });
        }
      } catch (mapError) {
        // Se falhar ao buscar map-data, continuar sem coordenadas
        console.warn('Failed to fetch map data for auctions:', mapError);
      }
      
      return auctionsList as Auction[];
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    enabled: typeof window !== 'undefined', // Evita hydration mismatch: query só roda no cliente
  });
}

/**
 * Hook para buscar leilões ativos (React Query)
 */
export function useAuctions(filters?: AuctionFilters) {
  const { data: auctions = [], isLoading: loading, error } = useAuctionsQuery(filters);

  return {
    auctions,
    loading,
    error: error ? (error instanceof Error ? error.message : 'Unknown error') : null,
  };
}

/**
 * Hook para buscar um leilão específico (React Query)
 */
export function useAuction(id: string | number) {
  const { data: auction = null, isLoading: loading, error } = useQuery({
    queryKey: ['auction', id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/v1/auctions/${id}`, { headers: getAuthHeaders() });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Failed to fetch auction');
      return res.json() as Promise<Auction>;
    },
    enabled: !!id,
    staleTime: 60 * 1000,
  });

  return {
    auction,
    loading,
    error: error ? (error instanceof Error ? error.message : 'Unknown error') : null,
  };
}

/**
 * Hook para buscar lances de um leilão (React Query)
 */
export function useBids(auctionId: string | number) {
  const { data: bids = [], isLoading: loading, error } = useQuery({
    queryKey: ['bids', auctionId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/v1/auctions/${auctionId}/bids`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch bids');
      const data = await res.json();
      return (Array.isArray(data.data) ? data.data : []) as Bid[];
    },
    enabled: !!auctionId,
    staleTime: 30 * 1000,
  });

  return {
    bids,
    loading,
    error: error ? (error instanceof Error ? error.message : 'Unknown error') : null,
  };
}

/**
 * Hook para fazer lance (React Query mutation + invalidação)
 */
export function useBidMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({
      auctionId,
      amount,
      token,
    }: { auctionId: string | number; amount: number; token?: string }) => {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      const t = token ?? (typeof window !== 'undefined' && (localStorage.getItem('access_token') || localStorage.getItem('token')));
      if (t) headers['Authorization'] = `Bearer ${t}`;
      const res = await fetch(`${API_BASE_URL}/api/v1/auctions/${auctionId}/bids`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to place bid' }));
        throw new Error(err.message || 'Failed to place bid');
      }
      return res.json();
    },
    onSuccess: (_, { auctionId }) => {
      queryClient.invalidateQueries({ queryKey: ['auction', auctionId] });
      queryClient.invalidateQueries({ queryKey: ['bids', auctionId] });
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
    },
  });

  const placeBid = async (auctionId: string | number, amount: number, token?: string) => {
    return mutation.mutateAsync({ auctionId, amount, token });
  };

  return {
    placeBid,
    loading: mutation.isPending,
    error: mutation.error ? (mutation.error instanceof Error ? mutation.error.message : 'Unknown error') : null,
  };
}
