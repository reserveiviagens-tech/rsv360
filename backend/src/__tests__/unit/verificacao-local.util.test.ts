import {
  applyStaffVerificacaoLocalDecision,
  haversineMeters,
  sanitizeVerificacaoLocalHostPatch,
  validateVerificacaoLocalGeoPayload,
  validateWebGpsDistance,
  WEB_GPS_MAX_DISTANCE_M,
} from '../../../../server/modules/acomodacoes/services/verificacao-local.util';

describe('verificacao-local.util', () => {
  const listingCoords = {
    localizacao: { lat: -17.7539, lng: -48.6183 },
  };

  it('blocks host from self-approving via metadata patch', () => {
    const next = sanitizeVerificacaoLocalHostPatch(
      { verificacaoLocal: { status: 'enviado' } },
      { status: 'aprovado', evidencias: [{ url: 'https://example.com/a.jpg' }] },
    );
    expect(next.ok).toBe(true);
    if (next.ok) {
      expect(next.value.status).toBe('enviado');
      expect(next.value.evidencias).toHaveLength(1);
    }
  });

  it('allows host to submit enviado with videos', () => {
    const next = sanitizeVerificacaoLocalHostPatch({}, { status: 'enviado', metodo: 'videos' });
    expect(next.ok).toBe(true);
    if (next.ok) {
      expect(next.value.status).toBe('enviado');
      expect(next.value.metodo).toBe('videos');
    }
  });

  it('haversineMeters returns ~0 for same point', () => {
    expect(haversineMeters(-17.7539, -48.6183, -17.7539, -48.6183)).toBeLessThan(1);
  });

  it('haversineMeters detects distance beyond threshold', () => {
    const dist = haversineMeters(-17.7539, -48.6183, -17.76, -48.63);
    expect(dist).toBeGreaterThan(WEB_GPS_MAX_DISTANCE_M);
  });

  it('validateVerificacaoLocalGeoPayload rejects invalid lat', () => {
    expect(
      validateVerificacaoLocalGeoPayload({
        lat: 999,
        lng: -48.6183,
        capturedAt: new Date().toISOString(),
      }).ok,
    ).toBe(false);
  });

  it('validateVerificacaoLocalGeoPayload accepts valid payload', () => {
    const capturedAt = new Date().toISOString();
    const r = validateVerificacaoLocalGeoPayload({
      lat: -17.7539,
      lng: -48.6183,
      accuracy: 12,
      capturedAt,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.lat).toBeCloseTo(-17.7539, 4);
      expect(r.value.accuracy).toBe(12);
    }
  });

  it('web_gps submit rejects when listing has no reference coords', () => {
    const capturedAt = new Date().toISOString();
    const next = sanitizeVerificacaoLocalHostPatch(
      {},
      {
        status: 'enviado',
        metodo: 'web_gps',
        evidenciaGeo: { lat: -17.7539, lng: -48.6183, capturedAt },
      },
    );
    expect(next.ok).toBe(false);
    if (!next.ok) {
      expect(next.error).toBe('verificacao_local_invalida');
      expect(next.message).toMatch(/Localização/i);
    }
  });

  it('web_gps submit rejects when distance exceeds 500m', () => {
    const capturedAt = new Date().toISOString();
    const next = sanitizeVerificacaoLocalHostPatch(
      listingCoords,
      {
        status: 'enviado',
        metodo: 'web_gps',
        evidenciaGeo: { lat: -17.8, lng: -48.7, capturedAt },
      },
    );
    expect(next.ok).toBe(false);
    if (!next.ok) {
      expect(next.message).toMatch(/500 m/);
    }
  });

  it('web_gps submit accepts coords within 500m', () => {
    const capturedAt = new Date().toISOString();
    const geo = { lat: -17.754, lng: -48.6185, capturedAt };
    const distCheck = validateWebGpsDistance(listingCoords.localizacao, {
      ...geo,
      lat: geo.lat,
      lng: geo.lng,
    });
    expect(distCheck.ok).toBe(true);

    const next = sanitizeVerificacaoLocalHostPatch(listingCoords, {
      status: 'enviado',
      metodo: 'web_gps',
      evidenciaGeo: geo,
    });
    expect(next.ok).toBe(true);
    if (next.ok) {
      expect(next.value.metodo).toBe('web_gps');
      expect(next.value.distanciaMetros).toBeLessThanOrEqual(WEB_GPS_MAX_DISTANCE_M);
      expect(next.value.evidenciaGeo).toMatchObject({ lat: geo.lat, lng: geo.lng });
    }
  });

  it('staff approve sets aprovado + revisadoEm', () => {
    const meta = applyStaffVerificacaoLocalDecision(
      { verificacaoLocal: { status: 'enviado', metodo: 'web_gps' } },
      'aprovar',
    );
    const ver = meta.verificacaoLocal as Record<string, unknown>;
    expect(ver.status).toBe('aprovado');
    expect(typeof ver.revisadoEm).toBe('string');
  });

  it('staff reject stores motivo', () => {
    const meta = applyStaffVerificacaoLocalDecision(
      { verificacaoLocal: { status: 'enviado' } },
      'rejeitar',
      'Fotos ilegíveis',
    );
    const ver = meta.verificacaoLocal as Record<string, unknown>;
    expect(ver.status).toBe('rejeitado');
    expect(ver.motivoRejeicao).toBe('Fotos ilegíveis');
  });
});
