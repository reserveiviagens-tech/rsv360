import {
  HOME_SECTIONS,
  defaultCtaFor,
  type HomeEntityType,
  type HomeSectionId,
  type HomeSectionPlacement,
} from '../lib/home-sections';
import { homeSectionsApi } from './homeSectionsApi';

/**
 * Garante que a entidade esteja presente exatamente nas seções marcadas
 * (multi-escolha). Não remove outros itens da seção.
 */
export async function syncEntityHomeSections(opts: {
  entityType: HomeEntityType;
  entityId: string;
  sections: HomeSectionId[];
  titleOverride?: string | null;
}): Promise<void> {
  const { entityType, entityId, sections, titleOverride } = opts;
  const selected = new Set(sections);

  await Promise.all(
    HOME_SECTIONS.map(async (section) => {
      const current = await homeSectionsApi.listAdmin(section.id);
      const without = current.filter(
        (row) => !(row.entityType === entityType && row.entityId === entityId),
      );
      const existing = current.find(
        (row) => row.entityType === entityType && row.entityId === entityId,
      );
      const next: HomeSectionPlacement[] = selected.has(section.id)
        ? [
            ...without,
            {
              entityType,
              entityId,
              titleOverride: titleOverride ?? existing?.titleOverride ?? null,
              subtitleOverride: existing?.subtitleOverride ?? null,
              badgeText: existing?.badgeText ?? null,
              imageUrl: existing?.imageUrl ?? null,
              ctaHref: existing?.ctaHref ?? defaultCtaFor(section.id, entityType, entityId),
              orderIndex: without.length,
              isActive: existing?.isActive !== false,
            },
          ]
        : without;

      const changed =
        current.length !== next.length ||
        selected.has(section.id) !==
          current.some((r) => r.entityType === entityType && r.entityId === entityId);

      if (changed) {
        await homeSectionsApi.replaceSection(
          section.id,
          next.map((item, index) => ({ ...item, orderIndex: index })),
        );
      }
    }),
  );
}

export async function loadEntityHomeSections(
  entityType: HomeEntityType,
  entityId: string,
): Promise<HomeSectionId[]> {
  const found: HomeSectionId[] = [];
  await Promise.all(
    HOME_SECTIONS.map(async (section) => {
      const rows = await homeSectionsApi.listAdmin(section.id);
      if (rows.some((r) => r.entityType === entityType && r.entityId === entityId && r.isActive !== false)) {
        found.push(section.id);
      }
    }),
  );
  return found;
}
