import type { Express } from 'express';
import type { Server } from 'socket.io';
import { registerOrcamentosModule } from './modules/orcamentos';
import { registerPropostasModule } from './modules/propostas';
import { registerPassageirosModule } from './modules/passageiros';
import { registerFinanceiroModule } from './modules/financeiro';
import { registerCampanhasModule } from './modules/campanhas';
import { registerLogisticaModule } from './modules/logistica';
import { registerRelatoriosModule } from './modules/relatorios';
import { registerFornecedoresHubModule } from './modules/fornecedores-hub';
import { registerAcomodacoesModule } from './modules/acomodacoes';
import { registerCotacaoPublicaModule } from './modules/cotacao-publica';
import { registerConfiguracoesModule } from './modules/configuracoes';
import { registerVouchersModule } from './modules/vouchers';
import { registerRoteiroAnalyticsModule } from './modules/roteiro-analytics';
import { registerRoteiroModule } from './modules/roteiro';
import { registerComissoesModule } from './modules/comissoes';
import { registerPartnersModule } from './modules/partners';
import { registerCmsModule } from './modules/cms';
import { registerAgentesModule } from './modules/agentes';

/**
 * Registra os 7 módulos backend da Fase 1 (migração Sistema A → B).
 * Propostas inclui WebSocket Chat HITL quando `io` é fornecido.
 */
export function registerMigracaoFase1Modules(app: Express, io?: Server) {
  registerOrcamentosModule(app);
  registerPropostasModule(app, io);
  registerPassageirosModule(app);
  registerFinanceiroModule(app);
  registerCampanhasModule(app);
  registerLogisticaModule(app);
  registerRelatoriosModule(app);
  registerFornecedoresHubModule(app);
  registerAcomodacoesModule(app);
  registerCotacaoPublicaModule(app);
  registerConfiguracoesModule(app);
  registerVouchersModule(app);
  registerRoteiroAnalyticsModule(app);
  registerRoteiroModule(app);
  registerComissoesModule(app);
  registerPartnersModule(app);
  registerCmsModule(app);
  registerAgentesModule(app);
  console.log(
    '[BOOT] Módulos Fase 1 (7/7) + Fornecedores Hub + Acomodações + Cotação Pública + Configurações + Analytics Roteiro + Mapa Roteiro + Comissões + Partners + CMS Vitrine + Agentes registrados ✓',
  );
}

module.exports = { registerMigracaoFase1Modules };
