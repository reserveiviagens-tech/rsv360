export {};

export * from './membership.types';
export * from './membership.verdict';
export * from './membership.repository';
export * from './membership.plug';
export * from './role.context';
export * from './role.guards';
export * from './rbac.mapping';

// NOTA: `membership.authority.ts` (implementacao real do port) NAO existe em S2.
// S2 entrega CONTRATO apenas. A implementacao autorizadora nasce em S3/S4.
