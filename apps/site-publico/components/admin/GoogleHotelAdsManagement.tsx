'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { PlusCircle, Edit, Trash2, Save, XCircle, Search, Loader2, Clock, Globe, RefreshCw, Info, CheckCircle, XCircle as XCircleIcon, FileCode, Upload, BarChart3 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

interface Feed {
  id: number;
  feed_name: string;
  property_id?: number;
  status: 'active' | 'inactive' | 'error';
  last_generated_at?: string;
  last_uploaded_at?: string;
  generation_frequency: number;
  auto_generate: boolean;
  total_properties: number;
  total_rooms: number;
  errors?: string;
  feed_url?: string;
  created_at: string;
  updated_at: string;
  property_name?: string;
}

interface Campaign {
  id: number;
  feed_id: number;
  campaign_name: string;
  campaign_id?: string;
  budget_daily?: number;
  budget_monthly?: number;
  target_countries?: string[];
  target_cities?: string[];
  status: 'active' | 'paused' | 'ended';
  start_date?: string;
  end_date?: string;
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  revenue: number;
  created_at: string;
  feed_name?: string;
}

interface FeedFormData {
  feed_name: string;
  property_id?: number;
  status: 'active' | 'inactive';
  generation_frequency: number;
  auto_generate: boolean;
}

interface CampaignFormData {
  feed_id: number;
  campaign_name: string;
  campaign_id?: string;
  budget_daily?: number;
  budget_monthly?: number;
  target_countries?: string[];
  target_cities?: string[];
  status: 'active' | 'paused';
  start_date?: string;
  end_date?: string;
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

export default function GoogleHotelAdsManagement() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFeedModalOpen, setIsFeedModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [editingFeed, setEditingFeed] = useState<Feed | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [feedFormData, setFeedFormData] = useState<FeedFormData>({
    feed_name: '',
    property_id: undefined,
    status: 'active',
    generation_frequency: 60,
    auto_generate: true,
  });
  const [campaignFormData, setCampaignFormData] = useState<CampaignFormData>({
    feed_id: 0,
    campaign_name: '',
    budget_daily: undefined,
    budget_monthly: undefined,
    target_countries: [],
    target_cities: [],
    status: 'active',
  });
  const [properties, setProperties] = useState<Array<{ id: number; name: string }>>([]);
  const [viewingXml, setViewingXml] = useState<string | null>(null);

  const loadFeeds = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/v1/google-hotel-ads/feeds`, {
        headers: {
          'Authorization': getAuthToken(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Falha ao carregar feeds: ${response.statusText}`);
      }

      const data = await response.json();
      setFeeds(Array.isArray(data.feeds) ? data.feeds : (Array.isArray(data) ? data : []));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      setFeeds([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCampaigns = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/google-hotel-ads/campaigns`, {
        headers: {
          'Authorization': getAuthToken(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Falha ao carregar campanhas: ${response.statusText}`);
      }

      const data = await response.json();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao carregar campanhas:', err);
    }
  };

  const loadProperties = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/properties`, {
        headers: {
          'Authorization': getAuthToken(),
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProperties(Array.isArray(data) ? data : (data.data || []));
      }
    } catch (err) {
      console.error('Erro ao carregar propriedades:', err);
    }
  };

  useEffect(() => {
    loadFeeds();
    loadCampaigns();
    loadProperties();
  }, []);

  const handleCreateFeed = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/v1/google-hotel-ads/feeds`, {
        method: 'POST',
        headers: {
          'Authorization': getAuthToken(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedFormData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao criar feed');
      }

      toast.success('Feed criado com sucesso!');
      setIsFeedModalOpen(false);
      setFeedFormData({
        feed_name: '',
        property_id: undefined,
        status: 'active',
        generation_frequency: 60,
        auto_generate: true,
      });
      loadFeeds();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(`Erro ao criar feed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFeed = async () => {
    if (!editingFeed) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/v1/google-hotel-ads/feeds/${editingFeed.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': getAuthToken(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedFormData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao atualizar feed');
      }

      toast.success('Feed atualizado com sucesso!');
      setIsFeedModalOpen(false);
      setEditingFeed(null);
      loadFeeds();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(`Erro ao atualizar feed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFeed = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar este feed?')) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/v1/google-hotel-ads/feeds/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': getAuthToken(),
        },
      });

      if (!response.ok) {
        throw new Error('Falha ao excluir feed');
      }

      toast.success('Feed deletado com sucesso!');
      loadFeeds();
    } catch (err) {
      toast.error('Erro ao deletar feed');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFeed = async (id: number) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/v1/google-hotel-ads/feeds/${id}/generate`, {
        method: 'POST',
        headers: {
          'Authorization': getAuthToken(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Falha ao gerar feed');
      }

      toast.success('Feed gerado com sucesso!');
      loadFeeds();
    } catch (err) {
      toast.error('Erro ao gerar feed');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadFeed = async (id: number) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/v1/google-hotel-ads/feeds/${id}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': getAuthToken(),
        },
      });

      if (!response.ok) {
        throw new Error('Falha ao enviar feed');
      }

      toast.success('Feed enviado com sucesso!');
      loadFeeds();
    } catch (err) {
      toast.error('Erro ao enviar feed');
    } finally {
      setLoading(false);
    }
  };

  const handleViewXml = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/google-hotel-ads/feeds/${id}/xml`, {
        headers: {
          'Authorization': getAuthToken(),
        },
      });

      if (!response.ok) {
        throw new Error('Falha ao carregar XML');
      }

      const xml = await response.text();
      setViewingXml(xml);
    } catch (err) {
      toast.error('Erro ao carregar XML');
    }
  };

  const handleCreateCampaign = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/v1/google-hotel-ads/campaigns`, {
        method: 'POST',
        headers: {
          'Authorization': getAuthToken(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(campaignFormData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao criar campanha');
      }

      toast.success('Campanha criada com sucesso!');
      setIsCampaignModalOpen(false);
      setCampaignFormData({
        feed_id: 0,
        campaign_name: '',
        budget_daily: undefined,
        budget_monthly: undefined,
        target_countries: [],
        target_cities: [],
        status: 'active',
      });
      loadCampaigns();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(`Erro ao criar campanha: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredFeeds = feeds.filter(feed =>
    feed.feed_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    feed.property_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="feeds" className="w-full">
        <TabsList>
          <TabsTrigger value="feeds">Feeds</TabsTrigger>
          <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
        </TabsList>

        <TabsContent value="feeds" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Feeds Google Hotel Ads
                </CardTitle>
                <Dialog open={isFeedModalOpen} onOpenChange={setIsFeedModalOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingFeed(null);
                      setFeedFormData({
                        feed_name: '',
                        property_id: undefined,
                        status: 'active',
                        generation_frequency: 60,
                        auto_generate: true,
                      });
                    }}>
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Novo Feed
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingFeed ? 'Editar Feed' : 'Criar Novo Feed'}
                      </DialogTitle>
                      <DialogDescription>
                        Configure o feed XML para Google Hotel Ads
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="feed_name">Nome do Feed</Label>
                        <Input
                          id="feed_name"
                          value={feedFormData.feed_name}
                          onChange={(e) => setFeedFormData({ ...feedFormData, feed_name: e.target.value })}
                          placeholder="Ex: Feed Principal - Hotel X"
                        />
                      </div>
                      <div>
                        <Label htmlFor="property_id">Propriedade (Opcional)</Label>
                        <Select
                          value={feedFormData.property_id?.toString() || 'all'}
                          onValueChange={(value) => setFeedFormData({ ...feedFormData, property_id: value && value !== 'all' ? parseInt(value) : undefined })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma propriedade" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas as propriedades</SelectItem>
                            {properties.map((prop) => (
                              <SelectItem key={prop.id} value={prop.id.toString()}>
                                {prop.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="generation_frequency">Frequência de Geração (minutos)</Label>
                        <Input
                          id="generation_frequency"
                          type="number"
                          value={feedFormData.generation_frequency}
                          onChange={(e) => setFeedFormData({ ...feedFormData, generation_frequency: parseInt(e.target.value) || 60 })}
                          min={1}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="auto_generate"
                          checked={feedFormData.auto_generate}
                          onChange={(e) => setFeedFormData({ ...feedFormData, auto_generate: e.target.checked })}
                          className="rounded"
                        />
                        <Label htmlFor="auto_generate">Gerar automaticamente</Label>
                      </div>
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={feedFormData.status}
                          onValueChange={(value: 'active' | 'inactive') => setFeedFormData({ ...feedFormData, status: value })}
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
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsFeedModalOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={editingFeed ? handleUpdateFeed : handleCreateFeed} disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        {editingFeed ? 'Atualizar' : 'Criar'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar feeds..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {error}
                </div>
              )}

              {loading && !feeds.length ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : filteredFeeds.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Nenhum feed encontrado
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredFeeds.map((feed) => (
                    <Card key={feed.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{feed.feed_name}</h3>
                            <Badge variant={feed.status === 'active' ? 'default' : 'secondary'}>
                              {feed.status}
                            </Badge>
                          </div>
                          {feed.property_name && (
                            <p className="text-sm text-gray-600 mb-2">Propriedade: {feed.property_name}</p>
                          )}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Propriedades:</span> {feed.total_properties}
                            </div>
                            <div>
                              <span className="font-medium">Quartos:</span> {feed.total_rooms}
                            </div>
                            <div>
                              <span className="font-medium">Frequência:</span> {feed.generation_frequency} min
                            </div>
                            <div>
                              <span className="font-medium">Auto:</span> {feed.auto_generate ? 'Sim' : 'Não'}
                            </div>
                          </div>
                          {feed.last_generated_at && (
                            <p className="text-xs text-gray-500 mt-2">
                              Última geração: {new Date(feed.last_generated_at).toLocaleString('pt-BR')}
                            </p>
                          )}
                          {feed.last_uploaded_at && (
                            <p className="text-xs text-gray-500">
                              Último upload: {new Date(feed.last_uploaded_at).toLocaleString('pt-BR')}
                            </p>
                          )}
                          {feed.errors && (
                            <p className="text-xs text-red-600 mt-2">Erro: {feed.errors}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewXml(feed.id)}
                            title="Ver XML"
                          >
                            <FileCode className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateFeed(feed.id)}
                            title="Gerar Feed"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUploadFeed(feed.id)}
                            title="Upload para Google"
                          >
                            <Upload className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingFeed(feed);
                              setFeedFormData({
                                feed_name: feed.feed_name,
                                property_id: feed.property_id,
                                status: feed.status,
                                generation_frequency: feed.generation_frequency,
                                auto_generate: feed.auto_generate,
                              });
                              setIsFeedModalOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteFeed(feed.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Campanhas Google Hotel Ads
                </CardTitle>
                <Dialog open={isCampaignModalOpen} onOpenChange={setIsCampaignModalOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingCampaign(null);
                      setCampaignFormData({
                        feed_id: feeds[0]?.id || 0,
                        campaign_name: '',
                        budget_daily: undefined,
                        budget_monthly: undefined,
                        target_countries: [],
                        target_cities: [],
                        status: 'active',
                      });
                    }}>
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Nova Campanha
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingCampaign ? 'Editar Campanha' : 'Criar Nova Campanha'}
                      </DialogTitle>
                      <DialogDescription>
                        Configure uma campanha do Google Hotel Ads
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="campaign_feed_id">Feed</Label>
                        <Select
                          value={campaignFormData.feed_id.toString()}
                          onValueChange={(value) => setCampaignFormData({ ...campaignFormData, feed_id: parseInt(value) })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um feed" />
                          </SelectTrigger>
                          <SelectContent>
                            {feeds.map((feed) => (
                              <SelectItem key={feed.id} value={feed.id.toString()}>
                                {feed.feed_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="campaign_name">Nome da Campanha</Label>
                        <Input
                          id="campaign_name"
                          value={campaignFormData.campaign_name}
                          onChange={(e) => setCampaignFormData({ ...campaignFormData, campaign_name: e.target.value })}
                          placeholder="Ex: Campanha Verão 2025"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="budget_daily">Orçamento Diário (R$)</Label>
                          <Input
                            id="budget_daily"
                            type="number"
                            value={campaignFormData.budget_daily || ''}
                            onChange={(e) => setCampaignFormData({ ...campaignFormData, budget_daily: e.target.value ? parseFloat(e.target.value) : undefined })}
                            min={0}
                            step={0.01}
                          />
                        </div>
                        <div>
                          <Label htmlFor="budget_monthly">Orçamento Mensal (R$)</Label>
                          <Input
                            id="budget_monthly"
                            type="number"
                            value={campaignFormData.budget_monthly || ''}
                            onChange={(e) => setCampaignFormData({ ...campaignFormData, budget_monthly: e.target.value ? parseFloat(e.target.value) : undefined })}
                            min={0}
                            step={0.01}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={campaignFormData.status}
                          onValueChange={(value: 'active' | 'paused') => setCampaignFormData({ ...campaignFormData, status: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Ativa</SelectItem>
                            <SelectItem value="paused">Pausada</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCampaignModalOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateCampaign} disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Criar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Nenhuma campanha encontrada
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.map((campaign) => (
                    <Card key={campaign.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{campaign.campaign_name}</h3>
                            <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                              {campaign.status}
                            </Badge>
                          </div>
                          {campaign.feed_name && (
                            <p className="text-sm text-gray-600 mb-2">Feed: {campaign.feed_name}</p>
                          )}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Impressões:</span> {campaign.impressions.toLocaleString('pt-BR')}
                            </div>
                            <div>
                              <span className="font-medium">Cliques:</span> {campaign.clicks.toLocaleString('pt-BR')}
                            </div>
                            <div>
                              <span className="font-medium">Conversões:</span> {campaign.conversions.toLocaleString('pt-BR')}
                            </div>
                            <div>
                              <span className="font-medium">Receita:</span> R$ {campaign.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para visualizar XML */}
      {viewingXml && (
        <Dialog open={!!viewingXml} onOpenChange={() => setViewingXml(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>XML do Feed</DialogTitle>
            </DialogHeader>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-xs">
              {viewingXml}
            </pre>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                navigator.clipboard.writeText(viewingXml);
                toast.success('XML copiado para a área de transferência!');
              }}>
                Copiar XML
              </Button>
              <Button onClick={() => setViewingXml(null)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
