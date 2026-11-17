export type SignRequestRecord = {
  id: string;
  unitId: string;
  status: 'pending' | 'signed' | 'expired';
  expiresAt: string;
  /** Returned once on create; not persisted in plaintext. */
  signingToken?: string;
};