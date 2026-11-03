import { api } from './apiClient';
import type { HomeSectionId, HomeSectionPlacement } from '../lib/home-sections';

type ListResponse = {
  success: boolean;
  data?: HomeSectionPlacement[];
  error?: string;
};

export type HomeSectionItemCreate = {
  entityType: HomeSectionPlacement['entityType'];
  entityId: string;
  titleOverride?: string | null;
  subtitleOverride?: string | null;
  badgeText?: string | null;
  imageUrl?: string | null;
  ctaHref?: string | null;
  isActive?: boolean;
};

export type HomeSectionItemPatch = Partial<HomeSectionItemCreate> & {
  orderIndex?: number;
};

function toPayload(item: HomeSectionPlacement | HomeSectionItemCreate, index?: number) {
  return {
    entityType: item.entityType,
    entityId: item.entityId,
    titleOverride: item.titleOverride ?? null,
    subtitleOverride: item.subtitleOverride ?? null,
    badgeText: item.badgeText ?? null,
    imageUrl: item.imageUrl ?? null,
    ctaHref: item.ctaHref ?? null,
    orderIndex: 'orderIndex' in item && item.orderIndex != null ? item.orderIndex : index,
    isActive: item.isActive !== false,
  };
}

export const homeSectionsApi = {
  async listAdmin(section: HomeSectionId): Promise<HomeSectionPlacement[]> {
    const res = await api.get<HomeSectionPlacement[]>(`/api/v1/home/admin/sections/${section}`);
    return (res.data as HomeSectionPlacement[]) ?? [];
  },

  async replaceSection(section: HomeSectionId, items: HomeSectionPlacement[]): Promise<HomeSectionPlacement[]> {
    const res = await api.put<HomeSectionPlacement[]>(`/api/v1/home/admin/sections/${section}`, {
      items: items.map((item, index) => toPayload(item, index)),
    });
    return (res.data as HomeSectionPlacement[]) ?? [];
  },

  async createItem(section: HomeSectionId, item: HomeSectionItemCreate): Promise<HomeSectionPlacement> {
    const res = await api.post<HomeSectionPlacement>(
      `/api/v1/home/admin/sections/${section}/items`,
      toPayload(item),
    );
    return res.data as HomeSectionPlacement;
  },

  async patchItem(id: number, patch: HomeSectionItemPatch): Promise<HomeSectionPlacement> {
    const res = await api.patch<HomeSectionPlacement>(`/api/v1/home/admin/items/${id}`, patch);
    return res.data as HomeSectionPlacement;
  },

  async deleteItem(id: number): Promise<void> {
    await api.delete(`/api/v1/home/admin/items/${id}`);
  },

  async uploadMedia(
    file: File,
    opts?: { section?: HomeSectionId; slugHint?: string },
  ): Promise<{
    url: string;
    relativeUrl?: string;
    mediaType?: string;
    contentType?: string;
    sizeBytes?: number;
    width?: number | null;
    height?: number | null;
  }> {
    const form = new FormData();
    form.append('file', file);
    if (opts?.section) form.append('section', opts.section);
    if (opts?.slugHint) form.append('slugHint', opts.slugHint);
    const res = await api.upload<{
      url: string;
      relativeUrl?: string;
      mediaType?: string;
      contentType?: string;
      sizeBytes?: number;
      width?: number | null;
      height?: number | null;
    }>('/api/v1/home/admin/upload', form);
    return (res.data as {
      url: string;
      relativeUrl?: string;
      mediaType?: string;
      contentType?: string;
      sizeBytes?: number;
      width?: number | null;
      height?: number | null;
    }) ?? { url: '' };
  },

  async listPublic(section: HomeSectionId): Promise<HomeSectionPlacement[]> {
    const res = (await api.get(`/api/v1/home/sections/${section}`)) as ListResponse;
    return res.data ?? [];
  },
};
