/**
 * ✅ FASE 1 - ETAPA 1.4: React Hook - useGroupChat
 * Hook customizado para gerenciar chat em grupo com WebSocket
 * 
 * @module hooks/useGroupChat
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { GroupChat, GroupMessage, ChatMember, SendMessageDTO } from '@/lib/group-travel/types';

import chatService from '@/lib/group-travel/api/chat.service';

// Mock temporário removido - usando service real
/* const chatService = {
  getChat: async (chatId: string) => {
    const response = await fetch(`/api/chats/${chatId}`);
    if (!response.ok) throw new Error('Erro ao buscar chat');
    const data = await response.json();
    return data.data;
  },
  getMessages: async (chatId: string, cursor?: string, limit: number = 50) => {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    params.append('limit', limit.toString());
    
    const response = await fetch(`/api/chats/${chatId}/messages?${params}`);
    if (!response.ok) throw new Error('Erro ao buscar mensagens');
    const data = await response.json();
    return {
      messages: data.data || [],
      nextCursor: data.nextCursor || null,
      hasMore: data.hasMore || false
    };
  },
  sendMessage: async (chatId: string, data: SendMessageDTO) => {
    const response = await fetch(`/api/chats/${chatId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao enviar mensagem');
    }
    const result = await response.json();
    return result.data;
  },
  deleteMessage: async (messageId: string) => {
    const response = await fetch(`/api/chats/messages/${messageId}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao deletar mensagem');
    }
  },
  updateMessage: async (messageId: string, content: string) => {
    const response = await fetch(`/api/chats/messages/${messageId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao atualizar mensagem');
    }
    const result = await response.json();
    return result.data;
  },
  getMembers: async (chatId: string) => {
    const response = await fetch(`/api/chats/${chatId}/members`);
    if (!response.ok) throw new Error('Erro ao buscar membros');
    const data = await response.json();
    return data.data || [];
  },
  markAsRead: async (chatId: string) => {
    const response = await fetch(`/api/chats/${chatId}/read`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Erro ao marcar como lido');
  }
}; */

interface UseGroupChatOptions {
  chatId?: string;
  userId?: string;
  autoConnect?: boolean;
}

export function useGroupChat(options: UseGroupChatOptions = {}) {
  const { chatId, userId, autoConnect = true } = options;
  const queryClient = useQueryClient();
  
  // ============================================
  // STATES LOCAIS
  // ============================================
  
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  
  const socketRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // ============================================
  // QUERIES
  // ============================================

  // Query: Dados do chat
  const {
    data: chat,
    isLoading: isLoadingChat,
    error: chatError
  } = useQuery<GroupChat>({
    queryKey: ['chat', chatId],
    queryFn: () => chatService.getChat(chatId!),
    staleTime: 5 * 60 * 1000, // 5 minutos
    enabled: !!chatId
  });

  // Infinite Query: Mensagens (com paginação)
  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingMessages
  } = useInfiniteQuery<{
    messages: GroupMessage[];
    nextCursor: string | null;
    hasMore: boolean;
  }>({
    queryKey: ['messages', chatId],
    queryFn: ({ pageParam }) => chatService.getMessages(chatId!, pageParam as string | undefined),
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    initialPageParam: undefined,
    staleTime: 60 * 1000, // 1 minuto
    enabled: !!chatId
  });

  // Query: Membros do chat
  const {
    data: members,
    isLoading: isLoadingMembers,
    error: membersError
  } = useQuery<ChatMember[]>({
    queryKey: ['chatMembers', chatId],
    queryFn: () => chatService.getMembers(chatId!),
    staleTime: 5 * 60 * 1000, // 5 minutos
    enabled: !!chatId
  });

  // ============================================
  // WEBSOCKET
  // ============================================

  // Conectar ao WebSocket quando chatId estiver disponível
  useEffect(() => {
    if (!chatId || !autoConnect) return;

    // Lazy import do socket.io-client
    import('socket.io-client').then(({ io }) => {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002';
      
      socketRef.current = io(wsUrl, {
        auth: {
          token: typeof window !== 'undefined' ? localStorage.getItem('token') : null
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      const socket = socketRef.current;

      socket.on('connect', () => {
        console.log('🔌 WebSocket conectado ao chat');
        setIsConnected(true);
        
        // Entrar na sala do chat
        socket.emit('join_chat', { chatId });
      });

      socket.on('disconnect', () => {
        console.log('🔌 WebSocket desconectado');
        setIsConnected(false);
      });

      socket.on('connect_error', (error: Error) => {
        console.error('❌ Erro de conexão WebSocket:', error);
        setIsConnected(false);
      });

      // Eventos do chat
      socket.on('new_message', (message: GroupMessage) => {
        // Adicionar mensagem ao cache do React Query
        queryClient.setQueryData(['messages', chatId], (old: any) => {
          if (!old) return old;
          
          const pages = old.pages || [];
          const lastPage = pages[pages.length - 1];
          
          // Verificar se mensagem já existe (evitar duplicatas)
          const exists = pages.some((page: any) =>
            page.messages?.some((m: GroupMessage) => m.id === message.id)
          );
          
          if (exists) return old;
          
          // Adicionar à primeira página (mensagens mais recentes)
          return {
            ...old,
            pages: [
              {
                ...lastPage,
                messages: [message, ...(lastPage.messages || [])]
              },
              ...pages.slice(0, -1)
            ]
          };
        });

        // Auto-scroll se estiver no bottom
        if (isAtBottom) {
          scrollToBottom();
        }
      });

      socket.on('message_deleted', ({ messageId }: { messageId: string }) => {
        // Remover mensagem do cache
        queryClient.setQueryData(['messages', chatId], (old: any) => {
          if (!old) return old;
          
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              messages: page.messages.filter((m: GroupMessage) => m.id !== messageId)
            }))
          };
        });
      });

      socket.on('message_updated', (message: GroupMessage) => {
        // Atualizar mensagem no cache
        queryClient.setQueryData(['messages', chatId], (old: any) => {
          if (!old) return old;
          
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              messages: page.messages.map((m: GroupMessage) =>
                m.id === message.id ? message : m
              )
            }))
          };
        });
      });

      socket.on('user_typing', ({ userId: typingUserId, chatId: eventChatId }: { userId: string; chatId: string }) => {
        if (eventChatId !== chatId) return;
        
        setTypingUsers((prev) => {
          if (!prev.includes(typingUserId)) {
            return [...prev, typingUserId];
          }
          return prev;
        });

        // Remover após 3 segundos
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((id) => id !== typingUserId));
        }, 3000);
      });

      socket.on('user_online', ({ userId: onlineUserId }: { userId: string }) => {
        setOnlineUsers((prev) => new Set([...prev, onlineUserId]));
      });

      socket.on('user_offline', ({ userId: offlineUserId }: { userId: string }) => {
        setOnlineUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(offlineUserId);
          return newSet;
        });
      });
    }).catch((error) => {
      console.warn('WebSocket não disponível, usando polling:', error);
      setIsConnected(false);
    });

    // Cleanup
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_chat', { chatId });
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [chatId, autoConnect, queryClient, isAtBottom]);

  // ============================================
  // MUTATIONS
  // ============================================

  // Mutation: Enviar mensagem
  const sendMessage = useMutation({
    mutationFn: ({ chatId, data }: { chatId: string; data: SendMessageDTO }) =>
      chatService.sendMessage(chatId, data),
    onMutate: async ({ chatId, data }) => {
      // Cancelar queries em andamento
      await queryClient.cancelQueries({ queryKey: ['messages', chatId] });

      // Snapshot
      const previousMessages = queryClient.getQueryData(['messages', chatId]);

      // Optimistic update: adicionar mensagem temporária
      const optimisticMessage: GroupMessage = {
        id: `temp-${Date.now()}`,
        chatId,
        userId: userId!,
        content: data.content,
        messageType: data.messageType || 'text',
        attachments: data.attachments,
        replyTo: data.replyTo || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      queryClient.setQueryData(['messages', chatId], (old: any) => {
        if (!old) return old;
        
        const pages = old.pages || [];
        const lastPage = pages[pages.length - 1] || { messages: [] };
        
        return {
          ...old,
          pages: [
            {
              ...lastPage,
              messages: [optimisticMessage, ...lastPage.messages]
            },
            ...pages.slice(0, -1)
          ]
        };
      });

      // Scroll para bottom
      scrollToBottom();

      return { previousMessages };
    },
    onError: (err, variables, context) => {
      // Reverter optimistic update
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', variables.chatId], context.previousMessages);
      }
      toast.error(err.message || 'Erro ao enviar mensagem');
    },
    onSuccess: () => {
      // Invalidar para refetch (WebSocket já atualizou, mas garante consistência)
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
    }
  });

  // Mutation: Deletar mensagem
  const deleteMessage = useMutation({
    mutationFn: (messageId: string) => chatService.deleteMessage(messageId),
    onMutate: async (messageId) => {
      await queryClient.cancelQueries({ queryKey: ['messages', chatId] });
      const previousMessages = queryClient.getQueryData(['messages', chatId]);

      // Optimistic update
      queryClient.setQueryData(['messages', chatId], (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.filter((m: GroupMessage) => m.id !== messageId)
          }))
        };
      });

      return { previousMessages };
    },
    onError: (err, messageId, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', chatId], context.previousMessages);
      }
      toast.error(err.message || 'Erro ao deletar mensagem');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
    }
  });

  // Mutation: Atualizar mensagem
  const updateMessage = useMutation({
    mutationFn: ({ messageId, content }: { messageId: string; content: string }) =>
      chatService.updateMessage(messageId, content),
    onMutate: async ({ messageId, content }) => {
      await queryClient.cancelQueries({ queryKey: ['messages', chatId] });
      const previousMessages = queryClient.getQueryData(['messages', chatId]);

      // Optimistic update
      queryClient.setQueryData(['messages', chatId], (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((m: GroupMessage) =>
              m.id === messageId ? { ...m, content, updatedAt: new Date() } : m
            )
          }))
        };
      });

      return { previousMessages };
    },
    onError: (err, variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', chatId], context.previousMessages);
      }
      toast.error(err.message || 'Erro ao atualizar mensagem');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
    }
  });

  // Mutation: Marcar como lido
  const markAsRead = useMutation({
    mutationFn: (chatId: string) => chatService.markAsRead(chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', chatId] });
      queryClient.invalidateQueries({ queryKey: ['chatMembers', chatId] });
    }
  });

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Carregar mais mensagens (infinite scroll)
   */
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  /**
   * Scroll para última mensagem
   */
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    } else if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, []);

  /**
   * Marcar mensagens como lidas
   */
  const handleMarkAsRead = useCallback(() => {
    if (chatId) {
      markAsRead.mutate(chatId);
    }
  }, [chatId, markAsRead]);

  /**
   * Verificar se usuário está online
   */
  const isUserOnline = useCallback((userId: string): boolean => {
    return onlineUsers.has(userId);
  }, [onlineUsers]);

  /**
   * Enviar indicador de digitação
   */
  const sendTypingIndicator = useCallback(() => {
    if (socketRef.current && chatId && userId) {
      socketRef.current.emit('typing', { chatId, userId });
    }
  }, [chatId, userId]);

  // ============================================
  // EFFECTS
  // ============================================

  // Auto-scroll quando nova mensagem chega (se isAtBottom = true)
  useEffect(() => {
    if (isAtBottom && messagesData) {
      scrollToBottom();
    }
  }, [messagesData, isAtBottom, scrollToBottom]);

  // Marcar como lido quando mensagens são visualizadas
  useEffect(() => {
    if (chatId && messagesData) {
      const timer = setTimeout(() => {
        handleMarkAsRead();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [chatId, messagesData, handleMarkAsRead]);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  // Flatten messages de todas as páginas
  const messages = messagesData?.pages.flatMap((page) => page.messages || []) || [];
  const isLoading = isLoadingChat || isLoadingMessages || isLoadingMembers;
  const error = chatError || membersError;

  // ============================================
  // RETURN
  // ============================================

  return {
    // Data
    chat: chat || null,
    messages,
    members: members || [],

    // States
    isLoading,
    error,
    isConnected,
    typingUsers,
    isAtBottom,
    onlineUsers: Array.from(onlineUsers),

    // Mutations
    sendMessage: sendMessage.mutate,
    deleteMessage: deleteMessage.mutate,
    updateMessage: updateMessage.mutate,
    markAsRead: handleMarkAsRead,

    // Helpers
    loadMore,
    scrollToBottom,
    isUserOnline,
    sendTypingIndicator,

    // Refs
    messagesEndRef,
    scrollContainerRef,

    // Setters
    setIsAtBottom,

    // Loading states
    isSending: sendMessage.isPending,
    isDeleting: deleteMessage.isPending,
    isUpdating: updateMessage.isPending,
    isMarkingAsRead: markAsRead.isPending,
    isFetchingMore: isFetchingNextPage,
    hasMore: hasNextPage || false
  };
}

