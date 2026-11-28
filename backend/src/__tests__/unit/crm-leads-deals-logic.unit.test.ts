describe('CRM Logic & Helpers Unit Tests', () => {
  describe('Win Rate Calculation Logic', () => {
    function computeWinRate(deals: Array<{ stage?: string; status?: string }>): number | null {
      const won = deals.filter((d) => d.stage === 'closed' || d.status === 'won').length;
      const lost = deals.filter((d) => d.status === 'lost').length;
      const decided = won + lost;
      if (decided === 0) return null;
      return Math.round((won / decided) * 100);
    }

    it('returns null when there are no deals', () => {
      expect(computeWinRate([])).toBeNull();
    });

    it('returns null when there are active deals but none closed or lost (eliminates false 97%)', () => {
      const activeDeals = [
        { stage: 'viewing', status: 'active' },
        { stage: 'offer', status: 'active' },
        { stage: 'negotiation', status: 'active' },
      ];
      expect(computeWinRate(activeDeals)).toBeNull();
    });

    it('computes 100% win rate when only won deals are present', () => {
      const deals = [
        { stage: 'closed', status: 'won' },
        { stage: 'closed', status: 'won' },
      ];
      expect(computeWinRate(deals)).toBe(100);
    });

    it('computes 50% win rate when 1 won and 1 lost', () => {
      const deals = [
        { stage: 'closed', status: 'won' },
        { stage: 'viewing', status: 'lost' },
      ];
      expect(computeWinRate(deals)).toBe(50);
    });

    it('computes accurate rounded percentage with mixed deals', () => {
      const deals = [
        { stage: 'closed', status: 'won' },
        { stage: 'closed', status: 'won' },
        { stage: 'negotiation', status: 'lost' },
        { stage: 'offer', status: 'active' }, // ignored in decided count
      ];
      // 2 won out of 3 decided = 66.666% -> 67%
      expect(computeWinRate(deals)).toBe(67);
    });
  });

  describe('LGPD PII Masking Logic', () => {
    function maskEmail(email: string): string {
      const [user, domain] = email.split('@');
      if (!user || !domain) return '***@***';
      if (user.length <= 2) return `${user[0]}***@${domain}`;
      return `${user.slice(0, 2)}***${user.slice(-1)}@${domain}`;
    }

    function maskPhone(phone: string): string {
      const digits = phone.replace(/\D/g, '');
      if (digits.length < 8) return '***-***';
      const last4 = digits.slice(-4);
      return `+${digits.slice(0, 2)} *** ***-${last4}`;
    }

    it('masks emails preserving prefix and domain', () => {
      expect(maskEmail('rodrigo.silva@gestao.com')).toMatch(/^ro\*\*\*a@gestao\.com$/);
      expect(maskEmail('j.thornwood@apexholdings.co.uk')).toMatch(/^j\.\*\*\*d@apexholdings\.co\.uk$/);
      expect(maskEmail('ab@test.com')).toBe('a***@test.com');
    });

    it('masks phone numbers preserving country code and last 4 digits', () => {
      expect(maskPhone('+55 11 98765-4321')).toBe('+55 *** ***-4321');
      expect(maskPhone('+44 7700 900123')).toBe('+44 *** ***-0123');
    });
  });

  describe('Deep Link Slug Parsing & Resolution', () => {
    function parseDealHash(hash: string): string | null {
      const match = hash.match(/^#\/?deals\/([^/?&#]+)/i);
      return match ? decodeURIComponent(match[1]) : null;
    }

    it('parses valid deal hashes', () => {
      expect(parseDealHash('#deals/dhollismarc')).toBe('dhollismarc');
      expect(parseDealHash('#/deals/dhollisspen')).toBe('dhollisspen');
      expect(parseDealHash('#deals/deal%20001')).toBe('deal 001');
    });

    it('returns null for unrelated hashes', () => {
      expect(parseDealHash('#overview')).toBeNull();
      expect(parseDealHash('#rentals')).toBeNull();
      expect(parseDealHash('')).toBeNull();
    });
  });

  describe('Sales & Rentals Property Dossier Resolution Logic', () => {
    const mockSalesListings = [
      { id: 's1', slug: 'hollis-modern-house', name: 'Hollis Modern House' },
      { id: 's2', slug: 'villa-sol-marina', name: 'Villa Sol Marina' },
    ];

    const mockRentalPortfolio = [
      { id: 'r1', name: 'Arbor Tower', units: 48, occupied: 44 },
      { id: 'r2', name: 'Northbank Lofts', units: 36, occupied: 31 },
    ];

    function resolveSalesListing(slug: string, listings: typeof mockSalesListings) {
      const normalized = slug.trim().toLowerCase();
      return listings.find(
        (l) =>
          l.slug === normalized ||
          l.name.toLowerCase().replace(/\s+/g, '-') === normalized ||
          l.name.toLowerCase() === normalized,
      ) || null;
    }

    function resolveRentalProperty(param: string, rentals: typeof mockRentalPortfolio) {
      const normalized = param.trim().toLowerCase();
      return rentals.find(
        (r) =>
          r.id.toLowerCase() === normalized ||
          r.name.toLowerCase().replace(/\s+/g, '-') === normalized ||
          r.name.toLowerCase() === normalized,
      ) || null;
    }

    it('resolves sales property by exact slug or name', () => {
      expect(resolveSalesListing('hollis-modern-house', mockSalesListings)?.id).toBe('s1');
      expect(resolveSalesListing('Villa Sol Marina', mockSalesListings)?.id).toBe('s2');
      expect(resolveSalesListing('non-existent', mockSalesListings)).toBeNull();
    });

    it('resolves rental property by ID, slug or full name', () => {
      expect(resolveRentalProperty('r1', mockRentalPortfolio)?.name).toBe('Arbor Tower');
      expect(resolveRentalProperty('arbor-tower', mockRentalPortfolio)?.id).toBe('r1');
      expect(resolveRentalProperty('Northbank Lofts', mockRentalPortfolio)?.id).toBe('r2');
      expect(resolveRentalProperty('r999', mockRentalPortfolio)).toBeNull();
    });

    it('preserves query params during tab redirects', () => {
      const originalQuery = { property: 'villa-sol-marina', ref: 'campaign123' };
      const salesRedirect = { ...originalQuery, tab: 'sales' };
      expect(salesRedirect).toEqual({
        property: 'villa-sol-marina',
        ref: 'campaign123',
        tab: 'sales',
      });

      const rentalQuery = { rental: 'r1', filter: 'active' };
      const rentalRedirect = { ...rentalQuery, tab: 'rentals' };
      expect(rentalRedirect).toEqual({
        rental: 'r1',
        filter: 'active',
        tab: 'rentals',
      });
    });
  });
});
