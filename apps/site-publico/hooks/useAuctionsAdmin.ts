'use client';

import { useState, useCallback } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

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
}

export interface AuctionFormData {
  title: string;
  description?: string;
  enterprise_id: number;
  property_id?: number;
  accommodation_id?: number;
  start_price: number;
  min_increment: number;
  reserve_price?: number;
  start_date: string;
  end_date: string;
  status?: 'scheduled' | 'active' | 'finished' | 'cancelled';
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

export function useAuctionsAdmin() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAuctions = useCallback(async (filters?: {
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

      const url = `${API_BASE_URL}/api/v1/auctions${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': getAuthToken(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch auctions: ${response.statusText}`);
      }

      const data = await response.json();
      setAuctions(Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setAuctions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createAuction = useCallback(async (auctionData: AuctionFormData): Promise<Auction> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/v1/auctions`, {
        method: 'POST',
        headers: {
          'Authorization': getAuthToken(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(auctionData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create auction' }));
        throw new Error(errorData.message || 'Failed to create auction');
      }

      const data = await response.json();
      const newAuction = data.data || data;
      setAuctions(prev => [...prev, newAuction]);
      return newAuction;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateAuction = useCallback(async (id: number, auctionData: Partial<AuctionFormData>): Promise<Auction> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/v1/auctions/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': getAuthToken(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(auctionData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update auction' }));
        throw new Error(errorData.message || 'Failed to update auction');
      }

      const data = await response.json();
      const updatedAuction = data.data || data;
      setAuctions(prev => prev.map(a => a.id === id ? updatedAuction : a));
      return updatedAuction;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteAuction = useCallback(async (id: number): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/v1/auctions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': getAuthToken(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to delete auction' }));
        throw new Error(errorData.message || 'Failed to delete auction');
      }

      setAuctions(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    auctions,
    loading,
    error,
    loadAuctions,
    createAuction,
    updateAuction,
    deleteAuction,
  };
}
