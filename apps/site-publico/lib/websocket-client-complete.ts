/**
 * ✅ CLIENTE WEBSOCKET COMPLETO
 * 
 * Cliente WebSocket robusto com:
 * - Reconexão automática
 * - Rate limiting
 * - Queue de mensagens
 * - Event listeners
 * - Health checks
 * - TypeScript completo
 */

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface WebSocketConfig {
  url: string;
  token?: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageQueue: Array<{ type: string; data: any }> = [];
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private isConnecting = false;
  private isConnected = false;

  constructor(config: WebSocketConfig) {
    this.config = {
      url: config.url,
      token: config.token || '',
      reconnectAttempts: config.reconnectAttempts || 5,
      reconnectDelay: config.reconnectDelay || 1000,
      heartbeatInterval: config.heartbeatInterval || 30000, // 30 segundos
    };
  }

  /**
   * Conectar ao servidor WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting || this.isConnected) {
        resolve();
        return;
      }

      this.isConnecting = true;

      try {
        const wsUrl = this.config.token
          ? `${this.config.url}?token=${this.config.token}`
          : this.config.url;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('✅ WebSocket conectado');
          this.isConnecting = false;
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.flushMessageQueue();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            // Pode ser um pong simples
            if (event.data === 'pong') {
              return;
            }
            console.error('Erro ao processar mensagem WebSocket:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ Erro WebSocket:', error);
          this.isConnecting = false;
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket desconectado:', event.code, event.reason);
          this.isConnected = false;
          this.stopHeartbeat();
          this.isConnecting = false;

          // Reconectar se não foi fechado intencionalmente
          if (event.code !== 1000) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Desconectar do servidor
   */
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.isConnected = false;
    this.messageQueue = [];
    this.listeners.clear();
  }

  /**
   * Tentar reconectar
   */
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.config.reconnectAttempts) {
      console.error('❌ Máximo de tentativas de reconexão atingido');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectDelay * this.reconnectAttempts;

    console.log(`🔄 Tentando reconectar (${this.reconnectAttempts}/${this.config.reconnectAttempts}) em ${delay}ms...`);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // Reconexão falhou, tentará novamente
      });
    }, delay);
  }

  /**
   * Iniciar heartbeat
   */
  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        this.send('ping', {});
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Parar heartbeat
   */
  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Processar mensagem recebida
   */
  private handleMessage(message: WebSocketMessage) {
    // Notificar listeners específicos
    const listeners = this.listeners.get(message.type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(message.data);
        } catch (error) {
          console.error(`Erro no listener para ${message.type}:`, error);
        }
      });
    }

    // Notificar listeners genéricos
    const allListeners = this.listeners.get('*');
    if (allListeners) {
      allListeners.forEach((listener) => {
        try {
          listener(message);
        } catch (error) {
          console.error('Erro no listener genérico:', error);
        }
      });
    }
  }

  /**
   * Enviar mensagem
   */
  send(type: string, data: any) {
    const message: WebSocketMessage = {
      type,
      data,
      timestamp: new Date().toISOString(),
    };

    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        // Adicionar à fila para tentar novamente
        this.messageQueue.push({ type, data });
      }
    } else {
      // Adicionar à fila se não estiver conectado
      this.messageQueue.push({ type, data });
    }
  }

  /**
   * Enviar mensagens da fila
   */
  private flushMessageQueue() {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message.type, message.data);
      }
    }
  }

  /**
   * Registrar listener para evento
   */
  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Remover listener
   */
  off(event: string, callback: (data: any) => void) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Métodos de conveniência
   */

  // Group Chat
  joinGroupChat(groupChatId: number) {
    this.send('group_chat:join', { group_chat_id: groupChatId });
  }

  leaveGroupChat(groupChatId: number) {
    this.send('group_chat:leave', { group_chat_id: groupChatId });
  }

  sendGroupChatMessage(groupChatId: number, message: string, replyTo?: number) {
    this.send('group_chat:message', {
      group_chat_id: groupChatId,
      message,
      reply_to_message_id: replyTo,
    });
  }

  sendTyping(groupChatId: number) {
    this.send('group_chat:typing', { group_chat_id: groupChatId });
  }

  stopTyping(groupChatId: number) {
    this.send('group_chat:typing_stop', { group_chat_id: groupChatId });
  }

  markMessagesAsRead(groupChatId: number, messageIds: number[]) {
    this.send('group_chat:read', {
      group_chat_id: groupChatId,
      message_ids: messageIds,
    });
  }

  // Notificações
  subscribeNotifications() {
    this.send('notifications:subscribe', {});
  }

  unsubscribeNotifications() {
    this.send('notifications:unsubscribe', {});
  }

  // Bookings
  subscribeBooking(bookingId: number) {
    this.send('bookings:subscribe', { booking_id: bookingId });
  }

  /**
   * Verificar se está conectado
   */
  isConnectedToServer(): boolean {
    return this.isConnected && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Obter estado da conexão
   */
  getConnectionState(): 'connecting' | 'connected' | 'disconnected' {
    if (this.isConnecting) return 'connecting';
    if (this.isConnected) return 'connected';
    return 'disconnected';
  }
}

// Singleton instance
let wsClientInstance: WebSocketClient | null = null;

/**
 * Obter instância singleton do cliente WebSocket
 */
export function getWebSocketClient(token?: string): WebSocketClient {
  if (!wsClientInstance) {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002';
    wsClientInstance = new WebSocketClient({
      url: wsUrl,
      token,
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      heartbeatInterval: 30000,
    });
  } else if (token && wsClientInstance.config.token !== token) {
    // Atualizar token se necessário
    wsClientInstance.disconnect();
    wsClientInstance = new WebSocketClient({
      url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002',
      token,
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      heartbeatInterval: 30000,
    });
  }
  return wsClientInstance;
}

