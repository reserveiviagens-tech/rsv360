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

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  auctionRevenue?: number;
}

export interface OccupancyDataPoint {
  date: string;
  rate: number;
}

export interface AuctionPerformanceData {
  byStatus: Array<{ status: string; count: number }>;
  wonVsLost: { won: number; lost: number };
}

type Period = '7d' | '30d' | '90d' | '1y';

export function useRevenueData(period: Period = '30d') {
  const { data, isLoading: loading, error } = useQuery({
    queryKey: ['proprietor', 'revenue', period],
    queryFn: async () => {
      const headers = getAuthHeaders();
      const [revenueRes, occupancyRes, perfRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/proprietor/revenue/trends?period=${period}`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/proprietor/occupancy/trends?period=${period}`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/proprietor/auctions/performance`, { headers }),
      ]);
      const revenueData: RevenueDataPoint[] = revenueRes.ok
        ? ((await revenueRes.json()).data ?? []).map((t: { date: string; revenue?: number }) => ({
            date: t.date,
            revenue: t.revenue ?? 0,
          }))
        : [];
      const occupancyData: OccupancyDataPoint[] = occupancyRes.ok
        ? ((await occupancyRes.json()).data ?? []).map((t: { date: string; rate?: number }) => ({
            date: t.date,
            rate: t.rate ?? 0,
          }))
        : [];
      let performanceData: AuctionPerformanceData | null = null;
      if (perfRes.ok) {
        const j = await perfRes.json();
        performanceData = (j.data ?? j) as AuctionPerformanceData;
      }
      return { revenueData, occupancyData, performanceData };
    },
    staleTime: 90 * 1000,
  });

  return {
    revenueData: data?.revenueData ?? [],
    occupancyData: data?.occupancyData ?? [],
    performanceData: data?.performanceData ?? null,
    loading,
    error: error ? (error instanceof Error ? error.message : 'Erro desconhecido') : null,
  };
}
