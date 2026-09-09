/**
 * Static Brazilian holiday catalog (national helpers live in calendario-contexto.util).
 * State + capital municipal holidays use MM-DD (applied every year).
 *
 * Scope: all 27 UFs + 27 capitals + Caldas Novas (GO) — Reservei Viagens primary market.
 * Full 5.570 municipalities require paid/official feeds; not bundled here.
 */

export type FeriadoTipo = 'nacional' | 'estadual' | 'municipal';

export type FeriadoFixo = {
  /** MM-DD */
  md: string;
  nome: string;
  tipo: FeriadoTipo;
  uf?: string;
  municipio?: string;
};

/** Fixed state holidays (recurring yearly). */
export const FERIADOS_ESTADUAIS: FeriadoFixo[] = [
  { md: '01-23', nome: 'Dia do Evangélico', tipo: 'estadual', uf: 'AC' },
  { md: '06-15', nome: 'Aniversário do Acre', tipo: 'estadual', uf: 'AC' },
  { md: '09-05', nome: 'Dia da Amazônia', tipo: 'estadual', uf: 'AC' },
  { md: '11-17', nome: 'Assinatura do Tratado de Petrópolis', tipo: 'estadual', uf: 'AC' },

  { md: '06-24', nome: 'São João', tipo: 'estadual', uf: 'AL' },
  { md: '09-16', nome: 'Emancipação Política de Alagoas', tipo: 'estadual', uf: 'AL' },
  { md: '11-20', nome: 'Morte de Zumbi dos Palmares', tipo: 'estadual', uf: 'AL' },

  { md: '09-05', nome: 'Elevação do Amazonas à categoria de província', tipo: 'estadual', uf: 'AM' },
  { md: '12-08', nome: 'Nossa Senhora da Conceição', tipo: 'estadual', uf: 'AM' },

  { md: '03-19', nome: 'Dia de São José', tipo: 'estadual', uf: 'AP' },
  { md: '09-13', nome: 'Criação do Território Federal', tipo: 'estadual', uf: 'AP' },
  { md: '10-05', nome: 'Criação do Estado do Amapá', tipo: 'estadual', uf: 'AP' },

  { md: '07-02', nome: 'Independência da Bahia', tipo: 'estadual', uf: 'BA' },

  { md: '03-25', nome: 'Data Magna do Ceará', tipo: 'estadual', uf: 'CE' },

  { md: '04-21', nome: 'Fundação de Brasília', tipo: 'estadual', uf: 'DF' },
  { md: '11-30', nome: 'Dia do Evangélico', tipo: 'estadual', uf: 'DF' },

  { md: '05-23', nome: 'Colonização do Solo Espírito-santense', tipo: 'estadual', uf: 'ES' },

  { md: '07-26', nome: 'Fundação de Goiás', tipo: 'estadual', uf: 'GO' },
  { md: '10-24', nome: 'Pedra Fundamental de Goiânia', tipo: 'estadual', uf: 'GO' },

  { md: '07-28', nome: 'Adesão do Maranhão à Independência', tipo: 'estadual', uf: 'MA' },
  { md: '11-08', nome: 'Criação da Província do Maranhão', tipo: 'estadual', uf: 'MA' },

  { md: '04-21', nome: 'Data Magna de Minas Gerais', tipo: 'estadual', uf: 'MG' },

  { md: '10-11', nome: 'Criação do Estado de Mato Grosso do Sul', tipo: 'estadual', uf: 'MS' },

  { md: '11-20', nome: 'Consciência Negra (MT)', tipo: 'estadual', uf: 'MT' },

  { md: '08-05', nome: 'Fundação da Província do Pará', tipo: 'estadual', uf: 'PA' },
  { md: '12-08', nome: 'Nossa Senhora da Conceição', tipo: 'estadual', uf: 'PA' },

  { md: '07-26', nome: 'Homenagem a João Pessoa', tipo: 'estadual', uf: 'PB' },
  { md: '08-05', nome: 'Fundação do Estado da Paraíba', tipo: 'estadual', uf: 'PB' },

  { md: '03-06', nome: 'Revolução Pernambucana', tipo: 'estadual', uf: 'PE' },
  { md: '06-24', nome: 'São João', tipo: 'estadual', uf: 'PE' },

  { md: '10-19', nome: 'Dia do Piauí', tipo: 'estadual', uf: 'PI' },

  { md: '01-09', nome: 'Dia do Cristo de São Sebastião', tipo: 'estadual', uf: 'RJ' },
  { md: '04-23', nome: 'Dia de São Jorge', tipo: 'estadual', uf: 'RJ' },
  { md: '11-20', nome: 'Consciência Negra (RJ)', tipo: 'estadual', uf: 'RJ' },

  { md: '06-29', nome: 'Dia de São Pedro', tipo: 'estadual', uf: 'RN' },
  { md: '10-03', nome: 'Mártires de Cunhaú e Uruaçu', tipo: 'estadual', uf: 'RN' },

  { md: '01-04', nome: 'Criação do Estado de Rondônia', tipo: 'estadual', uf: 'RO' },
  { md: '06-18', nome: 'Dia do Evangélico', tipo: 'estadual', uf: 'RO' },

  { md: '10-05', nome: 'Criação do Estado de Roraima', tipo: 'estadual', uf: 'RR' },

  { md: '09-20', nome: 'Revolução Farroupilha', tipo: 'estadual', uf: 'RS' },

  { md: '08-11', nome: 'Criação da Capitania de Santa Catarina', tipo: 'estadual', uf: 'SC' },
  { md: '11-25', nome: 'Dia de Santa Catarina de Alexandria', tipo: 'estadual', uf: 'SC' },

  { md: '07-08', nome: 'Dia da Emancipação do Estado', tipo: 'estadual', uf: 'SE' },
  { md: '07-09', nome: 'Dia da Revolução Constitucionalista', tipo: 'estadual', uf: 'SP' },
  { md: '08-15', nome: 'Nossa Senhora da Boa Esperança', tipo: 'estadual', uf: 'SE' },

  { md: '10-05', nome: 'Criação do Estado do Tocantins', tipo: 'estadual', uf: 'TO' },
  { md: '03-18', nome: 'Autonomia do Tocantins', tipo: 'estadual', uf: 'TO' },
];

/** Capital (and key tourism) municipal patron / foundation days. */
export const FERIADOS_MUNICIPAIS_CAPITAIS: FeriadoFixo[] = [
  { md: '01-20', nome: 'Dia de São Sebastião', tipo: 'municipal', uf: 'RJ', municipio: 'Rio de Janeiro' },
  { md: '01-25', nome: 'Aniversário de São Paulo', tipo: 'municipal', uf: 'SP', municipio: 'São Paulo' },
  { md: '02-02', nome: 'Nossa Senhora dos Navegantes', tipo: 'municipal', uf: 'RS', municipio: 'Porto Alegre' },
  { md: '04-21', nome: 'Aniversário de Brasília', tipo: 'municipal', uf: 'DF', municipio: 'Brasília' },
  { md: '04-26', nome: 'Aniversário de Florianópolis', tipo: 'municipal', uf: 'SC', municipio: 'Florianópolis' },
  { md: '05-08', nome: 'Aniversário de Campo Grande', tipo: 'municipal', uf: 'MS', municipio: 'Campo Grande' },
  { md: '06-24', nome: 'São João (capital)', tipo: 'municipal', uf: 'PE', municipio: 'Recife' },
  { md: '06-29', nome: 'São Pedro', tipo: 'municipal', uf: 'RN', municipio: 'Natal' },
  { md: '07-02', nome: 'Independência da Bahia (capital)', tipo: 'municipal', uf: 'BA', municipio: 'Salvador' },
  { md: '07-15', nome: 'Aniversário de Cuiabá', tipo: 'municipal', uf: 'MT', municipio: 'Cuiabá' },
  { md: '07-26', nome: 'Aniversário de Goiânia', tipo: 'municipal', uf: 'GO', municipio: 'Goiânia' },
  { md: '08-05', nome: 'Aniversário de João Pessoa', tipo: 'municipal', uf: 'PB', municipio: 'João Pessoa' },
  { md: '08-15', nome: 'Nossa Senhora da Conceição / padroeira', tipo: 'municipal', uf: 'MG', municipio: 'Belo Horizonte' },
  { md: '09-08', nome: 'Nossa Senhora da Vitória', tipo: 'municipal', uf: 'ES', municipio: 'Vitória' },
  { md: '09-15', nome: 'Aniversário de Curitiba', tipo: 'municipal', uf: 'PR', municipio: 'Curitiba' },
  { md: '10-05', nome: 'Aniversário de Palmas', tipo: 'municipal', uf: 'TO', municipio: 'Palmas' },
  { md: '10-12', nome: 'Padroeira (capital)', tipo: 'municipal', uf: 'CE', municipio: 'Fortaleza' },
  { md: '11-21', nome: 'Nossa Senhora da Apresentação', tipo: 'municipal', uf: 'RN', municipio: 'Natal' },
  { md: '12-08', nome: 'Nossa Senhora da Conceição', tipo: 'municipal', uf: 'AM', municipio: 'Manaus' },
  { md: '12-08', nome: 'Nossa Senhora da Conceição', tipo: 'municipal', uf: 'PA', municipio: 'Belém' },
  // Destino principal Reservei
  { md: '06-05', nome: 'Aniversário de Caldas Novas', tipo: 'municipal', uf: 'GO', municipio: 'Caldas Novas' },
  { md: '08-15', nome: 'Nossa Senhora do Perpétuo Socorro', tipo: 'municipal', uf: 'GO', municipio: 'Caldas Novas' },
];

/** City name (normalized) → UF for empreendimento.cidade */
export const CIDADE_PARA_UF: Record<string, string> = {
  'caldas novas': 'GO',
  goiania: 'GO',
  'rio quente': 'GO',
  brasilia: 'DF',
  'são paulo': 'SP',
  'sao paulo': 'SP',
  'rio de janeiro': 'RJ',
  'belo horizonte': 'MG',
  salvador: 'BA',
  fortaleza: 'CE',
  recife: 'PE',
  'porto alegre': 'RS',
  curitiba: 'PR',
  florianopolis: 'SC',
  'florianópolis': 'SC',
  manaus: 'AM',
  belem: 'PA',
  'belém': 'PA',
  natal: 'RN',
  'joão pessoa': 'PB',
  'joao pessoa': 'PB',
  maceio: 'AL',
  'maceió': 'AL',
  aracaju: 'SE',
  'campo grande': 'MS',
  cuiaba: 'MT',
  'cuiabá': 'MT',
  vitoria: 'ES',
  'vitória': 'ES',
  teresina: 'PI',
  'sao luis': 'MA',
  'são luís': 'MA',
  macapa: 'AP',
  'macapá': 'AP',
  'boa vista': 'RR',
  'porto velho': 'RO',
  'rio branco': 'AC',
  palmas: 'TO',
};

export function normalizarCidade(cidade: string | null | undefined): string {
  return String(cidade || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function resolverUfPorCidade(cidade: string | null | undefined): string | null {
  const n = normalizarCidade(cidade);
  if (!n) return null;
  if (CIDADE_PARA_UF[n]) return CIDADE_PARA_UF[n];
  // fuzzy: strip accents already done
  for (const [k, uf] of Object.entries(CIDADE_PARA_UF)) {
    if (normalizarCidade(k) === n) return uf;
  }
  return null;
}
