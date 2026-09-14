/**
 * Serviço de Compartilhamento de Localização em Tempo Real
 * Permite que membros de um grupo compartilhem suas localizações em tempo real
 */

import { queryDatabase } from './db';
import { WebSocketService } from './websocket-service';

export interface LocationUpdate {
  userId: number;
  userName?: string;
  tripId?: number;
  wishlistId?: number;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: Date;
  address?: string;
}

export interface SharedLocation {
  userId: number;
  userName?: string;
  avatar?: string;
  latitude: number;
  longitude: number;
  lastUpdate: Date;
  isActive: boolean;
  accuracy?: number;
  heading?: number;
  speed?: number;
  address?: string;
}

/**
 * Serviço de compartilhamento de localização em tempo real
 */
export class RealtimeLocationService {
  private wsService: WebSocketService | null = null;
  private subscribers: Map<string, Set<(locations: SharedLocation[]) => void>> = new Map();
  private locationCache: Map<string, Map<number, SharedLocation>> = new Map();
  private watchId: number | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

  /**
   * Conectar ao WebSocket para um grupo/viagem
   */
  async connect(groupId: string, token: string): Promise<void> {
    const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3002';
    this.wsService = new WebSocketService(wsUrl, token);

    await this.wsService.connect();

    // Subscrever a atualizações de localização do grupo
    this.wsService.on(`location_${groupId}`, (data: LocationUpdate) => {
      this.handleLocationUpdate(groupId, data);
    });

    // Inicializar cache
    if (!this.locationCache.has(groupId)) {
      this.locationCache.set(groupId, new Map());
    }
  }

  /**
   * Desconectar
   */
  disconnect(): void {
    this.stopSharing();
    
    if (this.wsService) {
      this.wsService.disconnect();
      this.wsService = null;
    }
    
    this.subscribers.clear();
    this.locationCache.clear();
  }

  /**
   * Iniciar compartilhamento de localização com melhorias de precisão e privacidade
   */
  async startSharing(
    groupId: string,
    userId: number,
    userName?: string,
    options?: {
      tripId?: number;
      wishlistId?: number;
      updateInterval?: number; // em segundos
      privacyLevel?: 'public' | 'friends' | 'private'; // Nível de privacidade
      autoStopAfter?: number; // Parar automaticamente após X minutos
      minAccuracy?: number; // Precisão mínima aceitável (em metros)
    }
  ): Promise<void> {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      throw new Error('Geolocalização não suportada pelo navegador');
    }

    const updateInterval = (options?.updateInterval || 30) * 1000; // Converter para ms
    const minAccuracy = options?.minAccuracy || 50; // 50 metros por padrão
    const startTime = Date.now();
    const autoStopAfter = options?.autoStopAfter ? options.autoStopAfter * 60 * 1000 : null;

    // Configurar parada automática
    if (autoStopAfter) {
      setTimeout(() => {
        console.log('Parando compartilhamento automaticamente após tempo limite');
        this.stopSharing();
      }, autoStopAfter);
    }

    // Iniciar watch de geolocalização com configurações otimizadas
    this.watchId = navigator.geolocation.watchPosition(
      async (position) => {
        // Filtrar por precisão mínima
        if (position.coords.accuracy && position.coords.accuracy > minAccuracy) {
          console.warn(`Precisão insuficiente: ${position.coords.accuracy}m (mínimo: ${minAccuracy}m)`);
          return;
        }

        const locationUpdate: LocationUpdate = {
          userId,
          userName,
          tripId: options?.tripId,
          wishlistId: options?.wishlistId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy || undefined,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined,
          timestamp: new Date(),
        };

        // Obter endereço (opcional, pode ser assíncrono)
        try {
          const address = await this.reverseGeocode(
            position.coords.latitude,
            position.coords.longitude
          );
          locationUpdate.address = address;
        } catch (error) {
          console.warn('Erro ao obter endereço:', error);
        }

        // Aplicar privacidade (ofuscar coordenadas se necessário)
        if (options?.privacyLevel === 'private') {
          // Ofuscar coordenadas (adicionar ruído aleatório de até 100m)
          const noise = (Math.random() - 0.5) * 0.001; // ~100m
          locationUpdate.latitude += noise;
          locationUpdate.longitude += noise;
          locationUpdate.accuracy = (locationUpdate.accuracy || 0) + 100;
        }

        // Enviar atualização
        await this.sendLocationUpdate(groupId, locationUpdate);
      },
      (error) => {
        console.error('Erro ao obter localização:', error);
        // Retry com configurações menos restritivas
        if (error.code === error.TIMEOUT) {
          console.log('Timeout, tentando com configurações menos restritivas...');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Aumentado para 15s
        maximumAge: 10000, // Aceitar dados até 10s antigos
      }
    );

    // Configurar intervalo de atualização automática
    this.updateInterval = setInterval(async () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const locationUpdate: LocationUpdate = {
              userId,
              userName,
              tripId: options?.tripId,
              wishlistId: options?.wishlistId,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy || undefined,
              heading: position.coords.heading || undefined,
              speed: position.coords.speed || undefined,
              timestamp: new Date(),
            };

            await this.sendLocationUpdate(groupId, locationUpdate);
          },
          (error) => {
            console.error('Erro ao atualizar localização:', error);
          }
        );
      }
    }, updateInterval);
  }

  /**
   * Parar compartilhamento de localização
   */
  stopSharing(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Enviar atualização de localização
   */
  async sendLocationUpdate(
    groupId: string,
    location: LocationUpdate
  ): Promise<void> {
    // Salvar no banco
    await this.saveLocationUpdate(location);

    // Atualizar cache
    const groupCache = this.locationCache.get(groupId);
    if (groupCache) {
      groupCache.set(location.userId, {
        userId: location.userId,
        userName: location.userName,
        latitude: location.latitude,
        longitude: location.longitude,
        lastUpdate: location.timestamp,
        isActive: true,
        accuracy: location.accuracy,
        heading: location.heading,
        speed: location.speed,
        address: location.address,
      });
    }

    // Enviar via WebSocket
    if (this.wsService) {
      this.wsService.emit('location_update', {
        groupId,
        location,
      });
    }

    // Notificar subscribers
    this.notifySubscribers(groupId);
  }

  /**
   * Salvar atualização de localização no banco
   */
  private async saveLocationUpdate(location: LocationUpdate): Promise<void> {
    await queryDatabase(
      `INSERT INTO shared_locations 
       (user_id, trip_id, wishlist_id, latitude, longitude, accuracy, heading, speed, address, shared_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, COALESCE(trip_id, 0), COALESCE(wishlist_id, 0))
       DO UPDATE SET
         latitude = $4,
         longitude = $5,
         accuracy = $6,
         heading = $7,
         speed = $8,
         address = $9,
         shared_at = CURRENT_TIMESTAMP,
         is_active = true`,
      [
        location.userId,
        location.tripId || null,
        location.wishlistId || null,
        location.latitude,
        location.longitude,
        location.accuracy || null,
        location.heading || null,
        location.speed || null,
        location.address || null,
      ]
    );
  }

  /**
   * Subscrever a atualizações de localização de um grupo
   */
  subscribe(
    groupId: string,
    callback: (locations: SharedLocation[]) => void
  ): () => void {
    if (!this.subscribers.has(groupId)) {
      this.subscribers.set(groupId, new Set());
    }

    this.subscribers.get(groupId)!.add(callback);

    // Enviar localizações atuais imediatamente
    this.loadGroupLocations(groupId).then(locations => {
      callback(locations);
    });

    // Retornar função de unsubscribe
    return () => {
      const subs = this.subscribers.get(groupId);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(groupId);
        }
      }
    };
  }

  /**
   * Carregar localizações de um grupo
   */
  async loadGroupLocations(
    groupId: string,
    tripId?: number,
    wishlistId?: number
  ): Promise<SharedLocation[]> {
    // Buscar do banco
    let query = `SELECT 
      sl.user_id,
      sl.latitude,
      sl.longitude,
      sl.accuracy,
      sl.heading,
      sl.speed,
      sl.address,
      sl.shared_at,
      sl.is_active,
      c.name as user_name,
      c.avatar
    FROM shared_locations sl
    JOIN customers c ON sl.user_id = c.id
    WHERE sl.is_active = true`;

    const params: any[] = [];
    
    if (tripId) {
      query += ` AND sl.trip_id = $${params.length + 1}`;
      params.push(tripId);
    } else if (wishlistId) {
      query += ` AND sl.wishlist_id = $${params.length + 1}`;
      params.push(wishlistId);
    }

    query += ` AND sl.shared_at > CURRENT_TIMESTAMP - INTERVAL '5 minutes'
              ORDER BY sl.shared_at DESC`;

    const locations = await queryDatabase(query, params);

    // Converter para formato SharedLocation
    const sharedLocations: SharedLocation[] = locations.map((loc: any) => ({
      userId: loc.user_id,
      userName: loc.user_name,
      avatar: loc.avatar,
      latitude: parseFloat(loc.latitude),
      longitude: parseFloat(loc.longitude),
      lastUpdate: new Date(loc.shared_at),
      isActive: loc.is_active,
      accuracy: loc.accuracy ? parseFloat(loc.accuracy) : undefined,
      heading: loc.heading ? parseFloat(loc.heading) : undefined,
      speed: loc.speed ? parseFloat(loc.speed) : undefined,
      address: loc.address,
    }));

    // Atualizar cache
    const groupCache = this.locationCache.get(groupId) || new Map();
    sharedLocations.forEach(loc => {
      groupCache.set(loc.userId, loc);
    });
    this.locationCache.set(groupId, groupCache);

    return sharedLocations;
  }

  /**
   * Obter localização de um usuário específico
   */
  async getUserLocation(
    userId: number,
    tripId?: number,
    wishlistId?: number
  ): Promise<SharedLocation | null> {
    let query = `SELECT 
      sl.user_id,
      sl.latitude,
      sl.longitude,
      sl.accuracy,
      sl.heading,
      sl.speed,
      sl.address,
      sl.shared_at,
      sl.is_active,
      c.name as user_name,
      c.avatar
    FROM shared_locations sl
    JOIN customers c ON sl.user_id = c.id
    WHERE sl.user_id = $1 AND sl.is_active = true`;

    const params: any[] = [userId];

    if (tripId) {
      query += ` AND sl.trip_id = $${params.length + 1}`;
      params.push(tripId);
    } else if (wishlistId) {
      query += ` AND sl.wishlist_id = $${params.length + 1}`;
      params.push(wishlistId);
    }

    query += ` ORDER BY sl.shared_at DESC LIMIT 1`;

    const result = await queryDatabase(query, params);

    if (result.length === 0) {
      return null;
    }

    const loc = result[0];
    return {
      userId: loc.user_id,
      userName: loc.user_name,
      avatar: loc.avatar,
      latitude: parseFloat(loc.latitude),
      longitude: parseFloat(loc.longitude),
      lastUpdate: new Date(loc.shared_at),
      isActive: loc.is_active,
      accuracy: loc.accuracy ? parseFloat(loc.accuracy) : undefined,
      heading: loc.heading ? parseFloat(loc.heading) : undefined,
      speed: loc.speed ? parseFloat(loc.speed) : undefined,
      address: loc.address,
    };
  }

  /**
   * Parar compartilhamento de localização de um usuário
   */
  async stopUserSharing(
    userId: number,
    tripId?: number,
    wishlistId?: number
  ): Promise<void> {
    let query = `UPDATE shared_locations 
                 SET is_active = false 
                 WHERE user_id = $1`;

    const params: any[] = [userId];

    if (tripId) {
      query += ` AND trip_id = $${params.length + 1}`;
      params.push(tripId);
    } else if (wishlistId) {
      query += ` AND wishlist_id = $${params.length + 1}`;
      params.push(wishlistId);
    }

    await queryDatabase(query, params);

    // Notificar via WebSocket
    if (this.wsService) {
      this.wsService.emit('location_stopped', {
        userId,
        tripId,
        wishlistId,
      });
    }
  }

  /**
   * Reverse geocoding melhorado (obter endereço de coordenadas)
   * Tenta múltiplos serviços para melhor precisão
   */
  private async reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<string | undefined> {
    // Tentar Google Maps API primeiro
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
      if (apiKey) {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}&language=pt-BR`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            return data.results[0].formatted_address;
          }
        }
      }
    } catch (error) {
      console.warn('Erro ao fazer reverse geocoding com Google Maps:', error);
    }

    // Fallback: OpenStreetMap Nominatim (gratuito, sem API key)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'RSV360-LocationService/1.0',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.address) {
          const addr = data.address;
          const parts = [];
          if (addr.road) parts.push(addr.road);
          if (addr.house_number) parts.push(addr.house_number);
          if (addr.neighbourhood || addr.suburb) parts.push(addr.neighbourhood || addr.suburb);
          if (addr.city || addr.town) parts.push(addr.city || addr.town);
          if (addr.state) parts.push(addr.state);
          if (parts.length > 0) {
            return parts.join(', ');
          }
        }
      }
    } catch (error) {
      console.warn('Erro ao fazer reverse geocoding com OpenStreetMap:', error);
    }

    return undefined;
  }

  /**
   * Lidar com atualização de localização recebida via WebSocket
   */
  private async handleLocationUpdate(
    groupId: string,
    update: LocationUpdate
  ): Promise<void> {
    // Atualizar cache
    const groupCache = this.locationCache.get(groupId);
    if (groupCache) {
      groupCache.set(update.userId, {
        userId: update.userId,
        userName: update.userName,
        latitude: update.latitude,
        longitude: update.longitude,
        lastUpdate: update.timestamp,
        isActive: true,
        accuracy: update.accuracy,
        heading: update.heading,
        speed: update.speed,
        address: update.address,
      });
    }

    // Notificar subscribers
    this.notifySubscribers(groupId);
  }

  /**
   * Notificar todos os subscribers de um grupo
   */
  private notifySubscribers(groupId: string): void {
    const subs = this.subscribers.get(groupId);
    if (subs) {
      const groupCache = this.locationCache.get(groupId);
      const locations = groupCache
        ? Array.from(groupCache.values())
        : [];

      subs.forEach(callback => {
        try {
          callback(locations);
        } catch (error) {
          console.error('Erro ao notificar subscriber:', error);
        }
      });
    }
  }

  /**
   * Calcular distância entre duas localizações (em km)
   */
  static calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Verificar se uma localização está próxima de outra (dentro de um raio)
   */
  static isNearby(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
    radiusKm: number
  ): boolean {
    const distance = this.calculateDistance(lat1, lng1, lat2, lng2);
    return distance <= radiusKm;
  }
}

// Instância singleton
export const realtimeLocationService = new RealtimeLocationService();

