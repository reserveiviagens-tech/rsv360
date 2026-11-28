'use client';

import * as React from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export type LintelDenseStatus = 'paid' | 'pending' | 'danger';

export function LintelStatusPill({
  status,
  children,
  className,
}: {
  status: LintelDenseStatus;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('lintel-status-pill lintel-tabular-nums', className)} data-status={status}>
      {children}
    </span>
  );
}

export type LintelDenseColumn<T> = {
  id: string;
  header: string;
  headerClassName?: string;
  cellClassName?: string;
  align?: 'left' | 'right';
  tabular?: boolean;
  render: (row: T) => React.ReactNode;
};

export function DenseTable<T extends { id: string | number }>({
  rows,
  columns,
  caption,
  className,
  emptyMessage = 'Nenhum registro.',
  'aria-label': ariaLabel,
}: {
  rows: T[];
  columns: LintelDenseColumn<T>[];
  caption?: string;
  className?: string;
  emptyMessage?: string;
  'aria-label'?: string;
}) {
  return (
    <Table className={cn('lintel-tabular-nums text-xs', className)} aria-label={ariaLabel}>
      {caption ? <caption className="sr-only">{caption}</caption> : null}
      <TableHeader className="bg-[var(--lintel-bg-subtle)]">
        <TableRow className="hover:bg-transparent">
          {columns.map((col) => (
            <TableHead
              key={col.id}
              className={cn(
                'h-10 px-3 text-[11px] font-bold uppercase tracking-wide text-[var(--lintel-brand-navy)] dark:text-slate-200',
                col.align === 'right' && 'text-right',
                col.headerClassName,
              )}
            >
              {col.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={columns.length}
              className="h-24 text-center text-sm text-muted-foreground"
            >
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow key={row.id} className="lintel-dense-table-row border-[var(--lintel-bg-subtle)]">
              {columns.map((col) => (
                <TableCell
                  key={col.id}
                  className={cn(
                    'px-3 py-2 align-middle text-[13px]',
                    col.align === 'right' && 'text-right',
                    col.tabular && 'lintel-tabular-nums',
                    col.cellClassName,
                  )}
                >
                  {col.render(row)}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}