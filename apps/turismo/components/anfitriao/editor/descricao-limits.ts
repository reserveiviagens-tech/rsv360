/** Client mirror of server listing-descricao.util limits and field catalog. */

export const DESCRICAO_ANUNCIO_MAX = 500;
export const DESCRICAO_CAMPO_MAX = 1000;

export type DescricaoSubKey = 'anuncio' | 'propriedade' | 'acesso' | 'interacao' | 'outras';

export const DESCRICAO_SUB_FIELDS: Array<{
  key: DescricaoSubKey;
  label: string;
  max: number;
}> = [
  { key: 'anuncio', label: 'Descrição do anúncio', max: DESCRICAO_ANUNCIO_MAX },
  { key: 'propriedade', label: 'Sua propriedade', max: DESCRICAO_CAMPO_MAX },
  { key: 'acesso', label: 'Acesso do hóspede', max: DESCRICAO_CAMPO_MAX },
  { key: 'interacao', label: 'Interação com os hóspedes', max: DESCRICAO_CAMPO_MAX },
  { key: 'outras', label: 'Outras informações importantes', max: DESCRICAO_CAMPO_MAX },
];
