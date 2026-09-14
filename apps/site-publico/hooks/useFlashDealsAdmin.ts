'use client';

import { useState, useCallback } from 'react';

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

export interface FlashDealFormData {
  title: string;
  description?: string;
  enterprise_id: number;
  property_id?: number;
  accommodation_id?: number;
  original_price: number;
  discount_percentage: number;
  max_discount: number;
  discount_increment: number;
  increment_interval: number;
  units_available: number;
  start_date: string;
  end_date: string;
  status?: 'scheduled' | 'active' | 'sold_out' | 'expired' | 'cancelled';
}

const getAuthToken = (): string => {
  if (typeof window === 'undefined') return '';
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('admin_token='));
  if (tokenCookie) {
    const token = tokenCookie.split('=')[1];
    if (token) return `Bearer ${token}`;
  }
  const tokenFromStorage = localStorage.getItem('admin_token');
  return tokenFromStorage ? `Bearer ${tokenFromStorage}` : 'Bearer admin-token-123';
};

export function useFlashDealsAdmin() {
  const [flashDeals, setFlashDeals] = useState<FlashDeal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFlashDeals = useCallback(async (filters?: {
    status?: string;
    enterprise_id?: number;
    property_id?: number;
    accommodation_id?: number;
    search?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.enterprise_id) params.set('enterprise_id', filters.enterprise_id.toString());
      if (filters?.property_id) params.set('property_id', filters.property_id.toString());
      if (filters?.accommodation_id) params.set('accommodation_id', filters.accommodation_id.toString());
      if (filters?.search) params.set('search', filters.search);

      const url = `${API_BASE_URL}/api/v1/flash-deals${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': getAuthToken(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch flash deals: ${response.statusText}`);
      }

      const data = await response.json();
      setFlashDeals(Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setFlashDeals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createFlashDeal = useCallback(async (flashDealData: FlashDealFormData): Promise<FlashDeal> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/v1/flash-deals`, {
        method: 'POST',
        headers: {
          'Authorization': getAuthToken(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(flashDealData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create flash deal' }));
        throw new Error(errorData.message || 'Failed to create flash deal');
      }

      const data = await response.json();
      const newFlashDeal = data.data || data;
      setFlashDeals(prev => [...prev, newFlashDeal]);
      return newFlashDeal;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateFlashDeal = useCallback(async (id: number, flashDealData: Partial<FlashDealFormData>): Promise<FlashDeal> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/v1/flash-deals/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': getAuthToken(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(flashDealData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update flash deal' }));
        throw new Error(errorData.message || 'Failed to update flash deal');
      }

      const data = await response.json();
      const updatedFlashDeal = data.data || data;
      setFlashDeals(prev => prev.map(fd => fd.id === id ? updatedFlashDeal : fd));
      return updatedFlashDeal;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteFlashDeal = useCallback(async (id: number): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/v1/flash-deals/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': getAuthToken(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to delete flash deal' }));
        throw new Error(errorData.message || 'Failed to delete flash deal');
      }

      setFlashDeals(prev => prev.filter(fd => fd.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    flashDeals,
    loading,
    error,
    loadFlashDeals,
    createFlashDeal,
    updateFlashDeal,
    deleteFlashDeal,
  };
}
