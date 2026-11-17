import type { RentalContractPreviewInput, RentalSignRequestInput } from '../schema';
import { buildMinimalTextPdf } from './minimal-pdf';
import type { SignRequestListItem, SignRequestPublicView, SignRequestRecord } from './rental-contract.types';
import {
  memoryCompleteSignRequest,
  memoryCreateSignRequest,
  memoryGetContractForToken,
  memoryGetPublicSignView,
  memoryListSignRequestsByUnit,
  __resetSignStoreForTests,
} from './rental-sign-memory.store';
import {
  postgresCompleteSignRequest,
  postgresCreateSignRequest,
  postgresGetContractForToken,
  postgresGetPublicSignView,
  postgresListSignRequestsByUnit,
} from './rental-sign-postgres.repository';

export type { SignRequestRecord } from './rental-contract.types';
export { __resetSignStoreForTests };

export function rentalSignUsePostgres(): boolean {
  if (process.env.JEST_WORKER_ID) return false;
  const mode = process.env.RENTAL_SIGN_PERSISTENCE ?? process.env.DEALS_PERSISTENCE ?? 'postgres';
  if (mode === 'memory') return false;
  return mode === 'postgres' && Boolean(process.env.DATABASE_URL);
}

export function buildRentalContractPdf(input: RentalContractPreviewInput): Buffer {
  const endDate = new Date(`${input.startDate}T12:00:00.000Z`);
  endDate.setMonth(endDate.getMonth() + input.termMonths);
  const depositLabel =
    input.depositType === 'fiador' ? 'Fiador' : input.depositType === 'seguro' ? 'Seguro fiança' : 'Caução';

  const lines = [
    'MINUTA PADRAO — CONTRATO DE LOCACAO RESIDENCIAL',
    `Unidade: ${input.unitName} (${input.unitId})`,
    `Endereco: ${input.address}`,
    `Locatario: ${input.tenantName}`,
    `Aluguel mensal: R$ ${input.monthlyRent.toLocaleString('pt-BR')}`,
    `Prazo: ${input.termMonths} meses · Garantia: ${depositLabel}`,
    `Inicio: ${input.startDate} — Termino previsto: ${endDate.toISOString().slice(0, 10)}`,
    '',
    'Clausulas resumidas:',
    '1) Pagamento ate o dia 5 de cada mes.',
    '2) Vistoria de entrada e saida com laudo anexo.',
    '3) Garantia locaticia conforme politica RSV360.',
    '4) Assinatura eletronica com aceite formal e token vinculado.',
    '',
    'Documento vinculado a solicitacao de assinatura RSV360.',
  ];

  return buildMinimalTextPdf(lines, 'Contrato Locacao RSV360');
}

export async function createSignRequest(input: RentalSignRequestInput): Promise<SignRequestRecord> {
  if (rentalSignUsePostgres()) return postgresCreateSignRequest(input);
  return memoryCreateSignRequest(input);
}

export async function getPublicSignView(
  requestId: string,
  token: string,
): Promise<SignRequestPublicView | null> {
  if (rentalSignUsePostgres()) return postgresGetPublicSignView(requestId, token);
  return memoryGetPublicSignView(requestId, token);
}

export async function getContractPdfForToken(requestId: string, token: string): Promise<Buffer | null> {
  const contract = rentalSignUsePostgres()
    ? await postgresGetContractForToken(requestId, token)
    : memoryGetContractForToken(requestId, token);
  if (!contract) return null;
  return buildRentalContractPdf(contract);
}

export async function completeSignRequest(
  requestId: string,
  token: string,
): Promise<SignRequestRecord | null> {
  if (rentalSignUsePostgres()) return postgresCompleteSignRequest(requestId, token);
  return memoryCompleteSignRequest(requestId, token);
}

export async function listSignRequestsByUnit(unitId: string): Promise<SignRequestListItem[]> {
  if (rentalSignUsePostgres()) return postgresListSignRequestsByUnit(unitId);
  return memoryListSignRequestsByUnit(unitId);
}

export function buildPublicSignPath(requestId: string, token: string): string {
  const q = new URLSearchParams({ requestId, token }).toString();
  return `/rentals/sign?${q}`;
}