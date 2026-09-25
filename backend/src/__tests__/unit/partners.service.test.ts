import {
  assertPartnerStaffAccess,
  PartnerForbiddenError,
} from '../../../../server/modules/partners/services/partners.service';
import {
  createMembershipSchema,
  createPartnerSchema,
  updatePartnerSchema,
} from '../../../../server/modules/partners/schema';

describe('partners Fatia A — service authz + Zod', () => {
  describe('assertPartnerStaffAccess (defense-in-depth / IDOR)', () => {
    it('permite admin e manager', () => {
      expect(() => assertPartnerStaffAccess({ id: 1, role: 'admin' })).not.toThrow();
      expect(() => assertPartnerStaffAccess({ id: 2, role: 'manager' })).not.toThrow();
    });

    it('nega roles sem autorização sobre Partner (IDOR context)', () => {
      for (const role of ['user', 'anfitriao', 'corretor', 'partner']) {
        expect(() => assertPartnerStaffAccess({ id: 99, role })).toThrow(PartnerForbiddenError);
      }
    });
  });

  describe('Zod schemas', () => {
    it('createPartner rejeita code inválido', () => {
      const r = createPartnerSchema.safeParse({ code: 'bad code!', displayName: 'X' });
      expect(r.success).toBe(false);
    });

    it('createPartner aceita payload mínimo', () => {
      const r = createPartnerSchema.safeParse({ code: 'acme_1', displayName: 'Acme' });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.status).toBe('draft');
      }
    });

    it('updatePartner rejeita body vazio', () => {
      expect(updatePartnerSchema.safeParse({}).success).toBe(false);
    });

    it('createMembership rejeita role fora do CHECK 0059', () => {
      expect(createMembershipSchema.safeParse({ userId: 1, role: 'admin' }).success).toBe(false);
    });

    it('createMembership aceita roles do CHECK 0059', () => {
      for (const role of ['owner', 'partner_admin', 'ops', 'finance', 'member']) {
        expect(createMembershipSchema.safeParse({ userId: 1, role }).success).toBe(true);
      }
    });
  });
});
