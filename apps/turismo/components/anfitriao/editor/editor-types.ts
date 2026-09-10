export type EditorTab = 'seu-espaco' | 'guia-chegada' | 'preferencias';

export type SeuEspacoSection =
  | 'fotos'
  | 'titulo'
  | 'tipo'
  | 'camas'
  | 'precos'
  | 'descontos'
  | 'disponibilidade'
  | 'hospedes'
  | 'descricao'
  | 'comodidades'
  | 'acessibilidade'
  | 'localizacao'
  | 'verificacao'
  | 'sobre-anfitriao'
  | 'coanfitrioes'
  | 'config-reserva'
  | 'regras'
  | 'seguranca'
  | 'cancelamento'
  | 'link-personalizado';

export type GuiaSection =
  | 'checkin-checkout'
  | 'como-chegar'
  | 'metodo-checkin'
  | 'wifi'
  | 'guia-casa'
  | 'regras-guia'
  | 'checkout-instrucoes'
  | 'guias-locais'
  | 'interacao';

export type PreferenciasSection =
  | 'status'
  | 'idiomas'
  | 'requisitos'
  | 'leis'
  | 'impostos'
  | 'solidaria'
  | 'remover';

export type EditorSection = SeuEspacoSection | GuiaSection | PreferenciasSection;

export type ListingEditorUnidade = {
  id: number;
  titulo?: string;
  precoDiaria?: string | number | null;
  precoFimSemana?: string | number | null;
  capacidadeMax?: number | null;
  capacidadeBase?: number | null;
  statusPublicacao?: string;
  amenidades?: unknown;
  utensilios?: unknown;
  midia?: unknown;
  eletrodomesticos?: unknown;
  metadata?: unknown;
  minNoites?: number | null;
  maxNoites?: number | null;
  descontoSemanalPct?: string | number | null;
  descontoMensalPct?: string | number | null;
  politicaCancelamentoCurta?: string | null;
  politicaCancelamentoLonga?: string | null;
  opcaoNaoReembolsavel?: boolean | null;
  precoInteligenteAtivo?: boolean | null;
  quartos?: number | null;
};

export type EditorMeta = {
  nomeInterno?: string;
  descricaoDetalhada?: {
    anuncio?: string;
    suaPropriedade?: string;
    acessoHospede?: string;
    interacaoHospedes?: string;
    outrasInformacoes?: string;
  };
  tiposCama?: Record<string, number>;
  tipoPropriedade?: {
    representacao?: string;
    tipo?: string;
    acomodacao?: string;
    andares?: number;
    andar?: number;
    ano?: number;
    tamanhoM2?: number;
  };
  modoReserva?: 'instantanea' | 'aprovar';
  exigirBomHistorico?: boolean;
  mensagemPreReserva?: string;
  regrasCasa?: {
    pets?: boolean;
    eventos?: boolean;
    fumar?: boolean;
    silencio?: boolean;
    silencioInicio?: string;
    silencioFim?: string;
    filmagem?: boolean;
    checkInDe?: string;
    checkInAte?: string;
    checkOutAte?: string;
    regrasAdicionais?: string;
  };
  seguranca?: {
    consideracoes?: Record<string, boolean>;
    dispositivos?: Record<string, { ativo: boolean; detalhes?: string }>;
    infoPropriedade?: Record<string, boolean>;
    recomendacoesEspeciais?: string;
  };
  acessibilidade?: Array<{
    id: string;
    possui: boolean | null;
    fotos: Array<string | { url: string; status?: string; enviadoEm?: string; publicadoEm?: string }>;
  }>;
  localizacao?: {
    endereco?: string;
    apto?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    cep?: string;
    mostrarExata?: boolean;
    caracteristicas?: string[];
    descricaoBairro?: string;
    locomocao?: string;
    vistas?: string[];
  };
  guiaChegada?: {
    comoChegar?: string;
    metodoCheckIn?: string;
    metodoCheckInDetalhe?: string;
    instrucoesCheckIn?: string;
    wifiRede?: string;
    wifiSenha?: string;
    guiaCasa?: string;
    instrucoesCheckout?: Array<{ id: string; titulo: string; texto: string }>;
    preferenciaInteracao?: string;
  };
  verificacaoLocal?: {
    metodo?: 'app' | 'terceiro' | 'videos' | null;
    status?: 'pendente' | 'enviado' | 'aprovado' | 'rejeitado';
    codigo?: string;
    evidencias?: Array<{ url: string; tipo: 'foto' | 'video'; enviadoEm?: string }>;
    notas?: string;
    enviadoEm?: string;
    revisadoEm?: string;
  };
  slugPersonalizado?: string;
  statusAnuncio?: 'anunciado' | 'nao_anunciado';
  exigirFotoPerfil?: boolean;
  idiomas?: string[];
  hospedagemSolidaria?: boolean;
};

export function readMeta(unidade: ListingEditorUnidade): EditorMeta {
  const raw = unidade.metadata;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as EditorMeta;
  }
  return {};
}

/** Resolve editor tab from a section id (Desempenho deep-link). */
export function tabForSection(section: EditorSection): EditorTab {
  if (GUIA_CARDS.some((c) => c.id === section)) return 'guia-chegada';
  if (PREF_CARDS.some((c) => c.id === section)) return 'preferencias';
  return 'seu-espaco';
}

export function isEditorSection(value: string): value is EditorSection {
  const all = [...SEU_ESPACO_CARDS, ...GUIA_CARDS, ...PREF_CARDS].map((c) => c.id);
  return all.includes(value as EditorSection);
}

export const SEU_ESPACO_CARDS: Array<{ id: SeuEspacoSection; title: string }> = [
  { id: 'fotos', title: 'Tour por fotos' },
  { id: 'titulo', title: 'Título' },
  { id: 'tipo', title: 'Tipo de propriedade' },
  { id: 'camas', title: 'Tipos de cama' },
  { id: 'precos', title: 'Preços' },
  { id: 'descontos', title: 'Descontos' },
  { id: 'disponibilidade', title: 'Disponibilidade' },
  { id: 'hospedes', title: 'Número de hóspedes' },
  { id: 'descricao', title: 'Descrição' },
  { id: 'comodidades', title: 'Comodidades' },
  { id: 'acessibilidade', title: 'Recursos de acessibilidade' },
  { id: 'localizacao', title: 'Localização' },
  { id: 'verificacao', title: 'Verificar localização' },
  { id: 'sobre-anfitriao', title: 'Sobre o anfitrião' },
  { id: 'coanfitrioes', title: 'Coanfitriões' },
  { id: 'config-reserva', title: 'Configurações de reserva' },
  { id: 'regras', title: 'Regras da Casa' },
  { id: 'seguranca', title: 'Segurança do hóspede' },
  { id: 'cancelamento', title: 'Política de cancelamento' },
  { id: 'link-personalizado', title: 'Link personalizado' },
];

export const GUIA_CARDS: Array<{ id: GuiaSection; title: string }> = [
  { id: 'checkin-checkout', title: 'Check-in e checkout' },
  { id: 'como-chegar', title: 'Como chegar' },
  { id: 'metodo-checkin', title: 'Método de check-in' },
  { id: 'wifi', title: 'Informações do Wi-Fi' },
  { id: 'guia-casa', title: 'Guia da Casa' },
  { id: 'regras-guia', title: 'Regras da Casa' },
  { id: 'checkout-instrucoes', title: 'Instruções de checkout' },
  { id: 'guias-locais', title: 'Guias' },
  { id: 'interacao', title: 'Preferências de interação' },
];

export const PREF_CARDS: Array<{ id: PreferenciasSection; title: string }> = [
  { id: 'status', title: 'Status do anúncio' },
  { id: 'idiomas', title: 'Idiomas' },
  { id: 'requisitos', title: 'Requisitos do hóspede' },
  { id: 'leis', title: 'Leis locais' },
  { id: 'impostos', title: 'Impostos' },
  { id: 'solidaria', title: 'Hospedagem solidária' },
  { id: 'remover', title: 'Remover anúncio' },
];

/** @deprecated Prefer TiposCamaEditor / CAMA_CATALOG ids; kept for label reference. */
export const CAMA_TIPOS = [
  'Solteiro',
  'Casal',
  'Queen',
  'King',
  'Viúva',
  'Beliche',
  'Sofá-cama',
  'Sofá',
  'Colchão no chão',
  'Colchão de ar',
  'Berço',
  'Cama infantil',
  'Rede',
  'Colchão de água',
] as const;

export const AMENITY_CATALOG = [
  { id: 'wifi', label: 'Wi-Fi', desc: 'Internet sem fio disponível' },
  { id: 'ar', label: 'Ar-condicionado', desc: 'Climatização no espaço' },
  { id: 'tv', label: 'TV', desc: 'Televisão para entretenimento' },
  { id: 'cozinha', label: 'Cozinha', desc: 'Espaço para preparar refeições' },
  { id: 'estacionamento', label: 'Estacionamento gratuito', desc: 'Vaga no local' },
  { id: 'piscina', label: 'Piscina', desc: 'Área de lazer aquática' },
  { id: 'academia', label: 'Academia', desc: 'Equipamentos de exercício' },
  { id: 'aquecedor', label: 'Aquecedor', desc: 'Aquecimento disponível' },
  { id: 'secador', label: 'Secador de cabelo', desc: 'Secador no banheiro' },
  { id: 'basicos', label: 'Itens básicos', desc: 'Toalhas, lençóis e sabonete' },
] as const;
