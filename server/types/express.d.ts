export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        /** Finite numeric id — auth.middleware rejects !Number.isFinite after Number(payload.userId). */
        id?: number;
        email?: string;
        name?: string;
        role?: string;
        /** Runtime uses string enterprise ids (e.g. 'ent_1'); do not narrow to number. */
        enterpriseId?: string | number;
      };
      propertyId?: number;
      /** WS-04/S1: sole tenant authority (populated by server-side resolver, S4/S5). Undefined until S5. */
      authorizedEnterpriseContext?: import('../modules/multi-property/context/enterprise-context.types').EnterpriseContextResolution;
      /** WS-04/S1: client intent (path/query/header). Never authority (I-04). Undefined until S5. */
      requestedEnterpriseContext?: import('../modules/multi-property/context/enterprise-context.types').RequestedEnterpriseContext;
    }
  }
}
