/**
 * Serviço de Calendário do Grupo Sincronizado
 * Sincroniza eventos e disponibilidade entre membros de um grupo
 */

import { queryDatabase } from './db';
import { WebSocketService } from './websocket-service';

export interface CalendarEvent {
  id?: number;
  groupId: string;
  tripId?: number;
  wishlistId?: number;
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  allDay?: boolean;
  location?: string;
  createdBy: number;
  attendees?: number[];
  color?: string;
  type?: 'booking' | 'activity' | 'meeting' | 'reminder' | 'custom';
  metadata?: Record<string, unknown>;
}

export interface CalendarAvailability {
  userId: number;
  userName?: string;
  date: string; // YYYY-MM-DD
  available: boolean;
  reason?: string;
}

/**
 * Serviço de calendário do grupo
 */
export class GroupCalendarService {
  private wsService: WebSocketService | null = null;
  private subscribers: Map<string, Set<(events: CalendarEvent[]) => void>> = new Map();
  private eventCache: Map<string, CalendarEvent[]> = new Map();

  /**
   * Conectar ao WebSocket para um grupo
   */
  async connect(groupId: string, token: string): Promise<void> {
    const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3002';
    this.wsService = new WebSocketService(wsUrl, token);

    await this.wsService.connect();

    // Subscrever a eventos do calendário
    this.wsService.on(`calendar_${groupId}_event`, (data: CalendarEvent) => {
      this.handleEventUpdate(groupId, data);
    });

    this.wsService.on(`calendar_${groupId}_event_deleted`, (data: { eventId: number }) => {
      this.handleEventDeleted(groupId, data.eventId);
    });
  }

  /**
   * Desconectar
   */
  disconnect(): void {
    if (this.wsService) {
      this.wsService.disconnect();
      this.wsService = null;
    }
    this.subscribers.clear();
    this.eventCache.clear();
  }

  /**
   * Criar evento no calendário
   */
  async createEvent(event: CalendarEvent): Promise<CalendarEvent> {
    // Salvar no banco
    const result = await queryDatabase(
      `INSERT INTO group_calendar_events 
       (group_id, trip_id, wishlist_id, title, description, start_date, end_date, all_day, 
        location, created_by, attendees, color, type, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        event.groupId,
        event.tripId || null,
        event.wishlistId || null,
        event.title,
        event.description || null,
        event.startDate,
        event.endDate || null,
        event.allDay || false,
        event.location || null,
        event.createdBy,
        event.attendees ? JSON.stringify(event.attendees) : null,
        event.color || '#3b82f6',
        event.type || 'custom',
        event.metadata ? JSON.stringify(event.metadata) : null,
      ]
    );

    const createdEvent = this.mapDbToEvent(result[0]);

    // Enviar via WebSocket
    if (this.wsService) {
      this.wsService.emit('calendar_event_created', {
        groupId: event.groupId,
        event: createdEvent,
      });
    }

    // Atualizar cache e notificar
    await this.refreshGroupEvents(event.groupId);
    this.notifySubscribers(event.groupId);

    return createdEvent;
  }

  /**
   * Atualizar evento
   */
  async updateEvent(eventId: number, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.title !== undefined) {
      setClause.push(`title = $${paramIndex++}`);
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      setClause.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.startDate !== undefined) {
      setClause.push(`start_date = $${paramIndex++}`);
      values.push(updates.startDate);
    }
    if (updates.endDate !== undefined) {
      setClause.push(`end_date = $${paramIndex++}`);
      values.push(updates.endDate);
    }
    if (updates.allDay !== undefined) {
      setClause.push(`all_day = $${paramIndex++}`);
      values.push(updates.allDay);
    }
    if (updates.location !== undefined) {
      setClause.push(`location = $${paramIndex++}`);
      values.push(updates.location);
    }
    if (updates.attendees !== undefined) {
      setClause.push(`attendees = $${paramIndex++}`);
      values.push(JSON.stringify(updates.attendees));
    }
    if (updates.color !== undefined) {
      setClause.push(`color = $${paramIndex++}`);
      values.push(updates.color);
    }
    if (updates.type !== undefined) {
      setClause.push(`type = $${paramIndex++}`);
      values.push(updates.type);
    }
    if (updates.metadata !== undefined) {
      setClause.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(updates.metadata));
    }

    if (setClause.length === 0) {
      throw new Error('Nenhuma atualização fornecida');
    }

    setClause.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(eventId);

    const result = await queryDatabase(
      `UPDATE group_calendar_events 
       SET ${setClause.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.length === 0) {
      throw new Error('Evento não encontrado');
    }

    const updatedEvent = this.mapDbToEvent(result[0]);

    // Enviar via WebSocket
    if (this.wsService) {
      this.wsService.emit('calendar_event_updated', {
        groupId: updatedEvent.groupId,
        event: updatedEvent,
      });
    }

    // Atualizar cache e notificar
    await this.refreshGroupEvents(updatedEvent.groupId);
    this.notifySubscribers(updatedEvent.groupId);

    return updatedEvent;
  }

  /**
   * Deletar evento
   */
  async deleteEvent(eventId: number, groupId: string): Promise<void> {
    await queryDatabase(
      `DELETE FROM group_calendar_events WHERE id = $1`,
      [eventId]
    );

    // Enviar via WebSocket
    if (this.wsService) {
      this.wsService.emit('calendar_event_deleted', {
        groupId,
        eventId,
      });
    }

    // Atualizar cache e notificar
    await this.refreshGroupEvents(groupId);
    this.notifySubscribers(groupId);
  }

  /**
   * Obter eventos de um grupo
   */
  async getGroupEvents(
    groupId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CalendarEvent[]> {
    // Verificar cache
    const cached = this.eventCache.get(groupId);
    if (cached && !startDate && !endDate) {
      return cached;
    }

    // Buscar do banco
    let query = `SELECT * FROM group_calendar_events WHERE group_id = $1`;
    const params: any[] = [groupId];

    if (startDate) {
      query += ` AND start_date >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND (end_date IS NULL OR end_date <= $${params.length + 1})`;
      params.push(endDate);
    }

    query += ` ORDER BY start_date ASC`;

    const events = await queryDatabase(query, params);

    const mappedEvents = events.map((e: any) => this.mapDbToEvent(e));

    // Atualizar cache
    if (!startDate && !endDate) {
      this.eventCache.set(groupId, mappedEvents);
    }

    return mappedEvents;
  }

  /**
   * Subscrever a atualizações de eventos
   */
  subscribe(
    groupId: string,
    callback: (events: CalendarEvent[]) => void
  ): () => void {
    if (!this.subscribers.has(groupId)) {
      this.subscribers.set(groupId, new Set());
    }

    this.subscribers.get(groupId)!.add(callback);

    // Enviar eventos atuais imediatamente
    this.getGroupEvents(groupId).then(events => {
      callback(events);
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
   * Adicionar disponibilidade
   */
  async setAvailability(
    groupId: string,
    userId: number,
    date: string,
    available: boolean,
    reason?: string
  ): Promise<void> {
    await queryDatabase(
      `INSERT INTO group_calendar_availability 
       (group_id, user_id, date, available, reason, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (group_id, user_id, date)
       DO UPDATE SET available = $4, reason = $5, updated_at = CURRENT_TIMESTAMP`,
      [groupId, userId, date, available, reason || null]
    );

    // Enviar via WebSocket
    if (this.wsService) {
      this.wsService.emit('calendar_availability_updated', {
        groupId,
        userId,
        date,
        available,
        reason,
      });
    }
  }

  /**
   * Obter disponibilidade do grupo
   */
  async getGroupAvailability(
    groupId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarAvailability[]> {
    const result = await queryDatabase(
      `SELECT 
        ca.user_id,
        ca.date,
        ca.available,
        ca.reason,
        c.name as user_name
      FROM group_calendar_availability ca
      JOIN customers c ON ca.user_id = c.id
      WHERE ca.group_id = $1
      AND ca.date >= $2
      AND ca.date <= $3
      ORDER BY ca.date, c.name`,
      [groupId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
    );

    return result.map((r: any) => ({
      userId: r.user_id,
      userName: r.user_name,
      date: r.date,
      available: r.available,
      reason: r.reason,
    }));
  }

  /**
   * Mapear dados do banco para CalendarEvent
   */
  private mapDbToEvent(row: any): CalendarEvent {
    return {
      id: row.id,
      groupId: row.group_id,
      tripId: row.trip_id,
      wishlistId: row.wishlist_id,
      title: row.title,
      description: row.description,
      startDate: new Date(row.start_date),
      endDate: row.end_date ? new Date(row.end_date) : undefined,
      allDay: row.all_day,
      location: row.location,
      createdBy: row.created_by,
      attendees: row.attendees ? JSON.parse(row.attendees) : undefined,
      color: row.color,
      type: row.type,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  /**
   * Atualizar cache de eventos
   */
  private async refreshGroupEvents(groupId: string): Promise<void> {
    const events = await this.getGroupEvents(groupId);
    this.eventCache.set(groupId, events);
  }

  /**
   * Lidar com atualização de evento recebida via WebSocket
   */
  private async handleEventUpdate(groupId: string, event: CalendarEvent): Promise<void> {
    await this.refreshGroupEvents(groupId);
    this.notifySubscribers(groupId);
  }

  /**
   * Lidar com deleção de evento recebida via WebSocket
   */
  private async handleEventDeleted(groupId: string, eventId: number): Promise<void> {
    await this.refreshGroupEvents(groupId);
    this.notifySubscribers(groupId);
  }

  /**
   * Notificar todos os subscribers de um grupo
   */
  private notifySubscribers(groupId: string): void {
    const subs = this.subscribers.get(groupId);
    if (subs) {
      const events = this.eventCache.get(groupId) || [];
      subs.forEach(callback => {
        try {
          callback(events);
        } catch (error) {
          console.error('Erro ao notificar subscriber:', error);
        }
      });
    }
  }
}

// Instância singleton
export const groupCalendarService = new GroupCalendarService();

