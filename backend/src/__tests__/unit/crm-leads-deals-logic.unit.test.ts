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
});
