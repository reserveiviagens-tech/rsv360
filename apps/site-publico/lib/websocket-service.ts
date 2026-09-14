/**
 * ✅ WEBSOCKET SERVICE
 * Gerencia conexões WebSocket para mensagens em tempo real
 */

export interface WebSocketMessage {
  type: 'message' | 'typing' | 'read' | 'user_joined' | 'user_left' | 'error' | 'ping' | 'pong';
  data: any;
  timestamp: string;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10; // Aumentado para mais tentativas
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatTimeout: NodeJS.Timeout | null = null;
  private heartbeatIntervalMs = 30000; // 30 segundos
  private heartbeatTimeoutMs = 10000; // 10 segundos timeout
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private url: string;
  private token: string | null = null;
  private pendingMessages: Array<{ type: string; data: any }> = [];
  private isManualDisconnect = false;

  constructor(url: string, token?: string) {
    this.url = url;
    this.token = token || null;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.isManualDisconnect = false;
        const wsUrl = this.token ? `${this.url}?token=${this.token}` : this.url;
        this.ws = new WebSocket(wsUrl);

        const connectTimeout = setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            this.ws?.close();
            reject(new Error('Timeout ao conectar WebSocket'));
          }
        }, 10000); // 10 segundos timeout

        this.ws.onopen = () => {
          clearTimeout(connectTimeout);
          console.log('WebSocket conectado');
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          // Enviar mensagens pendentes
          this.flushPendingMessages();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            
            // Processar heartbeat
            if (message.type === 'ping') {
              this.send('pong', {});
              return;
            }
            if (message.type === 'pong') {
              this.resetHeartbeat();
              return;
            }

            this.handleMessage(message);
          } catch (error) {
            console.error('Erro ao processar mensagem WebSocket:', error);
          }
        };

        this.ws.onerror = (error) => {
          clearTimeout(connectTimeout);
          console.error('Erro WebSocket:', error);
          if (this.reconnectAttempts === 0) {
            reject(error);
          }
        };

        this.ws.onclose = (event) => {
          clearTimeout(connectTimeout);
          console.log('WebSocket desconectado', event.code, event.reason);
          this.stopHeartbeat();
          this.ws = null;
          
          if (!this.isManualDisconnect) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send('ping', {});
        // Timeout para detectar conexão morta
        this.heartbeatTimeout = setTimeout(() => {
          console.warn('Heartbeat timeout, reconectando...');
          this.ws?.close();
        }, this.heartbeatTimeoutMs);
      }
    }, this.heartbeatIntervalMs);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  private resetHeartbeat() {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
    }
  }

  private flushPendingMessages() {
    while (this.pendingMessages.length > 0 && this.isConnected()) {
      const msg = this.pendingMessages.shift();
      if (msg) {
        this.send(msg.type, msg.data);
      }
    }
  }

  private attemptReconnect() {
    if (this.isManualDisconnect) return;
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000); // Exponential backoff, max 30s
      setTimeout(() => {
        console.log(`Tentando reconectar (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        this.connect().catch(() => {
          // Reconexão falhou, tentará novamente
        });
      }, delay);
    } else {
      console.error('Máximo de tentativas de reconexão atingido');
      // Notificar listeners sobre falha de conexão
      const errorListeners = this.listeners.get('connection_error');
      if (errorListeners) {
        errorListeners.forEach(listener => listener({ message: 'Falha ao reconectar' }));
      }
    }
  }

  private handleMessage(message: WebSocketMessage) {
    const listeners = this.listeners.get(message.type);
    if (listeners) {
      listeners.forEach((listener) => listener(message.data));
    }

    // Também notificar listeners genéricos
    const allListeners = this.listeners.get('*');
    if (allListeners) {
      allListeners.forEach((listener) => listener(message));
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: any) => void) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  send(type: string, data: any, requireConfirmation = false): Promise<any> | void {
    const message: WebSocketMessage = {
      type: type as any,
      data,
      timestamp: new Date().toISOString(),
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      
      if (requireConfirmation) {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Timeout aguardando confirmação'));
          }, 5000);

          const confirmationListener = (response: any) => {
            if (response.messageId === message.timestamp) {
              clearTimeout(timeout);
              this.off('confirmation', confirmationListener);
              if (response.success) {
                resolve(response.data);
              } else {
                reject(new Error(response.error || 'Erro na confirmação'));
              }
            }
          };

          this.on('confirmation', confirmationListener);
        });
      }
    } else {
      // Armazenar mensagem para enviar quando reconectar
      if (requireConfirmation) {
        this.pendingMessages.push({ type, data });
        return Promise.reject(new Error('WebSocket não está conectado'));
      } else {
        this.pendingMessages.push({ type, data });
        console.warn('WebSocket não está conectado, mensagem será enviada quando reconectar');
      }
    }
  }

  emit(event: string, data: any) {
    this.send(event, data);
  }

  sendMessage(groupChatId: number, message: string, replyTo?: number) {
    this.send('message', {
      group_chat_id: groupChatId,
      message,
      reply_to_message_id: replyTo,
    });
  }

  sendTyping(groupChatId: number) {
    this.send('typing', {
      group_chat_id: groupChatId,
    });
  }

  markAsRead(groupChatId: number, messageIds: number[]) {
    this.send('read', {
      group_chat_id: groupChatId,
      message_ids: messageIds,
    });
  }

  disconnect() {
    this.isManualDisconnect = true;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
    this.pendingMessages = [];
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
let wsInstance: WebSocketService | null = null;

export function getWebSocketService(token?: string): WebSocketService {
  if (!wsInstance) {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002';
    wsInstance = new WebSocketService(wsUrl, token);
  }
  return wsInstance;
}

