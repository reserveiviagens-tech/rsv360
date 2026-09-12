import { buildGuestPreviewModel, guestPreviewMustExcludeInternal } from './build-guest-preview-model';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function runTests() {
  const model = buildGuestPreviewModel({
    titulo: 'Casa na praia',
    preco: '350',
    capacidade: 4,
    descAnuncio: 'Descrição pública do anúncio.',
    amenities: new Set(['wifi', 'piscina', 'ar']),
    tipoProp: { tipo: 'casa', acomodacao: 'espaco_inteiro' },
    localizacao: {
      bairro: 'Centro',
      cidade: 'Caldas Novas',
      uf: 'GO',
      endereco: 'Rua das Flores, 100',
      mostrarExata: true,
    },
    midiaJson: JSON.stringify({
      capa: 'https://cdn.example/capa.jpg',
      fotos: [
        'https://cdn.example/capa.jpg',
        'https://cdn.example/sala.jpg',
        'https://cdn.example/quarto.jpg',
      ],
    }),
    savedSlug: 'casa-praia',
    savedStatusAnuncio: 'anunciado',
    statusPublicacao: 'publicado',
    ativo: true,
    modoReserva: 'instantanea',
    quartos: 2,
    mensagemPreReserva: 'Aguardamos você!',
    localVerificado: true,
  });

  assert(model.titulo === 'Casa na praia', 'titulo');
  assert(model.precoLabel?.includes('350') === true, 'precoLabel');
  assert(model.metaLine?.includes('4 hóspedes') === true, 'meta guests');
  assert(model.metaLine?.includes('Casa') === true, 'meta type');
  assert(model.metaLine?.includes('Caldas Novas') === true, 'meta location');
  assert(model.locationLine?.includes('Caldas Novas') === true, 'locationLine');
  assert(model.enderecoPublico === 'Rua das Flores, 100', 'endereco publico');
  assert(model.descricaoExcerpt === 'Descrição pública do anúncio.', 'descricao');
  assert(model.amenityChips.length === 3, 'amenity chips');
  assert(model.galleryUrls.length >= 2, 'gallery urls');
  assert(model.capacidadeLabel === 'Até 4 hóspedes', 'capacidade label');
  assert(model.quartosLabel === '2 quarto(s)', 'quartos label');
  assert(model.modoReservaLabel === 'Reserva instantânea', 'modo reserva');
  assert(model.localVerificado === true, 'local verificado');
  assert(model.mensagemPreReserva === 'Aguardamos você!', 'mensagem pre reserva');
  assert(model.publicPageUrl?.endsWith('/h/casa-praia') === true, 'public url');

  const hiddenAddress = buildGuestPreviewModel({
    titulo: 'Sem endereço',
    preco: '100',
    capacidade: 2,
    descAnuncio: '',
    amenities: new Set(),
    localizacao: {
      bairro: 'Centro',
      cidade: 'Caldas Novas',
      uf: 'GO',
      endereco: 'Rua Secreta',
      mostrarExata: false,
    },
    midiaJson: '{}',
  });
  assert(hiddenAddress.enderecoPublico === null, 'endereco hidden when not mostrarExata');

  const draft = buildGuestPreviewModel({
    titulo: 'Rascunho',
    preco: '',
    capacidade: 2,
    descAnuncio: '',
    amenities: new Set(),
    midiaJson: '{}',
    savedSlug: '',
    savedStatusAnuncio: 'nao_anunciado',
    statusPublicacao: 'rascunho',
  });
  assert(draft.publicPageUrl === null, 'no public url when unpublished');

  assert(
    guestPreviewMustExcludeInternal({
      titulo: 'ok',
      descricao: 'ok',
    }),
    'internal fields excluded from shape',
  );
  assert(
    guestPreviewMustExcludeInternal({ wifiSenha: 'secret' }) === false,
    'detects forbidden keys in input probe',
  );

  return 'build-guest-preview-model.test.ts: all passed';
}

if (require.main === module) {
  const result = runTests();
  // eslint-disable-next-line no-console
  console.log(result);
}

export { runTests };
