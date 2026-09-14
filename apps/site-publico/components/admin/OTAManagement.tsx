'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { PlusCircle, Edit, Trash2, Save, XCircle, Search, Loader2, Clock, Globe, RefreshCw, Info, CheckCircle, XCircle as XCircleIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

interface OTAConnection {
  id: number;
  ota_name: string;
  property_id?: number;
  accommodation_id?: number;
  api_key?: string;
  api_secret?: string;
  status: 'active' | 'inactive' | 'error';
  last_sync?: string;
  last_sync_at?: string;
  sync_frequency?: number;
  created_at: string;
  updated_at: string;
  property_name?: string;
  accommodation_name?: string;
}

interface OTAConnectionFormData {
  ota_name: string;
  property_id?: number;
  accommodation_id?: number;
  api_key?: string;
  api_secret?: string;
  status: 'active' | 'inactive';
  sync_frequency?: number;
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

export default function OTAManagement() {
  const [connections, setConnections] = useState<OTAConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<OTAConnection | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<OTAConnectionFormData>({
    ota_name: 'booking',
    property_id: undefined,
    accommodation_id: undefined,
    api_key: '',
    api_secret: '',
    status: 'active',
    sync_frequency: 60,
  });

  const loadConnections = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/v1/ota/connections`, {
        headers: {
          'Authorization': getAuthToken(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Falha ao carregar conexões OTA: ${response.statusText}`);
      }

      const data = await response.json();
      setConnections(Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      setConnections([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConnections();
  }, []);

  const handleCreateClick = () => {
    setEditingConnection(null);
    setFormData({
      ota_name: 'booking',
      property_id: undefined,
      accommodation_id: undefined,
      api_key: '',
      api_secret: '',
      status: 'active',
      sync_frequency: 60,
    });
    setIsModalOpen(true);
  };

  const handleEditClick = (connection: OTAConnection) => {
    setEditingConnection(connection);
    setFormData({
      ota_name: connection.ota_name,
      property_id: connection.property_id,
      accommodation_id: connection.accommodation_id,
      api_key: connection.api_key || '',
      api_secret: connection.api_secret || '',
      status: connection.status === 'error' ? 'inactive' : connection.status,
      sync_frequency: connection.sync_frequency || 60,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const url = editingConnection
        ? `${API_BASE_URL}/api/v1/ota/connections/${editingConnection.id}`
        : `${API_BASE_URL}/api/v1/ota/connections`;
      const method = editingConnection ? 'PUT' : 'POST';

      // Para criação inicial, usar 'demo' se credenciais vazias (permite configurar depois)
      const payload = { ...formData };
      if (!payload.api_key || !payload.api_secret) {
        payload.api_key = payload.api_key || 'demo';
        payload.api_secret = payload.api_secret || 'demo';
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': getAuthToken(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Falha ao salvar conexão OTA' }));
        throw new Error(errorData.message || 'Falha ao salvar conexão OTA');
      }

      toast.success(editingConnection ? 'Conexão OTA atualizada com sucesso!' : 'Conexão OTA criada com sucesso!');
      setIsModalOpen(false);
      setEditingConnection(null);
      loadConnections();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(`Erro ao salvar conexão OTA: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja deletar esta conexão OTA?')) {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/v1/ota/connections/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': getAuthToken(),
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Falha ao excluir conexão OTA');
        }

        toast.success('Conexão OTA deletada com sucesso!');
        loadConnections();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        toast.error(`Erro ao deletar conexão OTA: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSync = async (id: number) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/v1/ota/connections/${id}/sync`, {
        method: 'POST',
        headers: {
          'Authorization': getAuthToken(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Falha ao sincronizar conexão OTA');
      }

      toast.success('Sincronização iniciada com sucesso!');
      loadConnections();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(`Erro ao sincronizar: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      active: { label: 'Ativo', variant: 'default' },
      inactive: { label: 'Inativo', variant: 'outline' },
      error: { label: 'Erro', variant: 'destructive' },
    };
    const statusInfo = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const filteredConnections = connections.filter(
    (connection) =>
      connection.ota_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (connection.property_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Globe className="w-6 h-6" />
            Gerenciamento de Integrações OTA
          </CardTitle>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreateClick}>
                <PlusCircle className="w-4 h-4 mr-2" /> Nova Conexão
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{editingConnection ? 'Editar Conexão OTA' : 'Nova Conexão OTA'}</DialogTitle>
                <DialogDescription>
                  Configure a integração com OTAs como Booking.com, Expedia, etc.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="ota_name">OTA *</Label>
                  <Select
                    value={formData.ota_name}
                    onValueChange={(value) => setFormData({ ...formData, ota_name: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a OTA" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="booking">Booking.com</SelectItem>
                      <SelectItem value="expedia">Expedia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="property_id">ID da Propriedade</Label>
                    <Input
                      id="property_id"
                      type="number"
                      value={formData.property_id || ''}
                      onChange={(e) => setFormData({ ...formData, property_id: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="Opcional"
                    />
                  </div>
                  <div>
                    <Label htmlFor="accommodation_id">ID da Acomodação</Label>
                    <Input
                      id="accommodation_id"
                      type="number"
                      value={formData.accommodation_id || ''}
                      onChange={(e) => setFormData({ ...formData, accommodation_id: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="Opcional"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="api_key">API Key</Label>
                  <Input
                    id="api_key"
                    value={formData.api_key}
                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    type="password"
                    placeholder="Opcional: use 'demo' para configurar depois"
                  />
                </div>
                <div>
                  <Label htmlFor="api_secret">API Secret</Label>
                  <Input
                    id="api_secret"
                    value={formData.api_secret}
                    onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                    type="password"
                    placeholder="Opcional: use 'demo' para configurar depois"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: 'active' | 'inactive') => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="sync_frequency">Frequência de Sincronização (minutos)</Label>
                    <Input
                      id="sync_frequency"
                      type="number"
                      min="1"
                      value={formData.sync_frequency}
                      onChange={(e) => setFormData({ ...formData, sync_frequency: parseInt(e.target.value) || 60 })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={loading}>
                  <XCircle className="w-4 h-4 mr-2" /> Cancelar
                </Button>
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {editingConnection ? 'Atualizar' : 'Criar'} Conexão
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Gerencie as integrações com OTAs (Online Travel Agencies) para sincronizar reservas e disponibilidade.
          </p>

          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar conexões..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchTerm && (
              <Button variant="outline" onClick={() => setSearchTerm('')}>
                <XCircle className="w-4 h-4 mr-2" /> Limpar
              </Button>
            )}
          </div>

          {loading && connections.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredConnections.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'Nenhuma conexão encontrada com o termo de busca.' : 'Nenhuma conexão OTA encontrada.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredConnections.map((connection) => (
                <Card key={connection.id} className="relative hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg capitalize">{connection.ota_name}</CardTitle>
                      {getStatusBadge(connection.status)}
                    </div>
                    {connection.property_name && (
                      <p className="text-sm text-gray-600">Propriedade: {connection.property_name}</p>
                    )}
                    {connection.accommodation_name && (
                      <p className="text-sm text-gray-600">Acomodação: {connection.accommodation_name}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(connection.last_sync || connection.last_sync_at) && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>Última sincronização: {new Date(connection.last_sync || connection.last_sync_at || '').toLocaleString('pt-BR')}</span>
                      </div>
                    )}
                    {connection.sync_frequency && (
                      <div className="flex items-center text-sm text-gray-500">
                        <RefreshCw className="w-4 h-4 mr-1" />
                        <span>Sincronização a cada {connection.sync_frequency} minutos</span>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSync(connection.id)}
                        className="flex-1"
                        disabled={loading}
                      >
                        <RefreshCw className="w-4 h-4 mr-1" /> Sincronizar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClick(connection)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-1" /> Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(connection.id)}
                        className="flex-1"
                      >
                        <Trash2 className="w-4 h-4 mr-1" /> Deletar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
