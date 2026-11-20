import type { RentalContractPreviewInput } from '../schema';

export type SignRequestStatus = 'pending' | 'signed' | 'expired' | 'revoked';

export type SignRequestRecord = {
  id: string;
  unitId: string;
  status: SignRequestStatus;
  expiresAt: string;
  signerName?: string;
  termMonths?: number;
  depositType?: string;
  createdAt?: string;
  signedAt?: string;
  /** Returned once on create; not persisted in plaintext. */
  signingToken?: string;
};

export type SignRequestPublicView = {
  id: string;
  status: SignRequestStatus;
  expiresAt: string;
  signerName: string;
  unitName: string;
  address: string;
  termMonths: number;
  depositType: string;
  monthlyRent: number;
};

export type SignRequestListItem = {
  id: string;
  unitId: string;
  status: SignRequestStatus;
  signerName: string;
  termMonths: number;
  depositType: string;
  expiresAt: string;
  createdAt: string;
  signedAt?: string;
  signerCpfMasked?: string;
};

export type StoredSignRequest = SignRequestRecord & {
  tokenHash: string;
  emailHash: string;
  cpfHash: string;
  signerCpfMasked?: string;
  contract: RentalContractPreviewInput;
};