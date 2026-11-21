'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { buildOverviewHubPath } from './overview-hub-links';

/**
 * Hook para carregar contatos na aba do Overview Hub.
 * Usa a estrutura da carteira (já existente em lib/overview-contacts)
 * e expõe dados prontos para renderização no painel do hub.
 * 
 * Retorna: contacts (já mapeados para o formato do hub), loading, error.
 */
export function useOverviewContactsHub() {
  const router = useRouter();
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (router.isReady) {
      fetchContatos();
    }
  }, [router.isReady]);

  const fetchContatos = async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: substituir por chamada real à API de contatos do CRM
      // Exemplo: const res = await fetch('/api/v1/crm/contacts', { headers: authHeaders });
      // const data = await res.json();
      // setContacts(processedContacts);
      // Simulação para desenvolvimento com dados da carteira (mascarados)
      // Usando a função carteiraToOverviewContacts do lib/overview-contacts
      // (neste exemplo, dados mockados com máscara PII)
      const mockCarteiraRows = [
        {
          corretorId: 1,
          proprietarioId: 2,
          status: 'ativo',
          criadoEm: new Date().toISOString(),
          corretor: { id: 1, name: 'João Silva', email: 'joao.silva@exemplo.com', role: 'corretor' },
          proprietario: { id: 2, name: 'Maria Costa', email: 'maria.costa@exemplo.com', role: 'proprietario' },
        },
        {
          corretorId: 3,
          proprietarioId: 4,
          status: 'ativo',
          criadoEm: new Date(Date.now() - 86400000).toISOString(), // ontem
          corretor: { id: 3, name: 'Pedro Santos', email: 'pedro.santos@exemplo.com', role: 'corretor' },
          proprietario: { id: 4, name: 'Ana Lima', email: 'ana.lima@exemplo.com', role: 'proprietario' },
        },
      ];

      // Converter usando a função existente do overview-contacts
      const processed = require('@/lib/overview-contacts').carteiraToOverviewContacts(
        mockCarteiraRows,
        'corretor' // viewerRole
      );

      setContacts(processed);
    } catch (err) {
      setError('Não foi possível carregar os contatos. Tente novamente mais tarde.');
      console.error('Erro ao carregar contatos no overview:', err);
    } finally {
      setLoading(false);
    }
  };

  return { contacts, loading, error };
}

/**
 * Componente que renderiza o painel de contatos na aba do Overview Hub.
 * Mostra cards da carteira com PII mascarada e chips Ver lead / Ver deal.
 */
export function OverviewContactsHubPanel() {
  const { contacts, loading, error } = useOverviewContactsHub();

  if (loading) return <p className="text-sm text-gray-500">Carregando contatos...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!contacts || contacts.length === 0) return <p className="text-sm text-gray-500">Nenhum contato encontrado.</p>;

  return (
    <div className="space-y-4">
      {contacts.map((c) => (
        <div key={c.id} className="group rounded-lg border border-gray-200/50 p-4 hover:border-gray-300/80 transition-colors">
          <div className="flex items-start gap-3">
            <div className="w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
              {c.name?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate line-clamp-1">{c.name}</p>
              <p className="text-xs text-gray-500 truncate line-clamp-1">{c.email}</p>
              <p className="text-xs text-gray-400">{c.phone}</p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={buildOverviewHubPath({ tab: 'leads', lead: c.id })}>
                className="text-xs text-blue-600 hover:underline group-hover:underline"
              >
                Ver lead
              </a>
              <a
                href={buildOverviewHubPath({ tab: 'deals', deal: c.id })}>
                className="text-xs text-green-600 hover:underline group-hover:underline"
              >
                Ver deal
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}