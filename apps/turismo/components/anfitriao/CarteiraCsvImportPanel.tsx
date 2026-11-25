'use client';

import { useMemo, useState } from 'react';
import {
  parseCarteiraCsvVinculo,
  type CarteiraVinculoRow,
  type CsvImportLineError,
} from '@rsv360/shared';

import { DenseTable, type LintelDenseColumn } from '../lintel/DenseTable';
import { StickyBottomBar } from '../lintel/StickyBottomBar';

const errorColumns: LintelDenseColumn<CsvImportLineError & { id: number }> = [
  {
    id: 'line',
    header: 'Linha',
    align: 'right',
    tabular: true,
    render: (r) => r.line,
  },
  {
    id: 'reason',
    header: 'Motivo',
    render: (r) => r.reason,
  },
];

const previewColumns: LintelDenseColumn<CarteiraVinculoRow & { id: string }> = [
  {
    id: 'corretor',
    header: 'Corretor ID',
    align: 'right',
    tabular: true,
    render: (r) => r.corretorId,
  },
  {
    id: 'proprietario',
    header: 'Proprietário ID',
    align: 'right',
    tabular: true,
    render: (r) => r.proprietarioId,
  },
];

export function CarteiraCsvImportPanel({
  onImport,
  isPending,
  onPreviewServer,
}: {
  onImport: (items: CarteiraVinculoRow[]) => void;
  isPending?: boolean;
  onPreviewServer?: (csv: string) => Promise<void>;
}) {
  const [csvText, setCsvText] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  const report = useMemo(() => parseCarteiraCsvVinculo(csvText), [csvText]);

  const errorRows = useMemo(
    () => report.erros.map((e, idx) => ({ ...e, id: idx })),
    [report.erros],
  );
  const previewRows = useMemo(
    () => report.preview.map((row) => ({ ...row, id: `${row.corretorId}-${row.proprietarioId}` })),
    [report.preview],
  );

  const blockImport =
    report.totalLinhas === 0 ||
    report.erros.some((e) => e.line === 0) ||
    report.linhasValidas === 0;

  return (
    <section className="mt-10 rounded-xl border border-[var(--lintel-bg-subtle)] bg-[var(--lintel-bg-surface)] p-4">
      <h2 className="text-lg font-semibold text-[var(--lintel-brand-navy)] dark:text-white">
        Importação em lote (CSV)
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Uma linha por vínculo: <code className="text-xs">corretorId,proprietarioId</code> ou{' '}
        <code className="text-xs">corretorId;proprietarioId</code>. Máximo 500 linhas.
      </p>
      <textarea
        value={csvText}
        onChange={(e) => {
          setCsvText(e.target.value);
          setPreviewOpen(false);
        }}
        rows={6}
        className="mt-3 w-full rounded-lg border border-[var(--lintel-bg-subtle)] bg-[var(--lintel-bg-canvas)] px-3 py-2 font-mono text-xs text-slate-800 dark:text-slate-200"
        placeholder={'corretorId,proprietarioId\n2,101\n2;102'}
        aria-label="Conteúdo CSV"
      />

      <div className="mt-3 flex flex-wrap gap-3 text-xs lintel-tabular-nums text-slate-600 dark:text-slate-400">
        <span>Total: {report.totalLinhas}</span>
        <span className="text-emerald-700 dark:text-emerald-400">Válidas: {report.linhasValidas}</span>
        <span className="text-amber-700 dark:text-amber-400">Inválidas: {report.linhasInvalidas}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-[var(--lintel-brand-navy)] px-4 py-2 text-sm font-medium text-[var(--lintel-brand-navy)] hover:bg-[var(--lintel-bg-subtle)] dark:text-white"
          disabled={!csvText.trim()}
          onClick={async () => {
            setPreviewOpen(true);
            if (onPreviewServer) await onPreviewServer(csvText);
          }}
        >
          Pré-visualizar
        </button>
      </div>

      {previewOpen ? (
        <div className="mt-6 space-y-6">
          {report.erros.length > 0 ? (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-[var(--lintel-status-danger)]">Erros</h3>
              <DenseTable rows={errorRows} columns={errorColumns} caption="Erros de validação CSV" />
            </div>
          ) : null}
          {previewRows.length > 0 ? (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-[var(--lintel-brand-navy)] dark:text-white">
                Prontos para gravação
              </h3>
              <DenseTable rows={previewRows} columns={previewColumns} caption="Preview vínculos" />
            </div>
          ) : null}
        </div>
      ) : null}

      {previewOpen && !blockImport ? (
        <StickyBottomBar padding="compact">
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {report.linhasValidas} vínculo(s) válido(s)
          </span>
          <button
            type="button"
            disabled={isPending}
            className="rounded-lg bg-[var(--lintel-brand-navy)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            onClick={() => onImport(report.preview)}
          >
            {isPending ? 'Enviando…' : 'Confirmar importação'}
          </button>
        </StickyBottomBar>
      ) : null}
    </section>
  );
}