import { useEffect, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import AnfitriaoRoleGuard from '../../../components/AnfitriaoRoleGuard';
import { fase1Api } from '@/lib/fase1-api';
import { useAuth } from '@/src/context/AuthContext';

export default function AnfitriaoTarifasPage() {
  const { user } = useAuth();
  const isStaff = user?.role === 'admin' || user?.role === 'manager';
  const [motorOn, setMotorOn] = useState(false);
  const [categorias, setCategorias] = useState<unknown[]>([]);
  const [temporadas, setTemporadas] = useState<unknown[]>([]);
  const [regras, setRegras] = useState<unknown[]>([]);
  const [simAcomodacaoId, setSimAcomodacaoId] = useState('');
  const [simData, setSimData] = useState(() => new Date().toISOString().slice(0, 10));
  const [simResult, setSimResult] = useState<unknown>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [tetoPct, setTetoPct] = useState('10');
  const [politicaMsg, setPoliticaMsg] = useState<string | null>(null);

  useEffect(() => {
    fase1Api.tarifasConfig().then((r) => setMotorOn(r.data?.tarifarioDinamicoAtivo === true)).catch(() => {});
    fase1Api
      .tarifasPoliticaDesconto()
      .then((r) => {
        const global = (r.data || []).find((p) => p.scope === 'global');
        if (global?.maxDescontoPercentual) setTetoPct(String(global.maxDescontoPercentual));
      })
      .catch(() => {});
    if (isStaff) {
      Promise.all([fase1Api.tarifasCategorias(), fase1Api.tarifasTemporadas(), fase1Api.tarifasRegras()])
        .then(([c, t, rg]) => {
          setCategorias(c.data ?? []);
          setTemporadas(t.data ?? []);
          setRegras(rg.data ?? []);
        })
        .catch(() => {});
    }
  }, [isStaff]);

  async function salvarPolitica() {
    const pct = Number(tetoPct);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      setPoliticaMsg('Percentual inválido');
      return;
    }
    await fase1Api.tarifasSetPoliticaDesconto({
      scope: 'global',
      maxDescontoPercentual: pct,
    });
    setPoliticaMsg(`Teto global salvo: ${pct}%`);
  }

  async function toggleMotor() {
    if (!isStaff) return;
    const next = !motorOn;
    await fase1Api.tarifasSetConfig(next);
    setMotorOn(next);
    setMsg(next ? 'Motor ligado' : 'Motor desligado — wizard usa preco_diaria base');
  }

  async function simular() {
    const id = Number(simAcomodacaoId);
    if (!id) return;
    const res = await fase1Api.tarifasSimular(id, simData);
    setSimResult(res.data);
  }

  return (
    <AnfitriaoRoleGuard>
      <Head>
        <title>Tarifário | Anfitrião</title>
      </Head>
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-4xl">
          <Link href="/anfitriao" className="text-sm text-blue-600 hover:underline">
            ← Painel
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Tarifário dinâmico</h1>
          <p className="text-sm text-slate-600">Motor desligado por padrão — zero regressão no wizard.</p>

          {isStaff && (
            <div className="mt-6 rounded-xl border bg-white p-6">
              <div className="flex items-center justify-between">
                <span className="font-medium">Tarifário dinâmico (global)</span>
                <button
                  type="button"
                  onClick={toggleMotor}
                  className={`rounded-lg px-4 py-2 text-sm text-white ${motorOn ? 'bg-emerald-600' : 'bg-slate-400'}`}
                >
                  {motorOn ? 'Ligado' : 'Desligado'}
                </button>
              </div>
              {msg && <p className="mt-2 text-sm">{msg}</p>}
            </div>
          )}

          <div className="mt-6 rounded-xl border bg-white p-6 space-y-3">
            <h2 className="font-semibold">Política de desconto (parceiros CRM)</h2>
            <p className="text-sm text-slate-600">
              Teto máximo que corretores/agentes/promotores podem aplicar. Enforcement no servidor.
            </p>
            <label className="block text-sm max-w-xs">
              Máx. desconto (%)
              <input
                type="number"
                min={0}
                max={100}
                className="mt-1 w-full rounded border px-3 py-2"
                value={tetoPct}
                disabled={!isStaff && user?.role !== 'anfitriao'}
                onChange={(e) => setTetoPct(e.target.value)}
              />
            </label>
            {(isStaff || user?.role === 'anfitriao') && (
              <button
                type="button"
                onClick={() => void salvarPolitica()}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Salvar política
              </button>
            )}
            {politicaMsg && <p className="text-sm text-emerald-700">{politicaMsg}</p>}
          </div>

          {isStaff && (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border bg-white p-4">
                <h2 className="font-semibold">Categorias</h2>
                <pre className="mt-2 max-h-40 overflow-auto text-xs">{JSON.stringify(categorias, null, 2)}</pre>
              </div>
              <div className="rounded-xl border bg-white p-4">
                <h2 className="font-semibold">Temporadas</h2>
                <pre className="mt-2 max-h-40 overflow-auto text-xs">{JSON.stringify(temporadas, null, 2)}</pre>
              </div>
              <div className="rounded-xl border bg-white p-4">
                <h2 className="font-semibold">Regras</h2>
                <pre className="mt-2 max-h-40 overflow-auto text-xs">{JSON.stringify(regras, null, 2)}</pre>
              </div>
            </div>
          )}

          <div className="mt-6 rounded-xl border bg-white p-6">
            <h2 className="font-semibold">Simulador</h2>
            <div className="mt-3 flex flex-wrap gap-3">
              <input
                placeholder="ID unidade"
                className="rounded border px-3 py-2 text-sm"
                value={simAcomodacaoId}
                onChange={(e) => setSimAcomodacaoId(e.target.value)}
              />
              <input
                type="date"
                className="rounded border px-3 py-2 text-sm"
                value={simData}
                onChange={(e) => setSimData(e.target.value)}
              />
              <button type="button" onClick={simular} className="rounded bg-blue-600 px-4 py-2 text-sm text-white">
                Simular
              </button>
            </div>
            {simResult != null && (
              <pre className="mt-4 max-h-64 overflow-auto rounded bg-slate-100 p-3 text-xs">
                {JSON.stringify(simResult, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    </AnfitriaoRoleGuard>
  );
}
