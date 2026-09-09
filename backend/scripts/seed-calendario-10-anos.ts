#!/usr/bin/env npx tsx
/**
 * Seed calendário tarifário 10 anos: temporadas + férias escolares + picos
 * (Carnaval, Semana Santa, Natal, Réveillon, feriados pontes).
 *
 * Uso:
 *   DATABASE_URL=postgresql://... npx tsx scripts/seed-calendario-10-anos.ts
 *   DATABASE_URL=... npx tsx scripts/seed-calendario-10-anos.ts --dry-run
 */
import 'dotenv/config';
import { Pool } from 'pg';
import { gerarPeriodosTemporadaAnos } from '../../server/modules/acomodacoes/services/calendario-contexto.util';

const dryRun = process.argv.includes('--dry-run');

const TEMPORADAS = [
  { slug: 'baixa', nome: 'Baixa temporada', prioridade: 1, cor: '#94a3b8' },
  { slug: 'media', nome: 'Média temporada', prioridade: 2, cor: '#38bdf8' },
  { slug: 'alta', nome: 'Alta temporada', prioridade: 3, cor: '#f59e0b' },
  { slug: 'ferias_escolares', nome: 'Férias escolares', prioridade: 4, cor: '#fb923c' },
  { slug: 'feriado', nome: 'Feriado / pico', prioridade: 5, cor: '#ef4444' },
] as const;

async function upsertTemporada(
  client: Pool['connect'] extends (...a: infer _A) => Promise<infer C> ? C : never,
  t: (typeof TEMPORADAS)[number],
) {
  await client.query(
    `INSERT INTO tarifa_temporada (slug, nome, cor, prioridade, ativo)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (slug) DO UPDATE SET
       nome = EXCLUDED.nome,
       cor = EXCLUDED.cor,
       prioridade = EXCLUDED.prioridade,
       ativo = true,
       atualizado_em = NOW()`,
    [t.slug, t.nome, t.cor, t.prioridade],
  );
}

async function main() {
  const anoInicio = 2026;
  const anos = 10;
  const periodos = gerarPeriodosTemporadaAnos(anoInicio, anos);

  console.log(
    `[seed-calendario-10-anos] ${periodos.length} períodos · ${anoInicio}–${anoInicio + anos - 1} · dryRun=${dryRun}`,
  );

  if (dryRun) {
    let shown = 0;
    for (const p of periodos) {
      if (
        shown < 5 ||
        p.rotulo?.includes('Carnaval') ||
        p.rotulo?.includes('Natal') ||
        p.rotulo?.includes('Férias julho')
      ) {
        console.log(`  ${p.temporada} ${p.inicio}→${p.fim} (${p.rotulo || ''})`);
        shown += 1;
      }
    }
    console.log(`[dry-run] ${periodos.length} períodos seriam gravados (sem DATABASE_URL)`);
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL obrigatório');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const t of TEMPORADAS) {
      await upsertTemporada(client, t);
    }

    const { rows: temps } = await client.query<{ id: number; slug: string }>(
      `SELECT id, slug FROM tarifa_temporada WHERE slug = ANY($1)`,
      [TEMPORADAS.map((t) => t.slug)],
    );
    const idBySlug = Object.fromEntries(temps.map((r) => [r.slug, r.id])) as Record<string, number>;

    await client.query(
      `DELETE FROM tarifa_temporada_periodo
         WHERE temporada_id = ANY($1::int[])
           AND data_inicio >= $2::date
           AND data_fim <= $3::date`,
      [Object.values(idBySlug), `${anoInicio}-01-01`, `${anoInicio + anos - 1}-12-31`],
    );

    let inserted = 0;
    for (const p of periodos) {
      const tid = idBySlug[p.temporada];
      if (!tid) throw new Error(`Temporada sem id: ${p.temporada}`);
      await client.query(
        `INSERT INTO tarifa_temporada_periodo (temporada_id, data_inicio, data_fim, ativo)
           VALUES ($1, $2, $3, true)`,
        [tid, p.inicio, p.fim],
      );
      inserted += 1;
    }

    await client.query('COMMIT');
    console.log(`[ok] ${inserted} períodos gravados`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

void main();
