/**
 * RSV360 PMS/CRM — Reservei Viagens
 * Copyright (c) 2024-2026 Reservei Viagens LTDA. Todos os direitos reservados.
 * Desenvolvido por Douglas P. Figueiredo <douglas@reserveiviagens.com.br>
 * @author Douglas P. Figueiredo
 * @license UNLICENSED
 */
import { useMemo, useState } from 'react';
import { SEOHead } from '@shared/components/SEOHead';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useServices, useServiceRequestMutation } from '@/hooks/use-services';
import { ServiceCard } from '@/components/ServiceCard';
import { EmptyState } from '@/components/EmptyState';
import type { GuestService } from '@/types/service';

export default function ServicesPage() {
  const servicesQuery = useServices();
  const requestMutation = useServiceRequestMutation();
  const services = servicesQuery.data || [];
  const [selectedService, setSelectedService] = useState<GuestService | null>(null);
  const [desiredTime, setDesiredTime] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const dialogDescription = useMemo(() => selectedService?.description || '', [selectedService]);

  async function handleRequest() {
    if (!selectedService) return;

    await requestMutation.mutateAsync({
      type: selectedService.id,
      description: [selectedService.name, desiredTime, notes].filter(Boolean).join(' • '),
      priority,
    });

    setSelectedService(null);
    setDesiredTime('');
    setNotes('');
    setPriority('medium');
  }

  return (
    <div className="space-y-6">
      <SEOHead
        title="Serviços | RSV360 Guest"
        description="Solicite serviços durante sua estadia com poucos cliques."
        url="https://www.reserveiviagens.com.br/services"
        noIndex
      />
      <Card>
        <CardHeader>
          <CardTitle>Serviços disponíveis</CardTitle>
          <CardDescription>Escolha um serviço e envie sua solicitação para a equipe.</CardDescription>
        </CardHeader>
        <CardContent>
          {servicesQuery.isLoading ? (
            <p className="text-sm text-slate-600">Carregando serviços…</p>
          ) : servicesQuery.isError ? (
            <EmptyState
              title="Catálogo indisponível"
              description="Não foi possível carregar serviços da API. Tente novamente mais tarde."
            />
          ) : services.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {services.map((service) => (
                <ServiceCard key={service.id} service={service} onRequest={() => setSelectedService(service)} />
              ))}
            </div>
          ) : (
            <EmptyState title="Sem serviços" description="Nenhum serviço encontrado no momento." />
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedService)} onOpenChange={(open) => !open && setSelectedService(null)}>
        {selectedService ? (
          <DialogContent onClose={() => setSelectedService(null)}>
            <DialogHeader>
              <DialogTitle>{selectedService.name}</DialogTitle>
              <DialogDescription>{dialogDescription}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="desiredTime">Horário desejado</Label>
                <Input id="desiredTime" value={desiredTime} onChange={(event) => setDesiredTime(event.target.value)} placeholder="14:30" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Select id="priority" value={priority} onChange={(event) => setPriority(event.target.value as 'low' | 'medium' | 'high')}>
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Detalhes adicionais..." />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedService(null)}>
                Cancelar
              </Button>
              <Button onClick={() => void handleRequest()} disabled={requestMutation.isPending}>
                {requestMutation.isPending ? 'Enviando...' : 'Solicitar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
