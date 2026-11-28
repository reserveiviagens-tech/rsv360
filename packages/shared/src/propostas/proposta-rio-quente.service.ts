/**
 * Propostas Rio Quente / Aviva — Luupi & Giardino (Fatia 3).
 * Regras de pagamento: entrada PIX + saldo em até 10x cartão.
 */

export type RioQuenteHotelId = 'luupi' | 'giardino';

export type RegimeAlimentacao = 'cafe' | 'meia_pensao';

export interface AvivaHotelCatalogEntry {
  id: RioQuenteHotelId;
  nome: string;
  complexo: string;
  regimePadrao: RegimeAlimentacao;
  regrasAviva: string[];
  fotoUrls: string[];
  tarifaDiariaReferencia: number;
  naoReembolsavel: boolean;
}

export const RIO_QUENTE_AVIVA_CATALOG: Record<RioQuenteHotelId, AvivaHotelCatalogEntry> = {
  luupi: {
    id: 'luupi',
    nome: 'Luupi',
    complexo: 'Complexo Rio Quente Resorts',
    regimePadrao: 'cafe',
    naoReembolsavel: true,
    tarifaDiariaReferencia: 890,
    fotoUrls: [
      'https://www.reserveiviagens.com.br/wp-content/uploads/2020/01/luupi-exterior.jpg',
    ],
    regrasAviva: [
      'Acesso ilimitado ao Hot Park durante a estada',
      'Transfer gratuito Complexo ↔ Hot Park a cada 15–20 min',
      'Café da manhã incluso',
      'Tarifa promocional não reembolsável',
    ],
  },
  giardino: {
    id: 'giardino',
    nome: 'Giardino',
    complexo: 'Complexo Rio Quente Resorts',
    regimePadrao: 'meia_pensao',
    naoReembolsavel: true,
    tarifaDiariaReferencia: 1020,
    fotoUrls: [
      'https://www.reserveiviagens.com.br/wp-content/uploads/2020/01/giardino-piscina.jpg',
    ],
    regrasAviva: [
      'Acesso ilimitado ao Hot Park durante a estada',
      'Transfer gratuito Complexo ↔ Hot Park a cada 15–20 min',
      'Meia pensão (café + jantar)',
      'Tarifa promocional não reembolsável',
    ],
  },
};

export type EntradaPixPadrao = 200 | 400;

export interface RioQuenteEstadiaInput {
  hotelId: RioQuenteHotelId;
  checkIn: string;
  checkOut: string;
  adultos: number;
  criancas?: number;
  regime?: RegimeAlimentacao;
  valorTotalOverride?: number;
  entradaPix?: EntradaPixPadrao;
  parcelasCartao?: number;
}

export interface RioQuentePagamentoBreakdown {
  valorTotal: number;
  entradaPix: number;
  saldoCartao: number;
  parcelas: number;
  valorParcela: number;
  moeda: 'BRL';
}

export interface RioQuentePropostaDraft {
  hotel: AvivaHotelCatalogEntry;
  checkIn: string;
  checkOut: string;
  adultos: number;
  criancas: number;
  noites: number;
  regime: RegimeAlimentacao;
  pagamento: RioQuentePagamentoBreakdown;
  regrasAviva: string[];
}

const EPSILON = 0.005;
const MAX_PARCELAS = 10;

export function roundMoneyBrl(value: number): number {
  return Math.round((value + EPSILON) * 100) / 100;
}

export function countNoites(checkIn: string, checkOut: string): number {
  const inMs = Date.parse(`${checkIn}T12:00:00Z`);
  const outMs = Date.parse(`${checkOut}T12:00:00Z`);
  if (!Number.isFinite(inMs) || !Number.isFinite(outMs) || outMs <= inMs) return 0;
  return Math.round((outMs - inMs) / 86_400_000);
}

export function calcularValorEstimado(
  hotelId: RioQuenteHotelId,
  noites: number,
  adultos: number,
  criancas = 0,
): number {
  const hotel = RIO_QUENTE_AVIVA_CATALOG[hotelId];
  const hospedes = Math.max(1, adultos + criancas * 0.5);
  const base = hotel.tarifaDiariaReferencia * Math.max(1, noites);
  const ajuste = 1 + (hospedes - 2) * 0.08;
  return roundMoneyBrl(base * Math.max(1, ajuste));
}

function toCents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}

function fromCents(cents: number): number {
  return cents / 100;
}

export function calcularPagamentoRioQuente(
  valorTotal: number,
  entradaPix: EntradaPixPadrao = 200,
  parcelasCartao = 10,
): RioQuentePagamentoBreakdown {
  const totalCents = toCents(Math.max(0, valorTotal));
  const entradaCents = Math.min(toCents(entradaPix), totalCents);
  const parcelas = Math.min(MAX_PARCELAS, Math.max(1, Math.floor(parcelasCartao)));
  const saldoCents = Math.max(0, totalCents - entradaCents);
  const valorParcelaCents = parcelas > 0 ? Math.floor(saldoCents / parcelas) : 0;
  return {
    valorTotal: fromCents(totalCents),
    entradaPix: fromCents(entradaCents),
    saldoCartao: fromCents(saldoCents),
    parcelas,
    valorParcela: fromCents(valorParcelaCents),
    moeda: 'BRL',
  };
}

export function montarPropostaRioQuente(input: RioQuenteEstadiaInput): RioQuentePropostaDraft | { error: string } {
  const hotel = RIO_QUENTE_AVIVA_CATALOG[input.hotelId];
  if (!hotel) return { error: 'Hotel inválido' };
  const noites = countNoites(input.checkIn, input.checkOut);
  if (noites < 1) return { error: 'Datas inválidas' };
  if (input.adultos < 1) return { error: 'Informe ao menos 1 adulto' };

  const valorTotal =
    input.valorTotalOverride != null && input.valorTotalOverride > 0
      ? roundMoneyBrl(input.valorTotalOverride)
      : calcularValorEstimado(input.hotelId, noites, input.adultos, input.criancas ?? 0);

  const pagamento = calcularPagamentoRioQuente(
    valorTotal,
    input.entradaPix ?? 200,
    input.parcelasCartao ?? 10,
  );

  return {
    hotel,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    adultos: input.adultos,
    criancas: input.criancas ?? 0,
    noites,
    regime: input.regime ?? hotel.regimePadrao,
    pagamento,
    regrasAviva: hotel.regrasAviva,
  };
}

export function formatarMoedaBrl(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatarMensagemWhatsApp(
  draft: RioQuentePropostaDraft,
  opts?: { nomeCliente?: string; linkFotos?: string },
): string {
  const cliente = opts?.nomeCliente?.trim() ? `Olá, ${opts.nomeCliente}! ` : 'Olá! ';
  const linhas = [
    `${cliente}🏨 *Proposta Rio Quente — ${draft.hotel.nome}*`,
    `📅 ${draft.checkIn} → ${draft.checkOut} (${draft.noites} noite${draft.noites === 1 ? '' : 's'})`,
    `👨‍👩‍👧 ${draft.adultos} adulto(s)${draft.criancas ? ` · ${draft.criancas} criança(s)` : ''}`,
    `🍽 Regime: ${draft.regime === 'meia_pensao' ? 'Meia pensão' : 'Café da manhã'}`,
    '',
    '*Benefícios Aviva:*',
    ...draft.regrasAviva.map((r) => `✅ ${r}`),
    '',
    `💰 Total: *${formatarMoedaBrl(draft.pagamento.valorTotal)}*`,
    `💠 Entrada PIX: *${formatarMoedaBrl(draft.pagamento.entradaPix)}*`,
    `💳 Saldo em até *${draft.pagamento.parcelas}x* de *${formatarMoedaBrl(draft.pagamento.valorParcela)}* no cartão (sem juros)`,
    '',
    'Tarifa não reembolsável · sujeita à disponibilidade.',
    'Reservei Viagens · Caldas Novas & Rio Quente',
  ];
  if (opts?.linkFotos) linhas.push(`📷 Fotos: ${opts.linkFotos}`);
  return linhas.join('\n');
}

export function buildPdfHtmlLintel(draft: RioQuentePropostaDraft, titulo = 'Proposta Rio Quente'): string {
  const navy = '#0B2239';
  const gold = '#C59B27';
  const goldSoft = '#F6E7BE';
  const rules = draft.regrasAviva.map((r) => `<li>${escapeHtml(r)}</li>`).join('');
  const pag = draft.pagamento;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(titulo)}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 0; color: ${navy}; background: #f7f8fa; }
  header { background: ${navy}; color: #fff; padding: 24px 32px; }
  header h1 { margin: 0; font-size: 1.5rem; }
  .gold-box { background: ${goldSoft}; border-left: 4px solid ${gold}; padding: 16px 20px; margin: 24px 32px; border-radius: 8px; }
  main { padding: 0 32px 32px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-variant-numeric: tabular-nums; }
  th, td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: left; }
  footer { font-size: 12px; color: #475569; padding: 24px 32px; border-top: 1px solid #e2e8f0; }
  ul { margin: 8px 0; padding-left: 20px; }
</style>
</head>
<body>
  <header><h1>Reservei Viagens · ${escapeHtml(draft.hotel.nome)}</h1><p>${escapeHtml(draft.hotel.complexo)}</p></header>
  <main>
    <p><strong>Estadia:</strong> ${escapeHtml(draft.checkIn)} → ${escapeHtml(draft.checkOut)} (${draft.noites} noite(s))</p>
    <p><strong>Hóspedes:</strong> ${draft.adultos} adulto(s)${draft.criancas ? `, ${draft.criancas} criança(s)` : ''}</p>
    <div class="gold-box">
      <strong>Condições de pagamento</strong>
      <table>
        <tr><td>Total</td><td>${formatarMoedaBrl(pag.valorTotal)}</td></tr>
        <tr><td>Entrada PIX</td><td>${formatarMoedaBrl(pag.entradaPix)}</td></tr>
        <tr><td>Cartão ${pag.parcelas}x</td><td>${formatarMoedaBrl(pag.valorParcela)}</td></tr>
      </table>
    </div>
    <h3>Regras Aviva</h3>
    <ul>${rules}</ul>
  </main>
  <footer>
    Cuiabá-MT · Caldas Novas/Rio Quente-GO · www.reserveiviagens.com.br<br/>
    Documento informativo — sujeito à confirmação e política de cancelamento.
  </footer>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildWhatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}