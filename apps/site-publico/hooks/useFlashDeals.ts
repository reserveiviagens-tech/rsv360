'use client';

import { useState, useEffect } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export interface FlashDeal {
  id: number;
  enterprise_id: number;
  property_id?: number;
  accommodation_id?: number;
  title: string;
  description?: string;
  original_price: number;
  current_price: number;
  discount_percentage: number;
  max_discount: number;
  discount_increment: number;
  increment_interval: number;
  units_available: number;
  units_sold: number;
  start_date: string;
  end_date: string;
  status: 'scheduled' | 'active' | 'sold_out' | 'expired' | 'cancelled';
  created_at: string;
  updated_at: string;
  enterprise_name?: string;
  property_name?: string;
  accommodation_name?: string;
}

/**
 * Hook para buscar flash deals ativos
 */
export function useFlashDeals() {
  const [flashDeals, setFlashDeals] = useState<FlashDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFlashDeals = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/v1/flash-deals/active`);

        if (!response.ok) {
          throw new Error('Failed to fetch flash deals');
        }

        const data = await response.json();
        setFlashDeals(Array.isArray(data) ? data : []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setFlashDeals([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFlashDeals();
  }, []);

  return { flashDeals, loading, error };
}

/**
 * Hook para buscar um flash deal específico
 */
export function useFlashDeal(id: string | number) {
  const [flashDeal, setFlashDeal] = useState<FlashDeal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchFlashDeal = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/v1/flash-deals/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            setFlashDeal(null);
            setError(null);
            return;
          }
          throw new Error('Failed to fetch flash deal');
        }

        const data = await response.json();
        setFlashDeal(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setFlashDeal(null);
      } finally {
        setLoading(false);
      }
    };

    fetchFlashDeal();
  }, [id]);

  return { flashDeal, loading, error };
}
