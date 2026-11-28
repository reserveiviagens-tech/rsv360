import { describe, expect, it } from 'vitest';

import {
  buildOverviewContactHubPath,
  normalizeBuyerDisplayName,
  resolveBuyerContactId,
} from '../deal-buyer-contact';

describe('resolveBuyerContactId', () => {
  it('maps known demo deal buyers to hub contact ids', () => {
    expect(resolveBuyerContactId('Marcus Adebayo')).toBe('c5');
    expect(resolveBuyerContactId('  Spencer Hale ')).toBe('c2');
  });

  it('returns null for unknown buyer names', () => {
    expect(resolveBuyerContactId('Ren Takeda')).toBeNull();
    expect(resolveBuyerContactId(undefined)).toBeNull();
  });
});

describe('normalizeBuyerDisplayName', () => {
  it('collapses whitespace and lowercases', () => {
    expect(normalizeBuyerDisplayName('  Marcus   Adebayo ')).toBe('marcus adebayo');
  });
});

describe('buildOverviewContactHubPath', () => {
  it('builds contacts tab deep link', () => {
    expect(buildOverviewContactHubPath('c5')).toBe('/overview?tab=contacts&contact=c5');
  });
});