'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  ENTITY_ID_SUGGESTIONS,
  HOME_ENTITY_TYPES,
  HOME_SECTIONS,
  defaultCtaFor,
  isVideoUrl,
  type HomeEntityType,
  type HomeSectionId,
  type HomeSectionPlacement,
} from '../../lib/home-sections';
import { homeSectionsApi } from '../../services/homeSectionsApi';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';

export type HomeSectionItemDrawerProps = {
  open: boolean;
  mode: 'create' | 'edit';
  section: HomeSectionId;
  item?: HomeSectionPlacement | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (item: HomeSectionPlacement) => void;
};

type FormState = {
  entityType: HomeEntityType;
  entityId: string;
  titleOverride: string;
  subtitleOverride: string;
  badgeText: string;
  imageUrl: string;
  ctaHref: string;
  isActive: boolean;
};

type MediaTab = 'upload' | 'url';

const MAX_IMAGE_CLIENT = 15 * 1024 * 1024;
const MAX_VIDEO_CLIENT = 6 * 1024 * 1024;
const MAX_ANIM_CLIENT = 3 * 1024 * 1024;

function toForm(item: HomeSectionPlacement | null | undefined, section: HomeSectionId): FormState {
  return {
    entityType: item?.entityType ?? 'park',
    entityId: item?.entityId ?? '',
    titleOverride: item?.titleOverride ?? '',
    subtitleOverride: item?.subtitleOverride ?? '',
    badgeText: item?.badgeText ?? '',
    imageUrl: item?.imageUrl ?? '',
    ctaHref: item?.ctaHref ?? HOME_SECTIONS.find((s) => s.id === section)?.defaultPath ?? '',
    isActive: item?.isActive !== false,
  };
}

function sameForm(a: FormState, b: FormState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function clientSizeLimit(file: File): number {
  if (file.type.startsWith('video/')) return MAX_VIDEO_CLIENT;
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return MAX_ANIM_CLIENT;
  return MAX_IMAGE_CLIENT;
}

export function HomeSectionItemDrawer({
  open,
  mode,
  section,
  item,
  onOpenChange,
  onSaved,
}: HomeSectionItemDrawerProps) {
  const sectionMeta = useMemo(() => HOME_SECTIONS.find((s) => s.id === section)!, [section]);
  const [form, setForm] = useState<FormState>(() => toForm(item, section));
  const [baseline, setBaseline] = useState<FormState>(() => toForm(item, section));
  const [saving, setSaving] = useState(false);
  const [mediaTab, setMediaTab] = useState<MediaTab>('upload');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const next = toForm(item, section);
    setForm(next);
    setBaseline(next);
    setMediaTab(next.imageUrl ? 'url' : 'upload');
  }, [open, item, section]);

  const dirty = !sameForm(form, baseline);
  const suggestions = ENTITY_ID_SUGGESTIONS[form.entityType] ?? [];
  const mediaIsVideo = isVideoUrl(form.imageUrl);

  const previewTitle = form.titleOverride.trim() || form.entityId.trim() || 'Título do card';
  const previewSubtitle = form.subtitleOverride.trim() || 'Subtítulo opcional';
  const previewCta =
    form.ctaHref.trim() ||
    (form.entityId.trim()
      ? defaultCtaFor(section, form.entityType, form.entityId.trim())
      : sectionMeta.defaultPath);

  const requestClose = (nextOpen: boolean) => {
    if (!nextOpen && dirty) {
      const ok = window.confirm('Descartar alterações não salvas?');
      if (!ok) return;
    }
    onOpenChange(nextOpen);
  };

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    const limit = clientSizeLimit(file);
    if (file.size > limit) {
      toast.error(`Arquivo excede o limite (${Math.round(limit / (1024 * 1024))} MB)`);
      return;
    }
    try {
      setUploading(true);
      const slugHint =
        form.entityId.trim() ||
        form.titleOverride.trim() ||
        file.name.replace(/\.[^.]+$/, '');
      const result = await homeSectionsApi.uploadMedia(file, { section, slugHint });
      if (!result.url) {
        toast.error('Upload sem URL de retorno');
        return;
      }
      setForm((prev) => ({ ...prev, imageUrl: result.url }));
      toast.success('Mídia otimizada e pronta');
    } catch (error) {
      console.error('Erro upload home media:', error);
      const apiError = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(apiError || 'Falha no upload');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const entityId = form.entityId.trim();
    if (!entityId) {
      toast.error('Informe o Entity ID');
      return;
    }
    const payload = {
      entityType: form.entityType,
      entityId,
      titleOverride: form.titleOverride.trim() || null,
      subtitleOverride: form.subtitleOverride.trim() || null,
      badgeText: form.badgeText.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      ctaHref:
        form.ctaHref.trim() || defaultCtaFor(section, form.entityType, entityId),
      isActive: form.isActive,
    };

    try {
      setSaving(true);
      const saved =
        mode === 'edit' && item?.id
          ? await homeSectionsApi.patchItem(item.id, payload)
          : await homeSectionsApi.createItem(section, payload);
      setBaseline(toForm(saved, section));
      toast.success(mode === 'edit' ? 'Item atualizado' : 'Item criado');
      onSaved(saved);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar item home section:', error);
      const status = (error as { response?: { status?: number; data?: { error?: string } } })?.response
        ?.status;
      const apiError = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (status === 409) {
        toast.error(apiError || 'Item já existe nesta seção');
      } else {
        toast.error(apiError || 'Falha ao salvar item');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={requestClose}>
      <SheetContent className="overflow-y-auto" data-testid="home-section-item-drawer">
        <SheetHeader>
          <SheetTitle>{mode === 'edit' ? 'Editar item' : 'Novo item'}</SheetTitle>
          <SheetDescription>
            {sectionMeta.label} · personalize título, selo, mídia e CTA
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-6 py-4">
          <div
            className="relative overflow-hidden rounded-xl border border-gray-200 bg-slate-900 text-white"
            data-testid="home-section-item-preview"
          >
            <div className="relative h-28 overflow-hidden bg-slate-800">
              {form.imageUrl.trim() ? (
                mediaIsVideo ? (
                  <video
                    src={form.imageUrl.trim()}
                    className="h-full w-full object-cover"
                    muted
                    loop
                    autoPlay
                    playsInline
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- admin preview
                  <img
                    src={form.imageUrl.trim()}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )
              ) : (
                <div
                  className="h-full w-full"
                  style={{ background: 'linear-gradient(135deg, #0e7490, #164e63)' }}
                />
              )}
            </div>
            {form.badgeText.trim() ? (
              <span className="absolute left-3 top-3 rounded-md bg-amber-400 px-2 py-0.5 text-xs font-bold text-slate-900">
                {form.badgeText.trim()}
              </span>
            ) : null}
            <div className="space-y-1 p-3">
              <div className="text-base font-semibold">{previewTitle}</div>
              <div className="line-clamp-2 text-xs text-slate-300">{previewSubtitle}</div>
              <div className="pt-2">
                <span className="inline-flex rounded-md bg-cyan-500 px-3 py-1 text-xs font-semibold">
                  Ver oferta → {previewCta}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tipo</label>
              <select
                value={form.entityType}
                disabled={mode === 'edit'}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, entityType: e.target.value as HomeEntityType }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-100"
              >
                {HOME_ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Entity ID</label>
              <input
                list={`entity-suggestions-${form.entityType}`}
                value={form.entityId}
                disabled={mode === 'edit'}
                onChange={(e) => setForm((prev) => ({ ...prev, entityId: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-100"
                placeholder="ex.: hot-park"
                data-testid="drawer-entity-id"
              />
              <datalist id={`entity-suggestions-${form.entityType}`}>
                {suggestions.map((slug) => (
                  <option key={slug} value={slug} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Título</label>
            <input
              maxLength={255}
              value={form.titleOverride}
              onChange={(e) => setForm((prev) => ({ ...prev, titleOverride: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Subtítulo</label>
            <textarea
              maxLength={512}
              rows={2}
              value={form.subtitleOverride}
              onChange={(e) => setForm((prev) => ({ ...prev, subtitleOverride: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Badge</label>
            <input
              maxLength={64}
              value={form.badgeText}
              onChange={(e) => setForm((prev) => ({ ...prev, badgeText: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder='ex.: Mais procurado, Até 30% OFF'
            />
          </div>

          <div className="space-y-3 rounded-lg border border-gray-200 p-3" data-testid="drawer-media-block">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-gray-800">Mídia do card</span>
              {form.imageUrl ? (
                <button
                  type="button"
                  className="text-xs font-semibold text-red-600 hover:underline"
                  onClick={() => setForm((prev) => ({ ...prev, imageUrl: '' }))}
                >
                  Remover mídia
                </button>
              ) : null}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMediaTab('upload')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  mediaTab === 'upload' ? 'bg-cyan-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Enviar arquivo
              </button>
              <button
                type="button"
                onClick={() => setMediaTab('url')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  mediaTab === 'url' ? 'bg-cyan-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Colar link
              </button>
            </div>

            {mediaTab === 'upload' ? (
              <div className="space-y-2">
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center hover:bg-gray-100">
                  <span className="text-sm font-medium text-gray-700">
                    {uploading ? 'Otimizando e enviando mídia…' : 'Clique ou solte foto / vídeo curto'}
                  </span>
                  <span className="mt-1 text-[11px] text-gray-500">
                    Foto até 15 MB · MP4/WebM até 6 MB · GIF/SVG até 3 MB
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml,video/mp4,video/webm"
                    disabled={uploading}
                    data-testid="drawer-media-file"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      void handleUpload(file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            ) : (
              <input
                maxLength={1024}
                value={form.imageUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
                placeholder="/uploads/... ou https://..."
                data-testid="drawer-media-url"
              />
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">CTA href</label>
            <input
              maxLength={512}
              value={form.ctaHref}
              onChange={(e) => setForm((prev) => ({ ...prev, ctaHref: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
              placeholder={sectionMeta.defaultPath}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
            />
            Ativo na landing
          </label>
        </div>

        <SheetFooter>
          <button
            type="button"
            onClick={() => requestClose(false)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving || uploading}
            onClick={handleSave}
            data-testid="drawer-save"
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
          >
            {saving ? 'Salvando…' : mode === 'edit' ? 'Salvar alterações' : 'Criar item'}
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
