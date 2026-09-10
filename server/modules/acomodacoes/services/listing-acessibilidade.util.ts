/**
 * Accessibility resources (metadata.acessibilidade) — catalog + validation.
 */

import {
  normalizeAcessibilidadeFotos,
  type AcessibilidadeFoto,
  type AcessibilidadeItemPersisted,
} from './acessibilidade-fotos.util';

export const ACESSIBILIDADE_CATALOG = [
  {
    id: 'vaga-pcd',
    label: 'Vaga no estacionamento para pessoas com deficiência',
    icon: '🅿️',
    hint: 'Vaga com largura adequada e sinalização.',
    criterio:
      'A vaga deve ter pelo menos 3,35 m de largura (incluindo área de transferência) e sinalização visível.',
    oQueFotografar:
      'Fotografe a vaga inteira, a sinalização no chão/placa e o caminho até a entrada.',
    exemplos: ['Largura total da vaga', 'Placa ou pintura PCD', 'Acesso nível à entrada'],
  },
  {
    id: 'caminho-iluminado',
    label: 'Caminho iluminado até a entrada dos hóspedes',
    icon: '💡',
    hint: 'Iluminação contínua do estacionamento até a porta.',
    criterio:
      'O caminho deve estar bem iluminado à noite, sem trechos escuros entre o estacionamento/rua e a entrada.',
    oQueFotografar: 'Mostre o trajeto com as luminárias acesas (preferencialmente à noite).',
    exemplos: ['Início do caminho', 'Meio do trajeto iluminado', 'Chegada na porta'],
  },
  {
    id: 'sem-degraus',
    label: 'Acesso sem degraus',
    icon: '♿',
    hint: 'Entrada sem degraus ou com rampa.',
    criterio:
      'Entrada acessível sem degraus, ou com rampa com inclinação adequada para cadeira de rodas.',
    oQueFotografar: 'Fotografe a entrada de frente e de lado, mostrando o piso contínuo ou a rampa.',
    exemplos: ['Vista frontal da entrada', 'Piso contínuo / rampa', 'Largura do vão'],
  },
  {
    id: 'entrada-larga',
    label: 'Entrada para os hóspedes possui mais de 81 cm de largura',
    icon: '🚪',
    hint: 'Vão livre da porta de entrada.',
    criterio: 'O vão livre da porta de entrada dos hóspedes deve ter mais de 81 cm de largura.',
    oQueFotografar: 'Fotografe a porta aberta com uma fita métrica visível na largura do vão.',
    exemplos: ['Porta aberta', 'Medição do vão', 'Acesso do corredor'],
  },
  {
    id: 'guincho-piscina',
    label: 'Guincho para piscina ou banheira de hidromassagem',
    icon: '🏊',
    hint: 'Equipamento de transferência aquática.',
    criterio:
      'Guincho ou equipamento equivalente que permita transferência segura para piscina ou hidromassagem.',
    oQueFotografar: 'Mostre o equipamento instalado e a área de transferência na água.',
    exemplos: ['Guincho instalado', 'Área de transferência', 'Acesso à beira d’água'],
  },
  {
    id: 'guincho-transferencia',
    label: 'Guincho de transferência móvel ou fixado no teto',
    icon: '🛏️',
    hint: 'Ajuda na transferência cama/banho.',
    criterio:
      'Guincho móvel ou de teto disponível para transferência entre cama, cadeira e banheiro.',
    oQueFotografar: 'Fotografe o guincho e o ambiente onde ele é usado (quarto/banho).',
    exemplos: ['Equipamento', 'Trilho ou base', 'Espaço de manobra'],
  },
] as const;

export type AcessibilidadeCatalogId = (typeof ACESSIBILIDADE_CATALOG)[number]['id'];

export const ACESSIBILIDADE_IDS: ReadonlySet<string> = new Set(
  ACESSIBILIDADE_CATALOG.map((c) => c.id),
);

export type AcessibilidadeValidationOk = {
  ok: true;
  value: AcessibilidadeItemPersisted[];
};
export type AcessibilidadeValidationErr = {
  ok: false;
  error: 'acessibilidade_invalida';
  message: string;
};

/**
 * Validate + normalize metadata.acessibilidade.
 * Rule: possui === true requires at least one photo (any review status).
 */
export function validateListingAcessibilidade(
  raw: unknown,
): AcessibilidadeValidationOk | AcessibilidadeValidationErr {
  if (raw == null) {
    return { ok: true, value: [] };
  }
  if (!Array.isArray(raw)) {
    return {
      ok: false,
      error: 'acessibilidade_invalida',
      message: 'Recursos de acessibilidade devem ser uma lista',
    };
  }

  const byId = new Map<string, AcessibilidadeItemPersisted>();

  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return {
        ok: false,
        error: 'acessibilidade_invalida',
        message: 'Item de acessibilidade inválido',
      };
    }
    const row = item as Record<string, unknown>;
    const id = typeof row.id === 'string' ? row.id.trim() : '';
    if (!id || !ACESSIBILIDADE_IDS.has(id)) {
      return {
        ok: false,
        error: 'acessibilidade_invalida',
        message: `Recurso de acessibilidade desconhecido: ${id || '(vazio)'}`,
      };
    }
    let possui: boolean | null = null;
    if (row.possui === true) possui = true;
    else if (row.possui === false) possui = false;
    else if (row.possui != null) {
      return {
        ok: false,
        error: 'acessibilidade_invalida',
        message: 'Campo possui deve ser true, false ou null',
      };
    }

    const fotos = normalizeAcessibilidadeFotos(row.fotos);
    if (possui === true && fotos.length === 0) {
      return {
        ok: false,
        error: 'acessibilidade_invalida',
        message:
          'Recursos marcados como “tenho” precisam de pelo menos uma foto antes de salvar',
      };
    }
    if (possui === false) {
      byId.set(id, { id, possui: false, fotos: [] });
    } else {
      byId.set(id, { id, possui, fotos });
    }
  }

  const value: AcessibilidadeItemPersisted[] = ACESSIBILIDADE_CATALOG.map((c) => {
    return byId.get(c.id) ?? { id: c.id, possui: null, fotos: [] as AcessibilidadeFoto[] };
  }).filter((i) => i.possui != null || i.fotos.length > 0);

  return { ok: true, value };
}

/** Card summary — prioritize obligatory photo alert. */
export function summarizeAcessibilidade(
  items: Array<{ id: string; possui: boolean | null; fotos?: AcessibilidadeFoto[] }>,
): string {
  const missingPhotos = items.filter(
    (i) => i.possui === true && (!i.fotos || i.fotos.length === 0),
  ).length;
  if (missingPhotos > 0) {
    return 'Obrigatório: adicione novas fotos';
  }
  const waiting = items.reduce((n, i) => {
    const fotos = i.fotos ?? [];
    return (
      n + fotos.filter((f) => f.status === 'pendente' || f.status === 'em_revisao').length
    );
  }, 0);
  if (waiting > 0) return `${waiting} foto(s) em revisão`;
  const pub = items.reduce(
    (n, i) => n + (i.fotos ?? []).filter((f) => f.status === 'publicado').length,
    0,
  );
  if (pub > 0) return `${pub} foto(s) publicadas`;
  const informed = items.filter((i) => i.possui != null).length;
  return informed > 0 ? `${informed} recurso(s) informados` : 'Adicionar informações';
}
