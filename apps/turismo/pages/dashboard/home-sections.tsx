'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '../../src/components/ProtectedRoute';
import {
  ArrowDown,
  ArrowUp,
  ImageIcon,
  LayoutGrid,
  Pencil,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  HOME_SECTIONS,
  defaultCtaFor,
  isVideoUrl,
  type HomeSectionId,
  type HomeSectionPlacement,
} from '../../src/lib/home-sections';
import { homeSectionsApi } from '../../src/services/homeSectionsApi';
import { HomeSectionSelector } from '../../src/components/home/HomeSectionSelector';
import { HomeSectionItemDrawer } from '../../src/components/home/HomeSectionItemDrawer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../src/components/ui/dialog';

export default function HomeSectionsPage() {
  const [activeSection, setActiveSection] = useState<HomeSectionId>('hero');
  const [items, setItems] = useState<HomeSectionPlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderDirty, setOrderDirty] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [editingItem, setEditingItem] = useState<HomeSectionPlacement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HomeSectionPlacement | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sectionMeta = useMemo(
    () => HOME_SECTIONS.find((s) => s.id === activeSection)!,
    [activeSection],
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await homeSectionsApi.listAdmin(activeSection);
      setItems(
        data.map((row, index) => ({
          ...row,
          orderIndex: row.orderIndex ?? index,
          isActive: row.isActive !== false,
        })),
      );
      setOrderDirty(false);
    } catch (error) {
      console.error('Erro ao carregar home sections:', error);
      toast.error('Não foi possível carregar a seção');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeSection]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reload when tab changes
    load();
  }, [load]);

  const move = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= items.length) return;
    const copy = [...items];
    const tmp = copy[index];
    copy[index] = copy[next];
    copy[next] = tmp;
    setItems(copy.map((item, i) => ({ ...item, orderIndex: i })));
    setOrderDirty(true);
  };

  const toggleActive = async (item: HomeSectionPlacement, index: number) => {
    if (!item.id) {
      toast.error('Salve o item antes de alternar o status');
      return;
    }
    const nextActive = !item.isActive;
    setItems((prev) =>
      prev.map((row, i) => (i === index ? { ...row, isActive: nextActive } : row)),
    );
    try {
      const saved = await homeSectionsApi.patchItem(item.id, { isActive: nextActive });
      setItems((prev) => prev.map((row) => (row.id === saved.id ? { ...row, ...saved } : row)));
    } catch (error) {
      console.error('Erro ao alternar ativo:', error);
      setItems((prev) =>
        prev.map((row, i) => (i === index ? { ...row, isActive: item.isActive } : row)),
      );
      toast.error('Falha ao atualizar status');
    }
  };

  const openCreate = () => {
    setDrawerMode('create');
    setEditingItem(null);
    setDrawerOpen(true);
  };

  const openEdit = (item: HomeSectionPlacement) => {
    setDrawerMode('edit');
    setEditingItem(item);
    setDrawerOpen(true);
  };

  const handleSaved = (saved: HomeSectionPlacement) => {
    setItems((prev) => {
      const idx = prev.findIndex((row) => row.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...saved };
        return copy;
      }
      return [...prev, { ...saved, orderIndex: prev.length }];
    });
  };

  const handleSaveOrder = async () => {
    try {
      setSavingOrder(true);
      const saved = await homeSectionsApi.replaceSection(activeSection, items);
      setItems(saved);
      setOrderDirty(false);
      toast.success('Ordem salva');
    } catch (error) {
      console.error('Erro ao salvar ordem:', error);
      toast.error('Falha ao salvar ordem');
    } finally {
      setSavingOrder(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) {
      setDeleteTarget(null);
      return;
    }
    try {
      setDeleting(true);
      await homeSectionsApi.deleteItem(deleteTarget.id);
      setItems((prev) =>
        prev
          .filter((row) => row.id !== deleteTarget.id)
          .map((row, index) => ({ ...row, orderIndex: index })),
      );
      toast.success('Item excluído');
      setDeleteTarget(null);
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      toast.error('Falha ao excluir item');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="container mx-auto space-y-6 p-6" data-testid="home-sections-page">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <LayoutGrid className="h-8 w-8 text-cyan-600" />
              Home Sections
            </h1>
            <p className="mt-1 text-gray-600">
              Personalize as 4 faixas da landing www.reserveiviagens.com.br
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openCreate}
              data-testid="home-sections-add"
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-600 px-4 py-2 font-semibold text-cyan-700 hover:bg-cyan-50"
            >
              <Plus className="h-4 w-4" />
              Adicionar item
            </button>
            <button
              type="button"
              onClick={handleSaveOrder}
              disabled={savingOrder || loading || !orderDirty}
              data-testid="home-sections-save-order"
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {savingOrder ? 'Salvando…' : 'Salvar ordem'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
          {HOME_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              data-testid={`tab-${section.id}`}
              onClick={() => setActiveSection(section.id)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                activeSection === section.id
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>

        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-600">
            Editando: <strong>{sectionMeta.label}</strong> · destino padrão{' '}
            <code className="rounded bg-gray-100 px-1 text-xs">{sectionMeta.defaultPath}</code>
            {orderDirty ? (
              <span className="ml-2 text-amber-700">· ordem alterada (não salva)</span>
            ) : null}
          </div>

          {loading ? (
            <div className="py-10 text-center text-gray-500">Carregando…</div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-gray-500" data-testid="home-sections-empty">
              Nenhum item nesta seção. Clique em Adicionar item.
            </div>
          ) : (
            <ul className="space-y-2" data-testid="home-sections-list">
              {items.map((item, index) => {
                const cta =
                  item.ctaHref || defaultCtaFor(activeSection, item.entityType, item.entityId);
                return (
                  <li
                    key={item.id ?? `${item.entityType}-${item.entityId}-${index}`}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-200">
                      {item.imageUrl ? (
                        isVideoUrl(item.imageUrl) ? (
                          <video
                            src={item.imageUrl}
                            className="h-full w-full object-cover"
                            muted
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element -- admin thumb preview
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        )
                      ) : (
                        <ImageIcon className="h-5 w-5 text-slate-500" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-[200px] flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-gray-900">
                          {item.titleOverride || item.entityId}
                        </span>
                        {item.badgeText ? (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                            {item.badgeText}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.entityType} · {item.entityId}
                      </div>
                      {item.subtitleOverride ? (
                        <div className="mt-0.5 line-clamp-1 text-xs text-gray-600">
                          {item.subtitleOverride}
                        </div>
                      ) : null}
                      <div className="mt-1 break-all font-mono text-[11px] text-cyan-700">{cta}</div>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={item.isActive}
                        onChange={() => toggleActive(item, index)}
                      />
                      Ativo
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Mover para cima"
                        onClick={() => move(index, -1)}
                        className="rounded border border-gray-200 p-2 hover:bg-white"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Mover para baixo"
                        onClick={() => move(index, 1)}
                        className="rounded border border-gray-200 p-2 hover:bg-white"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Editar"
                        onClick={() => openEdit(item)}
                        className="rounded border border-gray-200 p-2 text-cyan-700 hover:bg-white"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Excluir"
                        onClick={() => setDeleteTarget(item)}
                        className="rounded border border-gray-200 p-2 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <HomeSectionSelector
            value={[activeSection]}
            onChange={(next) => {
              if (next[0]) setActiveSection(next[0]);
            }}
            label="Atalho rápido entre seções"
          />
        </div>
      </div>

      <HomeSectionItemDrawer
        open={drawerOpen}
        mode={drawerMode}
        section={activeSection}
        item={editingItem}
        onOpenChange={setDrawerOpen}
        onSaved={handleSaved}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent data-testid="home-sections-delete-dialog">
          <DialogHeader>
            <DialogTitle>Excluir este card da seção?</DialogTitle>
            <DialogDescription>
              Dica: você também pode apenas desativá-lo no switch Ativo, sem remover o registro.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={confirmDelete}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {deleting ? 'Excluindo…' : 'Excluir'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
