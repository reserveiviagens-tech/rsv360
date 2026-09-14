'use client';

/**
 * Componente: Lista de Tickets
 * Exibe uma lista de tickets com paginação e filtros
 */

import { useState, useEffect } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TicketCard } from './TicketCard';
import { TicketFilters } from './TicketFilters';
import { TicketForm } from './TicketForm';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Ticket {
  id: number;
  ticket_number: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  updated_at: string;
  assigned_to?: number | null;
}

interface TicketListProps {
  initialFilters?: {
    status?: string;
    priority?: string;
    category?: string;
    search?: string;
  };
}

export function TicketList({ initialFilters = {} }: TicketListProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(initialFilters);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    has_more: false
  });

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Você precisa estar autenticado');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.category) params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);
      params.append('limit', pagination.limit.toString());
      params.append('offset', pagination.offset.toString());

      const response = await fetch(`/api/tickets?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar tickets');
      }

      const result = await response.json();
      setTickets(result.data || []);
      setPagination(prev => ({
        ...prev,
        total: result.pagination?.total || 0,
        has_more: result.pagination?.has_more || false
      }));

    } catch (err: any) {
      setError(err.message || 'Erro ao carregar tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [filters, pagination.offset]);

  // WebSocket para atualizações em tempo real
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Conectar ao WebSocket
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002'}/tickets?token=${token}`);

    ws.onopen = () => {
      console.log('WebSocket conectado para tickets');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'ticket_updated' || data.type === 'ticket_created' || data.type === 'ticket_status_changed') {
          // Atualizar lista de tickets
          fetchTickets();
        }
      } catch (err) {
        console.error('Erro ao processar mensagem WebSocket:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('Erro no WebSocket:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket desconectado');
    };

    return () => {
      ws.close();
    };
  }, []);

  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const handleResetFilters = () => {
    setFilters({});
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const handleCreateSuccess = (ticketId: number) => {
    setShowCreateForm(false);
    fetchTickets();
  };

  if (showCreateForm) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          onClick={() => setShowCreateForm(false)}
        >
          ← Voltar para lista
        </Button>
        <TicketForm
          onSuccess={handleCreateSuccess}
          onCancel={() => setShowCreateForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tickets de Suporte</h1>
          <p className="text-gray-500 mt-1">
            {pagination.total} ticket{pagination.total !== 1 ? 's' : ''} encontrado{pagination.total !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Ticket
        </Button>
      </div>

      <TicketFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onReset={handleResetFilters}
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Nenhum ticket encontrado</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setShowCreateForm(true)}
          >
            Criar primeiro ticket
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tickets.map((ticket) => (
              <TicketCard 
                key={ticket.id} 
                ticket={{
                  ...ticket,
                  comments_count: 0 // Será preenchido pela API se disponível
                }} 
              />
            ))}
          </div>

          {pagination.has_more && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => setPagination(prev => ({
                  ...prev,
                  offset: prev.offset + prev.limit
                }))}
              >
                Carregar mais
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

