import {
  assertSafeIcalUrl,
  mergeBusyRanges,
  parseIcalBusyDates,
  toIcalDate,
} from '../../../../server/modules/acomodacoes/services/ical.util';

describe('ical.util', () => {
  const sample = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260910
DTEND;VALUE=DATE:20260913
SUMMARY:Blocked
END:VEVENT
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260920
DTEND;VALUE=DATE:20260921
SUMMARY:One night
END:VEVENT
END:VCALENDAR`;

  it('parses busy nights with exclusive DTEND', () => {
    const nights = parseIcalBusyDates(sample, '2026-09-01', '2026-09-30');
    expect(nights).toEqual(['2026-09-10', '2026-09-11', '2026-09-12', '2026-09-20']);
  });

  it('merges consecutive nights into ranges', () => {
    expect(mergeBusyRanges(['2026-09-10', '2026-09-11', '2026-09-12'])).toEqual([
      { start: '2026-09-10', endExclusive: '2026-09-13' },
    ]);
    expect(toIcalDate('2026-09-10')).toBe('20260910');
  });

  it('rejects private SSRF targets in production-like check', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    expect(() => assertSafeIcalUrl('http://127.0.0.1/secret.ics')).toThrow(/não permitida/i);
    expect(() => assertSafeIcalUrl('https://calendar.example.com/x.ics')).not.toThrow();
    process.env.NODE_ENV = prev;
  });
});
