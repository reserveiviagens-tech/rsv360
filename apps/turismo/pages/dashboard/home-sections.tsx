'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '../../src/components/ProtectedRoute';
import {
  LayoutGrid,
  Plus,
  Save,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  HOME_SECTIONS,
  type HomeSectionId,
  type HomeSectionPlacement,
} from '../../src/lib/home-sections';
import { homeSectionsApi } from '../../src/services/homeSectionsApi';
import { HomeSectionSelector } from '../../src/components/home/HomeSectionSelector';
import { HomeSectionItemDrawer } from '../../src/components/home/HomeSectionItemDrawer';
import { HomeSectionStatCards } from '../../src/components/home/HomeSectionStatCards';
import { HomeSectionControlCard } from '../../src/components/home/HomeSectionControlCard';
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
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);

  const sectionMeta = useMemo(
    () => HOME_SECTIONS.find((s) => s.id === activeSection)!,
    [activeSection],
  );

  const bumpStats = () => setStatsRefreshKey((k) => k + 1);

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
      bumpStats();
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
    bumpStats();
  };

  const handleSaveOrder = async () => {
    try {
      setSavingOrder(true);
      const saved = await homeSectionsApi.replaceSection(activeSection, items);
      setItems(saved);
      setOrderDirty(false);
      toast.success('Ordem salva');
      bumpStats();
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
      bumpStats();
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
            <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900">
              <LayoutGrid className="h-8 w-8 text-blue-600" />
              Home Sections
            </h1>
            <p className="mt-1 text-slate-600">
              Control Center V13 — saúde e edição das faixas da landing www.reserveiviagens.com.br
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openCreate}
              data-testid="home-sections-add"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-blue-600 px-4 py-2 font-semibold text-blue-700 hover:bg-blue-50"
            >
              <Plus className="h-4 w-4" />
              Adicionar item
            </button>
            <button
              type="button"
              onClick={handleSaveOrder}
              disabled={savingOrder || loading || !orderDirty}
              data-testid="home-sections-save-order"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {savingOrder ? 'Salvando…' : 'Salvar ordem'}
            </button>
          </div>
        </div>

        {/* PHASE_4 — StatCards V13 */}
        <HomeSectionStatCards
          activeSection={activeSection}
          onSelectSection={setActiveSection}
          refreshKey={statsRefreshKey}
        />

        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {HOME_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              data-testid={`tab-${section.id}`}
              onClick={() => setActiveSection(section.id)}
              className={`min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                activeSection === section.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="text-sm text-slate-600">
            Editando: <strong className="text-slate-900">{sectionMeta.label}</strong> · destino padrão{' '}
            <code className="rounded bg-slate-100 px-1 text-xs">{sectionMeta.defaultPath}</code>
            {orderDirty ? (
              <span className="ml-2 text-amber-700">· ordem alterada (não salva)</span>
            ) : null}
          </div>

          {loading ? (
            <div className="py-10 text-center text-slate-500">Carregando…</div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-slate-500" data-testid="home-sections-empty">
              Nenhum item nesta seção. Clique em Adicionar item.
            </div>
          ) : (
            <ul
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
              data-testid="home-sections-list"
            >
              {items.map((item, index) => (
                <HomeSectionControlCard
                  key={item.id ?? `${item.entityType}-${item.entityId}-${index}`}
                  item={item}
                  index={index}
                  section={activeSection}
                  total={items.length}
                  onToggleActive={() => toggleActive(item, index)}
                  onMoveUp={() => move(index, -1)}
                  onMoveDown={() => move(index, 1)}
                  onEdit={() => openEdit(item)}
                  onDelete={() => setDeleteTarget(item)}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
              Dica: você também pode apenas desativá-lo no botão Ativo/Inativo, sem remover o registro.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="min-h-[44px] rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={confirmDelete}
              data-testid="home-sections-confirm-delete"
              className="min-h-[44px] rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {deleting ? 'Excluindo…' : 'Excluir'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
