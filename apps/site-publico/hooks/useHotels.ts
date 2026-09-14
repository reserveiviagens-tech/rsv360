'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Hotel } from './useWebsiteData';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export interface HotelFilters {
  location?: string;
  propertyType?: string[];
  minPrice?: number;
  maxPrice?: number;
  amenities?: string[];
  stars?: number;
  search?: string;
}

/** Serializa arrays de forma estável para evitar loops infinitos */
function safeArrayKey(arr: unknown[] | undefined): string {
  if (!Array.isArray(arr)) return '';
  return [...arr].sort().join(',');
}

/**
 * Função auxiliar para extrair coordenadas de um hotel
 * Prioridade: latitude/longitude direto > coordinates > metadata.coordinates > fallback Caldas Novas
 */
function getHotelCoordinates(hotel: Hotel): { lat: number; lng: number } {
  // 1. Tentar latitude/longitude direto
  if (hotel.latitude !== undefined && hotel.longitude !== undefined) {
    return { lat: hotel.latitude, lng: hotel.longitude };
  }
  
  // 2. Tentar coordinates object
  if (hotel.coordinates?.lat && hotel.coordinates?.lng) {
    return { lat: hotel.coordinates.lat, lng: hotel.coordinates.lng };
  }
  
  // 3. Tentar metadata.coordinates
  if (hotel.metadata?.coordinates?.lat && hotel.metadata?.coordinates?.lng) {
    return {
      lat: hotel.metadata.coordinates.lat,
      lng: hotel.metadata.coordinates.lng,
    };
  }
  
  // 4. Tentar metadata.latitude/longitude
  if (hotel.metadata?.latitude && hotel.metadata?.longitude) {
    return {
      lat: hotel.metadata.latitude,
      lng: hotel.metadata.longitude,
    };
  }
  
  // 5. Fallback para Caldas Novas, GO
  return { lat: -17.7444, lng: -48.6278 };
}

export interface HotelWithAuction extends Hotel {
  auction_id?: number;
  auction_status?: 'scheduled' | 'active' | 'finished' | 'cancelled';
  auction_current_price?: number;
  auction_start_price?: number;
  auction_end_date?: string;
  auction_total_bids?: number;
  auction_participants?: number;
}

/**
 * Hook para buscar hotéis do CMS, especialmente os 45 hotéis de Caldas Novas
 */
export function useHotels(filters?: HotelFilters) {
  const [hotels, setHotels] = useState<HotelWithAuction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chave estável para evitar loop infinito - filters é novo objeto a cada render
  const filtersKey = useMemo(() => {
    const loc = filters?.location ?? '';
    const pt = safeArrayKey(filters?.propertyType);
    const min = filters?.minPrice ?? null;
    const max = filters?.maxPrice ?? null;
    const search = filters?.search ?? '';
    const am = safeArrayKey(filters?.amenities);
    const st = filters?.stars ?? null;
    return `${loc}|${pt}|${min}|${max}|${search}|${am}|${st}`;
  }, [
    filters?.location ?? '',
    safeArrayKey(filters?.propertyType),
    filters?.minPrice ?? null,
    filters?.maxPrice ?? null,
    filters?.search ?? '',
    safeArrayKey(filters?.amenities),
    filters?.stars ?? null,
  ]);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const fetchHotels = async () => {
      try {
        setLoading(true);
        
        // Usar a rota local do Next.js para buscar hotéis do CMS
        const params = new URLSearchParams();
        params.set('status', 'active');
        if (filters?.location) {
          params.set('location', filters.location);
        }
        if (filters?.search) {
          params.set('search', filters.search);
        }

        // Buscar da API local do Next.js
        const response = await fetch(`/api/website/content/hotels?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to fetch hotels');
        }

        const data = await response.json();
        let hotelsData: Hotel[] = Array.isArray(data.data) ? data.data : [];
        
        // Aplicar filtros adicionais no cliente
        if (filters) {
          if (filters.propertyType && filters.propertyType.length > 0) {
            // Filtrar por tipo de propriedade (baseado em metadata ou features)
            hotelsData = hotelsData.filter(hotel => {
              const hotelType = hotel.metadata?.propertyType || hotel.metadata?.category || '';
              return filters.propertyType!.some(type => 
                hotelType.toLowerCase().includes(type.toLowerCase())
              );
            });
          }

          if (filters.minPrice !== undefined) {
            hotelsData = hotelsData.filter(hotel => (hotel.price || 0) >= filters.minPrice!);
          }

          if (filters.maxPrice !== undefined) {
            hotelsData = hotelsData.filter(hotel => (hotel.price || 0) <= filters.maxPrice!);
          }

          if (filters.stars !== undefined) {
            hotelsData = hotelsData.filter(hotel => (hotel.stars || 0) >= filters.stars!);
          }

          if (filters.amenities && filters.amenities.length > 0) {
            hotelsData = hotelsData.filter(hotel => {
              const hotelAmenities = hotel.features || [];
              return filters.amenities!.some(amenity =>
                hotelAmenities.some(f => f.toLowerCase().includes(amenity.toLowerCase()))
              );
            });
          }
        }

        // Buscar leilões ativos para combinar com hotéis
        try {
          const auctionsResponse = await fetch(`${API_BASE_URL}/api/v1/auctions/active`, {
            signal: controller.signal,
          });
          if (auctionsResponse.ok) {
            const auctionsData = await auctionsResponse.json();
            const auctions = Array.isArray(auctionsData) ? auctionsData : [];

            // Combinar dados de hotéis com leilões
            const hotelsWithAuctions: HotelWithAuction[] = hotelsData.map(hotel => {
              // Extrair coordenadas do hotel
              const coords = getHotelCoordinates(hotel);
              
              // Tentar encontrar leilão relacionado ao hotel
              const relatedAuction = auctions.find((auction: any) => 
                auction.property_id === hotel.id || 
                auction.accommodation_id === hotel.id ||
                auction.title?.toLowerCase().includes(hotel.title.toLowerCase())
              );

              const hotelWithAuction: HotelWithAuction = {
                ...hotel,
                latitude: coords.lat,
                longitude: coords.lng,
                coordinates: coords,
              };

              if (relatedAuction) {
                return {
                  ...hotelWithAuction,
                  auction_id: relatedAuction.id,
                  auction_status: relatedAuction.status,
                  auction_current_price: relatedAuction.current_price,
                  auction_start_price: relatedAuction.start_price,
                  auction_end_date: relatedAuction.end_date,
                  auction_total_bids: relatedAuction.total_bids || 0,
                  auction_participants: relatedAuction.total_bids || 0,
                };
              }

              return hotelWithAuction;
            });

            if (mountedRef.current) setHotels(hotelsWithAuctions);
          } else {
            if (mountedRef.current) setHotels(hotelsData as HotelWithAuction[]);
          }
        } catch (auctionError) {
          // Se falhar ao buscar leilões, apenas retornar hotéis
          if (mountedRef.current) setHotels(hotelsData as HotelWithAuction[]);
        }

        if (mountedRef.current) setError(null);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setHotels([]);
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    fetchHotels();
    return () => controller.abort();
  }, [filtersKey]);

  return { hotels, loading, error };
}

/**
 * Hook para buscar hotéis de Caldas Novas especificamente
 */
export function useCaldasNovasHotels(filters?: Omit<HotelFilters, 'location'>) {
  return useHotels({ ...filters, location: 'Caldas Novas' });
}
