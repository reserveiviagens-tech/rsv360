/**
 * Serviço de Votação em Tempo Real com WebSocket
 * Sincroniza votos entre múltiplos usuários em tempo real
 */

/**
 * Serviço de Votação em Tempo Real com WebSocket
 * Sincroniza votos entre múltiplos usuários em tempo real
 * 
 * NOTA: Este serviço é usado tanto no cliente quanto no servidor.
 * No cliente, todas as operações de banco são feitas via APIs REST.
 * No servidor, pode usar queryDatabase diretamente (quando disponível).
 */

import { WebSocketService } from './websocket-service';

// Helper para verificar se está no servidor
const isServer = typeof window === 'undefined';

// Função para obter queryDatabase apenas no servidor (lazy load)
async function getQueryDatabase() {
  if (!isServer) return null;
  
  try {
    const dbModule = await import('./db');
    return dbModule.queryDatabase;
  } catch (error) {
    console.error('Erro ao importar queryDatabase:', error);
    return null;
  }
}

export interface VoteUpdate {
  itemId: number;
  wishlistId: number;
  userId: number;
  vote: 'up' | 'down' | 'maybe';
  previousVote?: 'up' | 'down' | 'maybe';
  timestamp: Date;
}

export interface VoteStats {
  itemId: number;
  votesUp: number;
  votesDown: number;
  votesMaybe: number;
  totalVotes: number;
  score: number;
  consensus: 'strong_yes' | 'yes' | 'maybe' | 'no' | 'strong_no';
}

/**
 * Serviço de votação em tempo real
 */
export class RealtimeVotingService {
  private wsService: WebSocketService | null = null;
  private subscribers: Map<number, Set<(stats: VoteStats) => void>> = new Map();
  private voteCache: Map<number, VoteStats> = new Map();

  /**
   * Conectar ao WebSocket para uma wishlist
   */
  async connect(wishlistId: number, token: string): Promise<void> {
    const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3002';
    this.wsService = new WebSocketService(wsUrl, token);

    await this.wsService.connect();

    // Subscrever a eventos de votação da wishlist
    this.wsService.on(`wishlist_${wishlistId}_vote`, (data: VoteUpdate) => {
      this.handleVoteUpdate(data);
    });

    // Subscrever a atualizações de estatísticas
    this.wsService.on(`wishlist_${wishlistId}_vote_stats`, (data: { itemId: number; stats: VoteStats }) => {
      this.handleStatsUpdate(data.itemId, data.stats);
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
    this.voteCache.clear();
  }

  /**
   * Votar em um item com confirmação
   */
  async vote(
    wishlistId: number,
    itemId: number,
    userId: number,
    vote: 'up' | 'down' | 'maybe',
    comment?: string,
    requireConfirmation = true
  ): Promise<VoteStats> {
    // Se estiver no cliente, usar API REST
    if (typeof window !== 'undefined') {
      const response = await fetch(`/api/wishlists/items/${itemId}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote, comment }),
      });
      if (!response.ok) throw new Error('Erro ao votar');
      const data = await response.json();
      const stats = data.data?.stats || data.stats;
      if (stats) {
        this.voteCache.set(itemId, stats);
        this.notifySubscribers(itemId, stats);
        return stats;
      }
    }

    // No servidor, usar queryDatabase diretamente
    const db = await getQueryDatabase();
    if (!db) {
      throw new Error('queryDatabase não disponível no servidor');
    }

    // Buscar voto anterior
    const previousVote = await db(
      `SELECT vote FROM wishlist_votes 
       WHERE item_id = $1 AND user_id = $2`,
      [itemId, userId]
    );

    const previous = previousVote.length > 0 ? previousVote[0].vote : undefined;

    // Atualizar voto no banco
    await db(
      `INSERT INTO wishlist_votes (item_id, user_id, vote, comment, voted_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (item_id, user_id)
       DO UPDATE SET vote = $3, comment = $4, voted_at = CURRENT_TIMESTAMP`,
      [itemId, userId, vote, comment || null]
    );

    // Atualizar contadores no item
    await this.updateItemVoteCounts(itemId, vote, previous);

    // Calcular novas estatísticas
    const stats = await this.calculateVoteStats(itemId);

    // Enviar atualização via WebSocket com confirmação
    if (this.wsService) {
      try {
        const confirmation = this.wsService.send('vote', {
          wishlistId,
          itemId,
          userId,
          vote,
          previousVote: previous,
          timestamp: new Date(),
          messageId: Date.now().toString(),
        }, requireConfirmation);

        if (requireConfirmation && confirmation instanceof Promise) {
          await confirmation;
        }
      } catch (error) {
        console.warn('Erro ao enviar voto via WebSocket, mas voto foi salvo:', error);
      }
    }

    // Notificar subscribers
    this.notifySubscribers(itemId, stats);

    return stats;
  }

  /**
   * Remover voto
   */
  async removeVote(
    wishlistId: number,
    itemId: number,
    userId: number
  ): Promise<VoteStats> {
    // Se estiver no cliente, usar API REST
    if (typeof window !== 'undefined') {
      const response = await fetch(`/api/wishlists/items/${itemId}/votes`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Erro ao remover voto');
      const data = await response.json();
      const stats = data.data?.stats || data.stats;
      if (stats) {
        this.voteCache.set(itemId, stats);
        this.notifySubscribers(itemId, stats);
        return stats;
      }
      return await this.calculateVoteStats(itemId);
    }

    // No servidor, usar queryDatabase
    const db = await getQueryDatabase();
    if (!db) {
      throw new Error('queryDatabase não disponível no servidor');
    }

    // Buscar voto atual
    const currentVote = await db(
      `SELECT vote FROM wishlist_votes 
       WHERE item_id = $1 AND user_id = $2`,
      [itemId, userId]
    );

    if (currentVote.length === 0) {
      // Já não tem voto, retornar stats atuais
      return await this.calculateVoteStats(itemId);
    }

    const vote = currentVote[0].vote;

    // Remover voto
    await db(
      `DELETE FROM wishlist_votes WHERE item_id = $1 AND user_id = $2`,
      [itemId, userId]
    );

    // Atualizar contadores
    await this.updateItemVoteCounts(itemId, undefined, vote);

    // Calcular novas estatísticas
    const stats = await this.calculateVoteStats(itemId);

    // Enviar atualização via WebSocket
    if (this.wsService) {
      this.wsService.emit('vote_removed', {
        wishlistId,
        itemId,
        userId,
        timestamp: new Date(),
      });
    }

    // Notificar subscribers
    this.notifySubscribers(itemId, stats);

    return stats;
  }

  /**
   * Subscrever a atualizações de um item
   */
  subscribe(itemId: number, callback: (stats: VoteStats) => void): () => void {
    if (!this.subscribers.has(itemId)) {
      this.subscribers.set(itemId, new Set());
    }

    this.subscribers.get(itemId)!.add(callback);

    // Enviar stats atuais imediatamente
    const cached = this.voteCache.get(itemId);
    if (cached) {
      callback(cached);
    } else {
      // Carregar stats
      this.calculateVoteStats(itemId).then(stats => {
        this.voteCache.set(itemId, stats);
        callback(stats);
      });
    }

    // Retornar função de unsubscribe
    return () => {
      const subs = this.subscribers.get(itemId);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(itemId);
        }
      }
    };
  }

  /**
   * Obter estatísticas de votação
   */
  async getVoteStats(itemId: number): Promise<VoteStats> {
    // Verificar cache
    const cached = this.voteCache.get(itemId);
    if (cached) {
      return cached;
    }

    // Se estiver no cliente, usar API REST
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch(`/api/wishlists/items/${itemId}/votes`);
        if (response.ok) {
          const data = await response.json();
          const stats = data.data?.stats || data.stats;
          if (stats) {
            this.voteCache.set(itemId, stats);
            return stats;
          }
        }
      } catch (error) {
        console.error('Erro ao buscar stats via API:', error);
      }
    }

    // No servidor, calcular diretamente
    const db = await getQueryDatabase();
    if (!db) {
      throw new Error('queryDatabase não disponível no servidor');
    }

    // Calcular e cachear
    const stats = await this.calculateVoteStats(itemId);
    this.voteCache.set(itemId, stats);
    return stats;
  }

  /**
   * Atualizar contadores de votos no item
   */
  private async updateItemVoteCounts(
    itemId: number,
    newVote?: 'up' | 'down' | 'maybe',
    oldVote?: 'up' | 'down' | 'maybe'
  ): Promise<void> {
    // No cliente, a API já atualiza os contadores
    if (typeof window !== 'undefined') {
      return;
    }

    // No servidor, usar queryDatabase
    const db = await getQueryDatabase();
    if (!db) {
      return; // No cliente, a API já atualiza
    }

    // Buscar contadores atuais
    const item = await db(
      `SELECT votes_up, votes_down, votes_maybe FROM wishlist_items WHERE id = $1`,
      [itemId]
    );

    if (item.length === 0) {
      return;
    }

    let votesUp = parseInt(item[0].votes_up || '0');
    let votesDown = parseInt(item[0].votes_down || '0');
    let votesMaybe = parseInt(item[0].votes_maybe || '0');

    // Remover voto antigo
    if (oldVote === 'up') votesUp = Math.max(0, votesUp - 1);
    if (oldVote === 'down') votesDown = Math.max(0, votesDown - 1);
    if (oldVote === 'maybe') votesMaybe = Math.max(0, votesMaybe - 1);

    // Adicionar novo voto
    if (newVote === 'up') votesUp++;
    if (newVote === 'down') votesDown++;
    if (newVote === 'maybe') votesMaybe++;

    // Atualizar no banco
    await db(
      `UPDATE wishlist_items 
       SET votes_up = $1, votes_down = $2, votes_maybe = $3
       WHERE id = $4`,
      [votesUp, votesDown, votesMaybe, itemId]
    );
  }

  /**
   * Calcular estatísticas de votação
   */
  private async calculateVoteStats(itemId: number): Promise<VoteStats> {
    // Se estiver no cliente, usar API REST
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch(`/api/wishlists/items/${itemId}/votes`);
        if (response.ok) {
          const data = await response.json();
          const stats = data.data?.stats || data.stats;
          if (stats) return stats;
        }
      } catch (error) {
        console.error('Erro ao calcular stats via API:', error);
      }
    }

    // No servidor, usar queryDatabase
    const db = await getQueryDatabase();
    if (!db) {
      throw new Error('queryDatabase não disponível no servidor');
    }

    // Buscar votos
    const votes = await db(
      `SELECT vote FROM wishlist_votes WHERE item_id = $1`,
      [itemId]
    );

    let votesUp = 0;
    let votesDown = 0;
    let votesMaybe = 0;

    votes.forEach((v: any) => {
      if (v.vote === 'up') votesUp++;
      else if (v.vote === 'down') votesDown++;
      else if (v.vote === 'maybe') votesMaybe++;
    });

    const totalVotes = votesUp + votesDown + votesMaybe;

    // Calcular score (up = +1, maybe = 0, down = -1)
    const score = votesUp - votesDown;

    // Determinar consenso
    let consensus: VoteStats['consensus'] = 'maybe';
    if (totalVotes === 0) {
      consensus = 'maybe';
    } else {
      const upRatio = votesUp / totalVotes;
      const downRatio = votesDown / totalVotes;

      if (upRatio >= 0.8) {
        consensus = 'strong_yes';
      } else if (upRatio >= 0.6) {
        consensus = 'yes';
      } else if (downRatio >= 0.8) {
        consensus = 'strong_no';
      } else if (downRatio >= 0.6) {
        consensus = 'no';
      } else {
        consensus = 'maybe';
      }
    }

    const stats: VoteStats = {
      itemId,
      votesUp,
      votesDown,
      votesMaybe,
      totalVotes,
      score,
      consensus,
    };

    // Atualizar cache
    this.voteCache.set(itemId, stats);

    return stats;
  }

  /**
   * Lidar com atualização de voto recebida via WebSocket
   */
  private async handleVoteUpdate(update: VoteUpdate): Promise<void> {
    // Recalcular stats para o item
    const stats = await this.calculateVoteStats(update.itemId);

    // Notificar subscribers
    this.notifySubscribers(update.itemId, stats);
  }

  /**
   * Lidar com atualização de estatísticas recebida via WebSocket
   */
  private handleStatsUpdate(itemId: number, stats: VoteStats): void {
    // Atualizar cache
    this.voteCache.set(itemId, stats);

    // Notificar subscribers
    this.notifySubscribers(itemId, stats);
  }

  /**
   * Notificar todos os subscribers de um item
   */
  private notifySubscribers(itemId: number, stats: VoteStats): void {
    const subs = this.subscribers.get(itemId);
    if (subs) {
      subs.forEach(callback => {
        try {
          callback(stats);
        } catch (error) {
          console.error('Erro ao notificar subscriber:', error);
        }
      });
    }
  }
}

// Instância singleton
export const realtimeVotingService = new RealtimeVotingService();

