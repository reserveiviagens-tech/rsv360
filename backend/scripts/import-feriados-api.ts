#!/usr/bin/env npx tsx
/**
 * Import municipal holidays from FeriadosAPI into Postgres (recurring MM-DD).
 *
 * One reference year is enough for fixed municipal holidays; patterns apply to
 * all future years in the rate calendar.
 *
 * Prerequisites:
 *   - FERIADOS_API_KEY in .env (never commit the real key)
 *   - DATABASE_URL
 *   - Migration 0044_feriado_municipio applied
 *
 * Usage:
 *   npx tsx scripts/import-feriados-api.ts --ano=2026
 *   npx tsx scripts/import-feriados-api.ts --ano=2026 --uf=GO --concurrency=4
 *   npx tsx scripts/import-feriados-api.ts --ano=2026 --dry-run --limit=20
 *   npx tsx scripts/import-feriados-api.ts --ano=2026 --resume
 *
 * Docs: https://feriadosapi.com/docs
 * Pricing: https://feriadosapi.com/#pricing
 */
import 'dotenv/config';
import { Pool } from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { parseDataBrDdMmYyyy } from '../../server/modules/acomodacoes/services/calendario-contexto.util';
import { normalizarCidade } from '../../server/modules/acomodacoes/services/feriados-brasil.data';

const BASE = 'https://feriadosapi.com/api/v1';
const FONTE = 'feriadosapi';

type Cli = {
  ano: number;
  uf: string | null;
  concurrency: number;
  dryRun: boolean;
  resume: boolean;
  limit: number | null;
  onlyMunicipal: boolean;
};

type Municipio = { ibge: string; nome: string; uf: string };

type ApiFeriado = {
  data: string;
  nome: string;
  tipo: string;
};

function parseArgs(argv: string[]): Cli {
  const get = (k: string) => {
    const hit = argv.find((a) => a.startsWith(`--${k}=`));
    return hit ? hit.slice(k.length + 3) : null;
  };
  return {
    ano: Number(get('ano') || 2026),
    uf: get('uf')?.toUpperCase() || null,
    concurrency: Math.max(1, Math.min(16, Number(get('concurrency') || 3))),
    dryRun: argv.includes('--dry-run'),
    resume: argv.includes('--resume'),
    limit: get('limit') ? Number(get('limit')) : null,
    onlyMunicipal: !argv.includes('--all-tipos'),
  };
}

/** DD/MM/YYYY → { iso, md } — re-export for script callers / tests. */
export { parseDataBrDdMmYyyy as parseFeriadosApiDate };

function normalizeCidade(s: string): string {
  return normalizarCidade(s);
}

function mapTipo(raw: string): string {
  const t = String(raw || '').toUpperCase();
  if (t.includes('NACIONAL')) return 'nacional';
  if (t.includes('ESTADUAL')) return 'estadual';
  if (t.includes('BANCAR')) return 'bancario';
  return 'municipal';
}

async function apiGet<T>(
  apiKey: string,
  urlPath: string,
): Promise<{ data: T; quotaRemaining: string | null }> {
  const res = await fetch(`${BASE}${urlPath}`, {
    headers: {
      'X-API-Key': apiKey,
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });
  const quotaRemaining = res.headers.get('X-Quota-Remaining');
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${urlPath}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as T;
  return { data, quotaRemaining };
}

async function listMunicipios(apiKey: string, ufFilter: string | null): Promise<Municipio[]> {
  const ufs =
    ufFilter != null
      ? [ufFilter]
      : [
          'AC',
          'AL',
          'AP',
          'AM',
          'BA',
          'CE',
          'DF',
          'ES',
          'GO',
          'MA',
          'MT',
          'MS',
          'MG',
          'PA',
          'PB',
          'PR',
          'PE',
          'PI',
          'RJ',
          'RN',
          'RS',
          'RO',
          'RR',
          'SC',
          'SP',
          'SE',
          'TO',
        ];

  const out: Municipio[] = [];
  for (const uf of ufs) {
    const { data } = await apiGet<unknown>(apiKey, `/municipios?uf=${uf}`);
    const list = Array.isArray(data)
      ? data
      : Array.isArray((data as { municipios?: unknown }).municipios)
        ? (data as { municipios: unknown[] }).municipios
        : Array.isArray((data as { data?: unknown }).data)
          ? (data as { data: unknown[] }).data
          : [];

    for (const row of list) {
      const r = row as Record<string, unknown>;
      const ibge = String(r.ibge ?? r.codigo_ibge ?? r.id ?? '');
      const nome = String(r.nome ?? r.name ?? '');
      const ufRow = String(r.uf ?? r.estado ?? uf).toUpperCase();
      if (ibge && nome) out.push({ ibge: ibge.padStart(7, '0').slice(0, 7), nome, uf: ufRow });
    }
    console.log(`[municipios] ${uf}: +${list.length} (total ${out.length})`);
  }
  return out;
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next;
      next += 1;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

async function main() {
  const cli = parseArgs(process.argv.slice(2));
  const apiKey = process.env.FERIADOS_API_KEY?.trim();
  if (!apiKey) {
    console.error('FERIADOS_API_KEY obrigatório no .env (não commit)');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL && !cli.dryRun) {
    console.error('DATABASE_URL obrigatório (ou use --dry-run)');
    process.exit(1);
  }

  console.log(
    `[import-feriados-api] ano=${cli.ano} uf=${cli.uf || 'ALL'} concurrency=${cli.concurrency} dryRun=${cli.dryRun} resume=${cli.resume}`,
  );

  const checkpointDir = path.join(process.cwd(), 'data', 'feriados-api');
  fs.mkdirSync(checkpointDir, { recursive: true });
  const doneFile = path.join(checkpointDir, `done-${cli.ano}${cli.uf ? `-${cli.uf}` : ''}.json`);
  const doneSet = new Set<string>();
  if (cli.resume && fs.existsSync(doneFile)) {
    const prev = JSON.parse(fs.readFileSync(doneFile, 'utf8')) as string[];
    prev.forEach((id) => doneSet.add(id));
    console.log(`[resume] ${doneSet.size} IBGE já concluídos`);
  }

  let municipios = await listMunicipios(apiKey, cli.uf);
  if (cli.limit != null) municipios = municipios.slice(0, cli.limit);
  if (cli.resume) municipios = municipios.filter((m) => !doneSet.has(m.ibge));

  console.log(`[queue] ${municipios.length} municípios a importar`);

  const pool = cli.dryRun ? null : new Pool({ connectionString: process.env.DATABASE_URL });
  let ok = 0;
  let fail = 0;
  let upserts = 0;

  await mapPool(municipios, cli.concurrency, async (mun) => {
    try {
      const { data, quotaRemaining } = await apiGet<{
        feriados?: ApiFeriado[];
        cidade?: { nome?: string; uf?: string; ibge?: number };
      }>(apiKey, `/feriados/cidade/${mun.ibge}?ano=${cli.ano}`);

      const feriados = Array.isArray(data.feriados) ? data.feriados : [];
      const rows = feriados
        .map((f) => {
          const parsed = parseDataBrDdMmYyyy(f.data);
          if (!parsed) return null;
          const tipo = mapTipo(f.tipo);
          if (cli.onlyMunicipal && tipo !== 'municipal') return null;
          return {
            ibge: mun.ibge,
            uf: mun.uf,
            municipio: mun.nome,
            municipioNorm: normalizeCidade(mun.nome),
            md: parsed.md,
            nome: f.nome,
            tipo,
          };
        })
        .filter(Boolean) as Array<{
        ibge: string;
        uf: string;
        municipio: string;
        municipioNorm: string;
        md: string;
        nome: string;
        tipo: string;
      }>;

      if (!cli.dryRun && pool) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          for (const r of rows) {
            await client.query(
              `INSERT INTO feriado_municipio
                 (ibge_codigo, uf, municipio, municipio_norm, md, nome, tipo, fonte, ano_referencia, atualizado_em)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
               ON CONFLICT (ibge_codigo, md, nome) DO UPDATE SET
                 uf = EXCLUDED.uf,
                 municipio = EXCLUDED.municipio,
                 municipio_norm = EXCLUDED.municipio_norm,
                 tipo = EXCLUDED.tipo,
                 ano_referencia = EXCLUDED.ano_referencia,
                 atualizado_em = NOW()`,
              [r.ibge, r.uf, r.municipio, r.municipioNorm, r.md, r.nome, r.tipo, FONTE, cli.ano],
            );
            upserts += 1;
          }
          await client.query(
            `INSERT INTO feriado_import_checkpoint (fonte, ibge_codigo, ano, status, detalhes, atualizado_em)
             VALUES ($1,$2,$3,'ok',$4,NOW())
             ON CONFLICT (fonte, ibge_codigo, ano) DO UPDATE SET
               status = 'ok', detalhes = EXCLUDED.detalhes, atualizado_em = NOW()`,
            [FONTE, mun.ibge, cli.ano, `${rows.length} municipais`],
          );
          await client.query('COMMIT');
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }
      }

      doneSet.add(mun.ibge);
      ok += 1;
      if (ok % 50 === 0 || ok === 1) {
        fs.writeFileSync(doneFile, JSON.stringify([...doneSet], null, 0));
        console.log(
          `[progress] ${ok}/${municipios.length} ok · fail=${fail} · upserts~${upserts} · quota=${quotaRemaining ?? '?'} · last=${mun.uf}/${mun.nome}`,
        );
      }
    } catch (err) {
      fail += 1;
      console.error(`[fail] ${mun.ibge} ${mun.uf}/${mun.nome}:`, (err as Error).message);
    }
  });

  fs.writeFileSync(doneFile, JSON.stringify([...doneSet], null, 0));
  if (pool) await pool.end();

  console.log(`[done] ok=${ok} fail=${fail} upserts≈${upserts} checkpoint=${doneFile}`);
  console.log(
    'Próximo: reinicie o backend e selecione datas no calendário do anfitrião — municipais do dump entram no alerta.',
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
