'use client';

import { useQuery } from '@tanstack/react-query';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const t = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (t) headers['Authorization'] = `Bearer ${t}`;
  }
  return headers;
}

export interface DashboardStats {
  occupancyRate: number;
  revenueToday: number;
  activeAuctions: number;
  wonAuctions: number;
  totalRevenue: number;
  averageBidValue: number;
  conversionRate: number;
}

export interface ProprietorAuction {
  id: number;
  title: string;
  status: 'scheduled' | 'active' | 'finished' | 'cancelled';
  start_date: string;
  end_date: string;
  current_price: number;
  total_bids: number;
  property_name?: string;
  accommodation_name?: string;
  enterprise_name?: string;
}

export interface ProprietorAuctionsFilters {
  status?: string;
  page?: number;
  limit?: number;
}

export function useProprietorDashboard(filters: ProprietorAuctionsFilters = {}) {
  const statsQuery = useQuery({
    queryKey: ['proprietor', 'dashboard', 'stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/proprietor/dashboard/stats`, {
          headers: getAuthHeaders(),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Falha ao carregar stats (${res.status})`);
        }
        const json = await res.json();
        return (json.data ?? json) as DashboardStats;
      } finally {
        clearTimeout(timeoutId);
      }
    },
    refetchInterval: 30_000,
    staleTime: 25_000,
    retry: 1,
    retryDelay: 2000,
  });

  const auctionsQuery = useQuery({
    queryKey: ['proprietor', 'auctions', filters],
    queryFn: async (): Promise<ProprietorAuction[]> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));

      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/proprietor/auctions${params.toString() ? `?${params.toString()}` : ''}`,
          {
            headers: getAuthHeaders(),
            signal: controller.signal,
          }
        );

        if (!res.ok) {
          throw new Error(`Falha ao carregar leiloes do proprietario (${res.status})`);
        }
        const json = await res.json();
        const d = json.data;
        if (Array.isArray(d)) return d as ProprietorAuction[];
        if (d && Array.isArray(d.data)) return d.data as ProprietorAuction[];
        return [];
      } finally {
        clearTimeout(timeoutId);
      }
    },
    staleTime: 60_000,
    retry: 1,
    retryDelay: 2000,
  });

  const loading = statsQuery.isLoading || auctionsQuery.isLoading;
  const error = statsQuery.error ?? auctionsQuery.error;
  const stats = statsQuery.data ?? null;
  const auctions = auctionsQuery.data ?? [];

  return {
    stats,
    auctions,
    loading,
    error: error ? (error instanceof Error ? error.message : 'Erro desconhecido') : null,
  };
}
