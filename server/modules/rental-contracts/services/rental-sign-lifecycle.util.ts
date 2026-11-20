import type { SignRequestStatus } from './rental-contract.types';

export function maskSignerCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return '***';
  return `***.***.***-${digits.slice(-2)}`;
}

export function isSignPastExpiry(expiresAt: string | Date): boolean {
  const ms = typeof expiresAt === 'string' ? new Date(expiresAt).getTime() : expiresAt.getTime();
  return ms < Date.now();
}

export function effectiveSignStatus(
  status: SignRequestStatus,
  expiresAt: string | Date,
): SignRequestStatus {
  if (status === 'pending' && isSignPastExpiry(expiresAt)) return 'expired';
  return status;
}