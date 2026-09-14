'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

interface Auction {
  id: number;
  title: string;
  description?: string;
  enterprise_id: number;
  property_id?: number;
  accommodation_id?: number;
  start_price: number;
  min_increment: number;
  reserve_price?: number;
  start_date: string;
  end_date: string;
}

interface AuctionFormProps {
  auction?: Auction | null;
  onSuccess: () => void;
}

export function AuctionForm({ auction, onSuccess }: AuctionFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    enterprise_id: '',
    property_id: '',
    accommodation_id: '',
    start_price: '',
    min_increment: '10.00',
    reserve_price: '',
    start_date: '',
    end_date: '',
  });
  const [loading, setLoading] = useState(false);
  const [enterprises, setEnterprises] = useState<any[]>([]);

  useEffect(() => {
    loadEnterprises();
    if (auction) {
      setFormData({
        title: auction.title || '',
        description: auction.description || '',
        enterprise_id: String(auction.enterprise_id || ''),
        property_id: String(auction.property_id || ''),
        accommodation_id: String(auction.accommodation_id || ''),
        start_price: String(auction.start_price || ''),
        min_increment: String(auction.min_increment || '10.00'),
        reserve_price: String(auction.reserve_price || ''),
        start_date: auction.start_date ? new Date(auction.start_date).toISOString().split('T')[0] : '',
        end_date: auction.end_date ? new Date(auction.end_date).toISOString().split('T')[0] : '',
      });
    }
  }, [auction]);

  const loadEnterprises = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/enterprises`);
      if (response.ok) {
        const data = await response.json();
        setEnterprises(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error('Error loading enterprises:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const payload = {
        title: formData.title,
        description: formData.description,
        enterprise_id: parseInt(formData.enterprise_id),
        property_id: formData.property_id ? parseInt(formData.property_id) : undefined,
        accommodation_id: formData.accommodation_id ? parseInt(formData.accommodation_id) : undefined,
        start_price: parseFloat(formData.start_price),
        min_increment: parseFloat(formData.min_increment),
        reserve_price: formData.reserve_price ? parseFloat(formData.reserve_price) : undefined,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
      };

      const url = auction
        ? `${API_BASE_URL}/api/v1/auctions/${auction.id}`
        : `${API_BASE_URL}/api/v1/auctions`;
      const method = auction ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.message || 'Erro ao salvar leilão');
      }
    } catch (error) {
      console.error('Error saving auction:', error);
      alert('Erro ao salvar leilão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Título *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="enterprise_id">Empreendimento *</Label>
          <Select
            value={formData.enterprise_id}
            onValueChange={(value) => setFormData({ ...formData, enterprise_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um empreendimento" />
            </SelectTrigger>
            <SelectContent>
              {enterprises.map((enterprise) => (
                <SelectItem key={enterprise.id} value={String(enterprise.id)}>
                  {enterprise.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="start_price">Preço Inicial (R$) *</Label>
          <Input
            id="start_price"
            type="number"
            step="0.01"
            value={formData.start_price}
            onChange={(e) => setFormData({ ...formData, start_price: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="min_increment">Incremento Mínimo (R$) *</Label>
          <Input
            id="min_increment"
            type="number"
            step="0.01"
            value={formData.min_increment}
            onChange={(e) => setFormData({ ...formData, min_increment: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="reserve_price">Preço de Reserva (R$)</Label>
          <Input
            id="reserve_price"
            type="number"
            step="0.01"
            value={formData.reserve_price}
            onChange={(e) => setFormData({ ...formData, reserve_price: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_date">Data de Início *</Label>
          <Input
            id="start_date"
            type="datetime-local"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="end_date">Data de Fim *</Label>
          <Input
            id="end_date"
            type="datetime-local"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={() => onSuccess()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : auction ? 'Atualizar' : 'Criar'}
        </Button>
      </div>
    </form>
  );
}
