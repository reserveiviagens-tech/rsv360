import type { CrmLocale } from './crm-locale';
import { CRM_BRAND_NAME } from './crm-locale';

export type CrmCopy = {
  brand: string;
  nav: {
    overview: string;
    rentals: string;
    sales: string;
    deals: string;
    leads: string;
    contacts: string;
  };
  actions: {
    newListing: string;
    recordOffer: string;
    moreActions: string;
    rentalListing: string;
    bookViewing: string;
    newLead: string;
    openDealBoard: string;
    openLeadInbox: string;
  };
  profile: {
    create: string;
    keyboardShortcuts: string;
    light: string;
    dark: string;
    matchSystem: string;
    languagePt: string;
    languageEn: string;
    resetDemo: string;
    menuProfile: string;
    createMenu: string;
  };
  createItems: {
    listingSale: string;
    listingRental: string;
    offer: string;
    lead: string;
    contact: string;
    viewing: string;
  };
  common: {
    cancel: string;
    close: string;
  };
  modals: {
    listingSale: { title: string; subtitle: string; primary: string };
    listingRental: { title: string; subtitle: string; primary: string };
    offer: { title: string; subtitle: string; primary: string };
    lead: { title: string; subtitle: string; primary: string };
    contact: { title: string; subtitle: string };
    contactPrimary: string;
    viewing: {
      title: string;
      titleField: string;
      kind: string;
      assigned: string;
      date: string;
      time: string;
      with: string;
      property: string;
      save: string;
    };
  };
  propertyDetail: {
    backSales: string;
    download: string;
    print: string;
    downloadAlert: string;
    liveChat: string;
    online: string;
    expandChat: string;
    collapseChat: string;
    openLiveChatFabAria: string;
    messagePlaceholder: string;
    send: string;
    justNow: string;
  };
  forms: {
    labels: {
      propertyName: string;
      streetAddress: string;
      neighbourhood: string;
      askingPrice: string;
      monthlyRent: string;
      type: string;
      bedrooms: string;
      bathrooms: string;
      area: string;
      seller: string;
      landlord: string;
      listingAgent: string;
      property: string;
      from: string;
      amount: string;
      stage: string;
      targetClose: string;
      note: string;
      name: string;
      email: string;
      phone: string;
      source: string;
      lookingTo: string;
      budget: string;
      areaInterest: string;
      interestedIn: string;
      message: string;
      fullName: string;
      contactType: string;
      city: string;
      none: string;
    };
    placeholders: {
      propertyName: string;
      offerNote: string;
    };
    options: {
      propertyTypeSale: string[];
      propertyTypeRental: string[];
      leadSources: string[];
      looking: string[];
      contactTypes: string[];
      offerStages: string[];
      viewingKinds: string[];
    };
  };
  overview: {
    activeListings: string;
    underOffer: string;
    avgDaysOnMarket: string;
    pipelineTitle: string;
    pipelineOpenBoard: string;
    pipelineWeightedLine: string;
    agendaTitle: string;
    agendaProgress: string;
    agendaNow: string;
    agendaTomorrow: string;
    rentalsCardTitle: string;
    rentalsAll: string;
    rentalsOccupied: string;
    /** Rótulo curto no anel (card estreito lg:col-span-3). */
    rentalsOccupiedShort: string;
    rentalsRevenue: string;
    rentalsRentRoll: string;
    rentalsUnitsLet: string;
    rentalsUnitsLetCount: string;
    rentalsPerMonthSuffix: string;
    rentalsStatusLet: string;
    rentalsStatusVacant: string;
    rentalsLetLabel: string;
    featuredListingBadge: string;
    portfolioMapSubtitle: string;
    topAgentsTitle: string;
    activityTitle: string;
  };
  salesModule: {
    activeListingsKpi: string;
    underOfferKpi: string;
    soldThisYearKpi: string;
    avgPricePerSqftKpi: string;
    pageTitleMain: string;
    pageTitleAccent: string;
    searchPlaceholder: string;
    filterAll: string;
    filterDraft: string;
    filterForSale: string;
    filterUnderOffer: string;
    filterSold: string;
    filterAnyType: string;
    filterAnyBeds: string;
    sortNewest: string;
    marketPulseTitle: string;
    marketPulseSubtitle: string;
    legendAbove: string;
    legendBelow: string;
    expandPulseAria: string;
    mapViewSoon: string;
    viewGrid: string;
    viewList: string;
    viewMap: string;
    statusDraft: string;
    statusForSale: string;
    statusUnderOffer: string;
    statusSold: string;
    favoriteAria: string;
    bestOffer: string;
    daysOnMarket: string;
    typeHouse: string;
    typeVilla: string;
    typeCabin: string;
    typeEstate: string;
    beds2Plus: string;
    beds3Plus: string;
    beds4Plus: string;
    beds5Plus: string;
    sortNewestListings: string;
    sortDomDesc: string;
    sortPriceHigh: string;
    sortPriceLow: string;
    selectTypeAria: string;
    selectBedsAria: string;
    selectSortAria: string;
    tableColListing: string;
    tableColStatus: string;
    tableColPrice: string;
    tableColBeds: string;
    tableColMetrics: string;
    tableColOffers: string;
    tableColAgent: string;
    collapsePulseAria: string;
    cardQuickViewing: string;
    cardQuickOffer: string;
    cardQuickShare: string;
    mapHomesOnMap: string;
    sharePanelAria: string;
    shareFacebook: string;
    shareWhatsApp: string;
    shareInstagram: string;
    shareTikTok: string;
    shareEmail: string;
    shareEmailSubject: string;
    shareCopyForPaste: string;
    shareLinkCopied: string;
  };
  deals: {
    metaDescription: string;
    activeDeals: string;
    totalCommission: string;
    inNegotiation: string;
    closedCount: string;
    filterByAgent: string;
    allAgents: string;
    fullPortfolio: string;
    stageSaveError: string;
    detailStage: string;
    closeDetail: string;
    agents: string;
    clearFilter: string;
    dragging: string;
    emptyColumn: string;
    openDealAria: string;
    openDealsKpi: string;
    weightedCommissionKpi: string;
    conversionRateKpi: string;
    dealsInColumn: string;
    listingSale: string;
    listingRent: string;
    closingThisMonthKpi: string;
    winRateKpi: string;
    filterAll: string;
    filterSale: string;
    filterRent: string;
    closedThisMonth: string;
    atAsk: string;
    cardMenuAria: string;
    cardMenu: {
      openDeal: string;
      moveTo: string;
      moveSubmenuAria: string;
      markSold: string;
      markLost: string;
      messageClient: string;
      messageFallback: string;
      openProperty: string;
      copyLink: string;
      copyLinkToast: string;
      copyLinkError: string;
      soldToast: string;
      undo: string;
    };
    detailModal: {
      saleOffer: string;
      rentOffer: string;
      offerLabel: string;
      askingLabel: string;
      vsAsking: string;
      commissionLabel: string;
      weightedSuffix: string;
      offersTitle: string;
      offersSubtitle: string;
      buyerTitle: string;
      buyerBadge: string;
      buyerContext: string;
      message: string;
      call: string;
      profile: string;
      openProperty: string;
      saveChanges: string;
      markLost: string;
      offerAmount: string;
      closedOn: string;
      note: string;
      earned: string;
      soldStage: string;
      moveToQuick: string;
      copyLinkAria: string;
    };
    stages: {
      viewing: { label: string; hint: string };
      offer: { label: string; hint: string };
      negotiation: { label: string; hint: string };
      under_contract: { label: string; hint: string };
      closed: { label: string; hint: string };
    };
  };
  rentals: {
    metaDescription: string;
    occupancyKpi: string;
    monthlyRevenueKpi: string;
    vacantUnitsKpi: string;
    expiringLeasesKpi: string;
    kpiUnitsBadge: string;
    kpiToLetBadge: string;
    primaryCta: string;
    rentRollTitle: string;
    rentRollGrowth: string;
    rentRollSubtitle: string;
    rentRollSubtitleUnits: string;
    rentRollLeasesSigned: string;
    rentRollChartFootnote: string;
    rentRollExpandAria: string;
    leaseCalendarTitle: string;
    leaseEndingBadge: string;
    leaseCalendarExpandAria: string;
    searchPlaceholder: string;
    filterAll: string;
    filterVacant: string;
    filterLet: string;
    filterApplication: string;
    sortNewest: string;
    sortName: string;
    portfolioCount: string;
    unitsLetLabel: string;
    rollLabel: string;
    manage: string;
    statusLeased: string;
    statusApplication: string;
    statusForRent: string;
    applicationBadge: string;
    leaseEndsIn: string;
    vacantFooter: string;
    favoriteAria: string;
    favoriteSaved: string;
    favoriteRemoved: string;
    cardBookViewing: string;
    cardRegisterRequest: string;
    cardMessageOwner: string;
    leaseEventSign: string;
    leaseEventEnd: string;
    leaseEventReview: string;
    leaseMarkSignedAria: string;
    leaseAddCalendarAria: string;
    leaseSignedDone: string;
    leaseAddedToCalendar: string;
    leaseOnCalendar: string;
    leaseUndoAction: string;
    leaseUndoSignAria: string;
    leaseUndoSignDone: string;
    leaseUndoCalendarAria: string;
    leaseUndoCalendarDone: string;
    leaseSignedBadge: string;
  };
  leads: {
    metaDescription: string;
    demoHint: string;
  };
  commission: {
    title: string;
    optionsAria: string;
    expandAria: string;
    copyTotal: string;
    myCommissions: string;
    earnedThisYear: string;
    monthsAtTargetSuffix: string;
    paidBrlPrefix: string;
    paidBrlSuffix: string;
    earnedLegend: string;
    teamTarget: string;
    perMonth: string;
    teamTargetDemoBrl: string;
    tooltipCommission: string;
    tooltipTarget: string;
    kpiThisMonth: string;
    rankingTab: string;
    dealsTab: string;
  };
};

const PT: CrmCopy = {
  brand: CRM_BRAND_NAME,
  nav: {
    overview: 'Visão Geral',
    rentals: 'Locações',
    sales: 'Vendas',
    deals: 'Negócios',
    leads: 'Leads',
    contacts: 'Contatos',
  },
  actions: {
    newListing: 'Novo anúncio',
    recordOffer: 'Registrar oferta',
    moreActions: 'Mais ações',
    rentalListing: 'Anúncio de locação',
    bookViewing: 'Agendar visita',
    newLead: 'Novo lead',
    openDealBoard: 'Abrir painel de negócios',
    openLeadInbox: 'Abrir caixa de leads',
  },
  profile: {
    create: 'Criar…',
    keyboardShortcuts: 'Atalhos de teclado',
    light: 'Claro',
    dark: 'Escuro',
    matchSystem: 'Seguir sistema',
    languagePt: 'Português (BR)',
    languageEn: 'English',
    resetDemo: 'Repor dados de demonstração',
    menuProfile: 'Menu do perfil',
    createMenu: 'Criar',
  },
  createItems: {
    listingSale: 'Anúncio à venda',
    listingRental: 'Anúncio de locação',
    offer: 'Oferta',
    lead: 'Lead',
    contact: 'Contato',
    viewing: 'Visita',
  },
  common: {
    cancel: 'Cancelar',
    close: 'Fechar',
  },
  modals: {
    listingSale: {
      title: 'Novo anúncio à venda',
      subtitle: 'Começa como rascunho — publique quando as fotos estiverem prontas.',
      primary: 'Criar anúncio',
    },
    listingRental: {
      title: 'Novo anúncio de locação',
      subtitle: 'Começa como rascunho — publique quando as fotos estiverem prontas.',
      primary: 'Criar anúncio',
    },
    offer: {
      title: 'Registrar oferta',
      subtitle: 'Entra no painel de negócios na coluna Oferta.',
      primary: 'Adicionar oferta',
    },
    lead: {
      title: 'Novo lead',
      subtitle: 'Cai em Leads como Novo, com pontuação pelo que você souber.',
      primary: 'Adicionar lead',
    },
    contact: {
      title: 'Novo contato',
      subtitle: 'Inclua compradores, vendedores e parceiros no CRM.',
    },
    contactPrimary: 'Adicionar contato',
    viewing: {
      title: 'Agendar visita',
      titleField: 'Título',
      kind: 'Tipo',
      assigned: 'Responsável',
      date: 'Data',
      time: 'Hora',
      with: 'Com',
      property: 'Imóvel',
      save: 'Salvar',
    },
  },
  propertyDetail: {
    backSales: 'Voltar aos imóveis à venda',
    download: 'Baixar dossiê',
    print: 'Imprimir ficha',
    downloadAlert: 'Download do dossiê completo iniciado.',
    liveChat: 'Live Chat',
    online: 'online',
    expandChat: 'Expandir Live Chat',
    collapseChat: 'Recolher Live Chat',
    openLiveChatFabAria: 'Abrir Live Chat',
    messagePlaceholder: 'Digite sua mensagem',
    send: 'Enviar',
    justNow: 'Agora',
  },
  forms: {
    labels: {
      propertyName: 'Nome do imóvel',
      streetAddress: 'Endereço',
      neighbourhood: 'Bairro',
      askingPrice: 'Preço pedido ($)',
      monthlyRent: 'Aluguel mensal ($)',
      type: 'Tipo',
      bedrooms: 'Quartos',
      bathrooms: 'Banheiros',
      area: 'Área (ft²)',
      seller: 'Vendedor',
      landlord: 'Locador',
      listingAgent: 'Corretor do anúncio',
      property: 'Imóvel',
      from: 'De',
      amount: 'Valor ($)',
      stage: 'Estágio',
      targetClose: 'Previsão de fechamento',
      note: 'Observação',
      name: 'Nome',
      email: 'E-mail',
      phone: 'Telefone',
      source: 'Origem',
      lookingTo: 'Interesse',
      budget: 'Orçamento ($)',
      areaInterest: 'Região',
      interestedIn: 'Interesse em',
      message: 'Mensagem',
      fullName: 'Nome completo',
      contactType: 'Tipo',
      city: 'Cidade',
      none: '—',
    },
    placeholders: {
      propertyName: 'ex.: Casa Juniper Court',
      offerNote: 'Condições, prazos — o que o vendedor precisa saber.',
    },
    options: {
      propertyTypeSale: ['Casa', 'Condomínio', 'Apartamento', 'Terreno'],
      propertyTypeRental: ['Casa', 'Condomínio', 'Apartamento'],
      leadSources: ['Site', 'Indicação', 'Portal', 'Porta aberta', 'Redes sociais'],
      looking: ['Comprar', 'Alugar', 'Vender', 'Investir'],
      contactTypes: ['Comprador', 'Vendedor', 'Corretor', 'Parceiro'],
      offerStages: ['Oferta', 'Negociação'],
      viewingKinds: ['Visita', 'Ligação', 'Tarefa', 'Porta aberta', 'Assinatura'],
    },
  },
  overview: {
    activeListings: 'Ativos',
    underOffer: 'Sob proposta',
    avgDaysOnMarket: 'Dias no mercado',
    pipelineTitle: 'Funil por estágio',
    pipelineOpenBoard: 'Abrir quadro',
    pipelineWeightedLine: 'comissão ponderada · {deals} negócios abertos · {close} ao fechar',
    agendaTitle: 'Agenda de hoje',
    agendaProgress: '{done} de {total} feitas',
    agendaNow: 'Agora',
    agendaTomorrow: 'AMANHÃ',
    rentalsCardTitle: 'Locações',
    rentalsAll: 'Todas',
    rentalsOccupied: 'ocupadas',
    rentalsOccupiedShort: 'ocup.',
    rentalsRevenue: 'Faturamento',
    rentalsRentRoll: 'Faturamento',
    rentalsUnitsLet: 'Unidades locadas',
    rentalsUnitsLetCount: '{let} de {total}',
    rentalsPerMonthSuffix: '/mês',
    rentalsStatusLet: 'Locada',
    rentalsStatusVacant: 'Vaga',
    rentalsLetLabel: 'Locadas',
    featuredListingBadge: 'Destaque',
    portfolioMapSubtitle: '10 à venda · 6 para locar',
    topAgentsTitle: 'Principais corretores',
    activityTitle: 'Atividades recentes',
  },
  salesModule: {
    activeListingsKpi: 'Anúncios ativos',
    underOfferKpi: 'Em proposta',
    soldThisYearKpi: 'Vendidos no ano',
    avgPricePerSqftKpi: 'Média preço / ft²',
    pageTitleMain: 'Imóveis',
    pageTitleAccent: 'à venda',
    searchPlaceholder: 'Buscar nome, rua ou região…',
    filterAll: 'Todos',
    filterDraft: 'Rascunho',
    filterForSale: 'À venda',
    filterUnderOffer: 'Em proposta',
    filterSold: 'Vendidos',
    filterAnyType: 'Qualquer tipo',
    filterAnyBeds: 'Qualquer quartos',
    sortNewest: 'Mais recentes',
    marketPulseTitle: 'Market pulse',
    marketPulseSubtitle: 'pedido vs. estimativa independente',
    legendAbove: 'Acima',
    legendBelow: 'Abaixo',
    expandPulseAria: 'Expandir market pulse',
    mapViewSoon: 'Vista de mapa em breve.',
    viewGrid: 'Grid',
    viewList: 'Lista',
    viewMap: 'Mapa',
    statusDraft: 'Rascunho',
    statusForSale: 'À venda',
    statusUnderOffer: 'Em proposta',
    statusSold: 'Vendido',
    favoriteAria: 'Favoritar anúncio',
    bestOffer: 'Melhor {price}',
    daysOnMarket: 'd no mercado',
    typeHouse: 'Casa',
    typeVilla: 'Villa',
    typeCabin: 'Cabana',
    typeEstate: 'Propriedade',
    beds2Plus: '2+ quartos',
    beds3Plus: '3+ quartos',
    beds4Plus: '4+ quartos',
    beds5Plus: '5+ quartos',
    sortNewestListings: 'Mais recentes',
    sortDomDesc: 'Mais tempo no mercado',
    sortPriceHigh: 'Preço: maior',
    sortPriceLow: 'Preço: menor',
    selectTypeAria: 'Filtrar por tipo de imóvel',
    selectBedsAria: 'Filtrar por quartos',
    selectSortAria: 'Ordenar listagens',
    tableColListing: 'Imóvel',
    tableColStatus: 'Estado',
    tableColPrice: 'Preço',
    tableColBeds: 'Quartos',
    tableColMetrics: 'Métricas',
    tableColOffers: 'Ofertas',
    tableColAgent: 'Agente',
    collapsePulseAria: 'Recolher market pulse',
    cardQuickViewing: 'Visita',
    cardQuickOffer: 'Oferta',
    cardQuickShare: 'Partilhar',
    mapHomesOnMap: '{n} imóveis no mapa',
    sharePanelAria: 'Partilhar anúncio',
    shareFacebook: 'Partilhar no Facebook',
    shareWhatsApp: 'Partilhar no WhatsApp',
    shareInstagram: 'Copiar para o Instagram',
    shareTikTok: 'Copiar para o TikTok',
    shareEmail: 'Partilhar por e-mail',
    shareEmailSubject: 'Anúncio: {name}',
    shareCopyForPaste: 'Cole na legenda da publicação:',
    shareLinkCopied: 'Link copiado — cole no Instagram ou TikTok',
  },
  deals: {
    metaDescription: 'Gestão de portfólio de negócios e comissões',
    activeDeals: 'Negócios ativos',
    totalCommission: 'Comissão total',
    inNegotiation: 'Em negociação',
    closedCount: 'Fechados',
    filterByAgent: 'Filtro por agente',
    allAgents: 'Todos',
    fullPortfolio: 'Ver carteira completa',
    stageSaveError: 'Não foi possível salvar o estágio. Tente novamente.',
    detailStage: 'Estágio',
    closeDetail: 'Fechar detalhes',
    agents: 'Agentes',
    clearFilter: 'Limpar',
    dragging: 'Arrastando card…',
    emptyColumn: 'Nenhum negócio',
    openDealAria: 'Abrir detalhes de {name}',
    openDealsKpi: 'Negócios abertos',
    weightedCommissionKpi: 'Comissão ponderada',
    conversionRateKpi: 'Taxa de conversão',
    dealsInColumn: 'negócios',
    listingSale: 'Venda',
    listingRent: 'Locação',
    closingThisMonthKpi: 'Fechando este mês',
    winRateKpi: 'Taxa de vitória',
    filterAll: 'Todos',
    filterSale: 'Venda',
    filterRent: 'Locação',
    closedThisMonth: 'neste mês',
    atAsk: 'No pedido',
    cardMenuAria: 'Opções do negócio',
    cardMenu: {
      openDeal: 'Abrir negócio',
      moveTo: 'Mover para…',
      moveSubmenuAria: 'Escolher coluna',
      markSold: 'Marcar vendido',
      markLost: 'Marcar perdido',
      messageClient: 'Mensagem {name}',
      messageFallback: 'cliente',
      openProperty: 'Abrir imóvel',
      copyLink: 'Copiar link',
      copyLinkToast: 'Link do negócio copiado',
      copyLinkError: 'Não foi possível copiar o link',
      soldToast: '{property} vendido · {commission} comissão',
      undo: 'Desfazer',
    },
    detailModal: {
      saleOffer: 'Oferta de venda',
      rentOffer: 'Oferta de locação',
      offerLabel: 'Oferta',
      askingLabel: 'Pedido',
      vsAsking: 'vs pedido',
      commissionLabel: 'Comissão',
      weightedSuffix: 'ponderada',
      offersTitle: 'Ofertas neste imóvel',
      offersSubtitle: 'Maior primeiro · o traço marca o preço pedido',
      buyerTitle: 'Comprador',
      buyerBadge: 'Comprador',
      buyerContext: '{city} · cliente de {agent}',
      message: 'Mensagem',
      call: 'Ligar',
      profile: 'Perfil',
      openProperty: 'Abrir imóvel',
      saveChanges: 'Salvar alterações',
      markLost: 'Marcar perdido',
      offerAmount: 'Valor da oferta ($)',
      closedOn: 'Fechamento em',
      note: 'Nota',
      earned: 'recebida',
      soldStage: 'Vendido',
      moveToQuick: 'Mover para:',
      copyLinkAria: 'Copiar link do negócio',
    },
    stages: {
      viewing: { label: 'Visitas', hint: 'Agendamentos' },
      offer: { label: 'Oferta', hint: 'Propostas' },
      negotiation: { label: 'Negociação', hint: 'Em objetivação' },
      under_contract: { label: 'Contrato', hint: 'Encerrando' },
      closed: { label: 'Fechado', hint: 'Concluído' },
    },
  },
  rentals: {
    metaDescription: 'Gestão de locações, rent roll e calendário de contratos — RSV 360',
    occupancyKpi: 'Taxa de ocupação',
    monthlyRevenueKpi: 'Receita mensal de aluguel',
    vacantUnitsKpi: 'Unidades vagas',
    expiringLeasesKpi: 'Contratos vencendo (90 d)',
    kpiUnitsBadge: 'unid.',
    kpiToLetBadge: 'para locar',
    primaryCta: 'Novo anúncio',
    rentRollTitle: 'Rent roll',
    rentRollGrowth: '+8,0% em 12 meses',
    rentRollSubtitle: 'ao mês',
    rentRollSubtitleUnits: '93 unidades locadas',
    rentRollLeasesSigned: '7 contratos assinados',
    rentRollChartFootnote: 'Barras a partir de $300K · mês atual em laranja',
    rentRollExpandAria: 'Expandir rent roll',
    leaseCalendarTitle: 'Calendário de locações',
    leaseEndingBadge: '36 vencendo em 90 d',
    leaseCalendarExpandAria: 'Expandir calendário de locações',
    searchPlaceholder: 'Buscar nome, rua ou região…',
    filterAll: 'Todos',
    filterVacant: 'Vagas',
    filterLet: 'Locadas',
    filterApplication: 'Candidatura',
    sortNewest: 'Mais recentes',
    sortName: 'Nome',
    portfolioCount: 'imóveis de locação',
    unitsLetLabel: 'unidades locadas',
    rollLabel: 'Roll',
    manage: 'Gerir',
    statusLeased: 'Locada',
    statusApplication: 'Candidatura',
    statusForRent: 'Para locação',
    applicationBadge: '{n} candidatura(s)',
    leaseEndsIn: 'Contrato termina em {days} dias',
    vacantFooter: '{vacant} vagas · próximo fim em {days} d',
    favoriteAria: 'Favoritar imóvel',
    favoriteSaved: 'Salvo nos favoritos',
    favoriteRemoved: 'Removido dos favoritos',
    cardBookViewing: 'Agendar visita',
    cardRegisterRequest: 'Registrar solicitação',
    cardMessageOwner: 'Mensagem ao proprietário',
    leaseEventSign: 'Assinatura',
    leaseEventEnd: 'Fim de contrato',
    leaseEventReview: 'Revisão',
    leaseMarkSignedAria: 'Marcar contrato como assinado',
    leaseAddCalendarAria: 'Adicionar ao calendário',
    leaseSignedDone: 'Contrato marcado como assinado',
    leaseAddedToCalendar: 'Evento adicionado ao calendário',
    leaseOnCalendar: 'No calendário',
    leaseUndoAction: 'Desfazer',
    leaseUndoSignAria: 'Desfazer assinatura do contrato',
    leaseUndoSignDone: 'Assinatura desfeita',
    leaseUndoCalendarAria: 'Remover do calendário',
    leaseUndoCalendarDone: 'Removido do calendário',
    leaseSignedBadge: 'Assinado',
  },
  leads: {
    metaDescription: 'Caixa de entrada de leads — módulo CRM RSV 360',
    demoHint:
      'Caixa demo — use Novo lead no menu ⋯ ou Criar… no avatar para registrar um lead. O inbox completo fica na aba Leads do Overview.',
  },
  commission: {
    title: 'Comissão',
    optionsAria: 'Opções de comissão',
    expandAria: 'Expandir gráfico de comissão',
    copyTotal: 'Copiar total',
    myCommissions: 'Minhas comissões',
    earnedThisYear: 'ganhos no ano',
    monthsAtTargetSuffix: 'de {total} meses na meta',
    paidBrlPrefix: 'comissões pagas',
    paidBrlSuffix: 'meses no gráfico',
    earnedLegend: 'Comissão ganha',
    teamTarget: 'Meta da equipe',
    perMonth: '/mês',
    teamTargetDemoBrl: 'meta equipe (demo USD)',
    tooltipCommission: 'Comissão',
    tooltipTarget: 'Meta',
    kpiThisMonth: 'Comissão mês',
    rankingTab: 'Comissão',
    dealsTab: 'Negócios',
  },
};

const EN: CrmCopy = {
  brand: CRM_BRAND_NAME,
  nav: {
    overview: 'Overview',
    rentals: 'Rentals',
    sales: 'Sales',
    deals: 'Deals',
    leads: 'Leads',
    contacts: 'Contacts',
  },
  actions: {
    newListing: 'New listing',
    recordOffer: 'Record offer',
    moreActions: 'More actions',
    rentalListing: 'Rental listing',
    bookViewing: 'Book a viewing',
    newLead: 'New lead',
    openDealBoard: 'Open the deal board',
    openLeadInbox: 'Open the lead inbox',
  },
  profile: {
    create: 'Create…',
    keyboardShortcuts: 'Keyboard shortcuts',
    light: 'Light',
    dark: 'Dark',
    matchSystem: 'Match system',
    languagePt: 'Português (BR)',
    languageEn: 'English',
    resetDemo: 'Reset demo data',
    menuProfile: 'Profile menu',
    createMenu: 'Create',
  },
  createItems: {
    listingSale: 'Listing for sale',
    listingRental: 'Rental listing',
    offer: 'Offer',
    lead: 'Lead',
    contact: 'Contact',
    viewing: 'Viewing',
  },
  common: {
    cancel: 'Cancel',
    close: 'Close',
  },
  modals: {
    listingSale: {
      title: 'New listing for sale',
      subtitle: 'It starts as a draft — publish it when the photos are in.',
      primary: 'Create listing',
    },
    listingRental: {
      title: 'New rental listing',
      subtitle: 'It starts as a draft — publish it when the photos are in.',
      primary: 'Create listing',
    },
    offer: {
      title: 'Record an offer',
      subtitle: 'It goes on the deal board under Offer.',
      primary: 'Add offer',
    },
    lead: {
      title: 'New lead',
      subtitle: 'It lands in Leads as New, scored on what you know.',
      primary: 'Add lead',
    },
    contact: {
      title: 'New contact',
      subtitle: 'Add someone to your CRM — buyers, sellers, and partners.',
    },
    contactPrimary: 'Add contact',
    viewing: {
      title: 'Book a viewing',
      titleField: 'Title',
      kind: 'Kind',
      assigned: 'Assigned to',
      date: 'Date',
      time: 'Time',
      with: 'With',
      property: 'Property',
      save: 'Save',
    },
  },
  propertyDetail: {
    backSales: 'Back to listings for sale',
    download: 'Download',
    print: 'Print',
    downloadAlert: 'Full property pack download started.',
    liveChat: 'Live Chat',
    online: 'online',
    expandChat: 'Expand Live Chat',
    collapseChat: 'Collapse Live Chat',
    openLiveChatFabAria: 'Open Live Chat',
    messagePlaceholder: 'Enter your message',
    send: 'Send',
    justNow: 'Just now',
  },
  forms: {
    labels: {
      propertyName: 'Property name',
      streetAddress: 'Street address',
      neighbourhood: 'Neighbourhood',
      askingPrice: 'Asking price ($)',
      monthlyRent: 'Monthly rent ($)',
      type: 'Type',
      bedrooms: 'Bedrooms',
      bathrooms: 'Bathrooms',
      area: 'Area (ft²)',
      seller: 'Seller',
      landlord: 'Landlord',
      listingAgent: 'Listing agent',
      property: 'Property',
      from: 'From',
      amount: 'Amount ($)',
      stage: 'Stage',
      targetClose: 'Target close',
      note: 'Note',
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      source: 'Source',
      lookingTo: 'Looking to',
      budget: 'Budget ($)',
      areaInterest: 'Area',
      interestedIn: 'Interested in',
      message: 'Message',
      fullName: 'Full name',
      contactType: 'Type',
      city: 'City',
      none: '—',
    },
    placeholders: {
      propertyName: 'e.g. Juniper Court House',
      offerNote: 'Conditions, timing, anything the seller should hear.',
    },
    options: {
      propertyTypeSale: ['House', 'Condo', 'Apartment', 'Land'],
      propertyTypeRental: ['House', 'Condo', 'Apartment'],
      leadSources: ['Website', 'Referral', 'Portal', 'Open house', 'Social'],
      looking: ['Buy', 'Rent', 'Sell', 'Invest'],
      contactTypes: ['Buyer', 'Seller', 'Agent', 'Partner'],
      offerStages: ['Offer', 'Negotiation'],
      viewingKinds: ['Viewing', 'Call', 'Task', 'Open house', 'Signing'],
    },
  },
  overview: {
    activeListings: 'Active listings',
    underOffer: 'Under offer',
    avgDaysOnMarket: 'Avg. days on market',
    pipelineTitle: 'Pipeline by stage',
    pipelineOpenBoard: 'Open board',
    pipelineWeightedLine: 'weighted commission · {deals} open deals · {close} at close',
    agendaTitle: "Today's agenda",
    agendaProgress: '{done} of {total} done',
    agendaNow: 'Now',
    agendaTomorrow: 'TOMORROW',
    rentalsCardTitle: 'Rentals',
    rentalsAll: 'All',
    rentalsOccupied: 'occupied',
    rentalsOccupiedShort: 'occ.',
    rentalsRevenue: 'Revenue',
    rentalsRentRoll: 'Rent roll',
    rentalsUnitsLet: 'Units let',
    rentalsUnitsLetCount: '{let} of {total}',
    rentalsPerMonthSuffix: '/mo',
    rentalsStatusLet: 'Let',
    rentalsStatusVacant: 'Vacant',
    rentalsLetLabel: 'Let',
    featuredListingBadge: 'Featured listing',
    portfolioMapSubtitle: '10 for sale · 6 to let',
    topAgentsTitle: 'Top agents',
    activityTitle: 'Activity',
  },
  salesModule: {
    activeListingsKpi: 'Active listings',
    underOfferKpi: 'Under offer',
    soldThisYearKpi: 'Sold this year',
    avgPricePerSqftKpi: 'Avg. price per ft²',
    pageTitleMain: 'Homes',
    pageTitleAccent: 'for sale',
    searchPlaceholder: 'Search name, street or area…',
    filterAll: 'All',
    filterDraft: 'Draft',
    filterForSale: 'For sale',
    filterUnderOffer: 'Under offer',
    filterSold: 'Sold',
    filterAnyType: 'Any type',
    filterAnyBeds: 'Any beds',
    sortNewest: 'Newest',
    marketPulseTitle: 'Market pulse',
    marketPulseSubtitle: 'asking vs. independent estimate',
    legendAbove: 'Above',
    legendBelow: 'Below',
    expandPulseAria: 'Expand market pulse',
    mapViewSoon: 'Map view coming soon.',
    viewGrid: 'Grid',
    viewList: 'List',
    viewMap: 'Map',
    statusDraft: 'Draft',
    statusForSale: 'For sale',
    statusUnderOffer: 'Under offer',
    statusSold: 'Sold',
    favoriteAria: 'Favorite listing',
    bestOffer: 'Best {price}',
    daysOnMarket: 'days on market',
    typeHouse: 'House',
    typeVilla: 'Villa',
    typeCabin: 'Cabin',
    typeEstate: 'Estate',
    beds2Plus: '2+ beds',
    beds3Plus: '3+ beds',
    beds4Plus: '4+ beds',
    beds5Plus: '5+ beds',
    sortNewestListings: 'Newest',
    sortDomDesc: 'Days on market',
    sortPriceHigh: 'Price: high to low',
    sortPriceLow: 'Price: low to high',
    selectTypeAria: 'Filter by property type',
    selectBedsAria: 'Filter by bedrooms',
    selectSortAria: 'Sort listings',
    tableColListing: 'Listing',
    tableColStatus: 'Status',
    tableColPrice: 'Price',
    tableColBeds: 'Beds',
    tableColMetrics: 'Metrics',
    tableColOffers: 'Offers',
    tableColAgent: 'Agent',
    collapsePulseAria: 'Collapse market pulse',
    cardQuickViewing: 'Viewing',
    cardQuickOffer: 'Offer',
    cardQuickShare: 'Share',
    mapHomesOnMap: '{n} homes on the map',
    sharePanelAria: 'Share listing',
    shareFacebook: 'Share on Facebook',
    shareWhatsApp: 'Share on WhatsApp',
    shareInstagram: 'Copy for Instagram',
    shareTikTok: 'Copy for TikTok',
    shareEmail: 'Share by email',
    shareEmailSubject: 'Listing: {name}',
    shareCopyForPaste: 'Paste in your post caption:',
    shareLinkCopied: 'Link copied — paste in Instagram or TikTok',
  },
  deals: {
    metaDescription: 'Deal portfolio and commission tracking',
    activeDeals: 'Active deals',
    totalCommission: 'Total commission',
    inNegotiation: 'In negotiation',
    closedCount: 'Closed',
    filterByAgent: 'Filter by agent',
    allAgents: 'All',
    fullPortfolio: 'View full portfolio',
    stageSaveError: 'Could not save the stage. Try again.',
    detailStage: 'Stage',
    closeDetail: 'Close details',
    agents: 'Agents',
    clearFilter: 'Clear',
    dragging: 'Dragging card…',
    emptyColumn: 'No deals',
    openDealAria: 'Open details for {name}',
    openDealsKpi: 'Open deals',
    weightedCommissionKpi: 'Weighted commission',
    conversionRateKpi: 'Conversion rate',
    dealsInColumn: 'deals',
    listingSale: 'Sale',
    listingRent: 'Rent',
    closingThisMonthKpi: 'Closing this month',
    winRateKpi: 'Win rate',
    filterAll: 'All',
    filterSale: 'Sale',
    filterRent: 'Rent',
    closedThisMonth: 'this month',
    atAsk: 'At ask',
    cardMenuAria: 'Deal options',
    cardMenu: {
      openDeal: 'Open deal',
      moveTo: 'Move to…',
      moveSubmenuAria: 'Pick a column',
      markSold: 'Mark sold',
      markLost: 'Mark lost',
      messageClient: 'Message {name}',
      messageFallback: 'client',
      openProperty: 'Open property',
      copyLink: 'Copy link',
      copyLinkToast: 'Deal link copied',
      copyLinkError: 'Could not copy link',
      soldToast: '{property} sold · {commission} commission',
      undo: 'Undo',
    },
    detailModal: {
      saleOffer: 'Sale offer',
      rentOffer: 'Rent offer',
      offerLabel: 'Offer',
      askingLabel: 'Asking',
      vsAsking: 'vs asking',
      commissionLabel: 'Commission',
      weightedSuffix: 'weighted',
      offersTitle: 'Offers on this property',
      offersSubtitle: 'Highest first · the tick marks the asking price',
      buyerTitle: 'Buyer',
      buyerBadge: 'Buyer',
      buyerContext: "{city} · {agent}'s client",
      message: 'Message',
      call: 'Call',
      profile: 'Profile',
      openProperty: 'Open property',
      saveChanges: 'Save changes',
      markLost: 'Mark lost',
      offerAmount: 'Offer amount ($)',
      closedOn: 'Closed on',
      note: 'Note',
      earned: 'earned',
      soldStage: 'Sold',
      moveToQuick: 'Move to:',
      copyLinkAria: 'Copy deal link',
    },
    stages: {
      viewing: { label: 'Viewing', hint: 'Bookings' },
      offer: { label: 'Offer', hint: 'Proposals' },
      negotiation: { label: 'Negotiation', hint: 'In progress' },
      under_contract: { label: 'Under contract', hint: 'Closing' },
      closed: { label: 'Closed', hint: 'Done' },
    },
  },
  rentals: {
    metaDescription: 'Rental portfolio, rent roll and lease calendar — RSV 360',
    occupancyKpi: 'Occupancy rate',
    monthlyRevenueKpi: 'Monthly rental revenue',
    vacantUnitsKpi: 'Vacant units',
    expiringLeasesKpi: 'Leases expiring (90 d)',
    kpiUnitsBadge: 'units',
    kpiToLetBadge: 'to let',
    primaryCta: 'New rental',
    rentRollTitle: 'Rent roll',
    rentRollGrowth: '+8.0% in 12 months',
    rentRollSubtitle: 'a month',
    rentRollSubtitleUnits: 'from 93 let units',
    rentRollLeasesSigned: '7 leases signed',
    rentRollChartFootnote: 'Bars start at $300K · this month in apricot',
    rentRollExpandAria: 'Expand rent roll',
    leaseCalendarTitle: 'Lease calendar',
    leaseEndingBadge: '36 ending in 90 d',
    leaseCalendarExpandAria: 'Expand lease calendar',
    searchPlaceholder: 'Search name, street or area…',
    filterAll: 'All',
    filterVacant: 'Vacant',
    filterLet: 'Let',
    filterApplication: 'Application',
    sortNewest: 'Newest',
    sortName: 'Name',
    portfolioCount: 'rental properties',
    unitsLetLabel: 'units let',
    rollLabel: 'Roll',
    manage: 'Manage',
    statusLeased: 'Leased',
    statusApplication: 'Application',
    statusForRent: 'For rent',
    applicationBadge: '{n} application',
    leaseEndsIn: 'Lease ends in {days} days',
    vacantFooter: '{vacant} vacant · next lease end in {days} d',
    favoriteAria: 'Favorite property',
    favoriteSaved: 'Saved to favorites',
    favoriteRemoved: 'Removed from favorites',
    cardBookViewing: 'Book a viewing',
    cardRegisterRequest: 'Register a request',
    cardMessageOwner: 'Message owner',
    leaseEventSign: 'Sign lease',
    leaseEventEnd: 'Lease end',
    leaseEventReview: 'Lease review',
    leaseMarkSignedAria: 'Mark lease as signed',
    leaseAddCalendarAria: 'Add to calendar',
    leaseSignedDone: 'Lease marked as signed',
    leaseAddedToCalendar: 'Added to your calendar',
    leaseOnCalendar: 'On calendar',
    leaseUndoAction: 'Undo',
    leaseUndoSignAria: 'Undo lease signing',
    leaseUndoSignDone: 'Signing undone',
    leaseUndoCalendarAria: 'Remove from calendar',
    leaseUndoCalendarDone: 'Removed from calendar',
    leaseSignedBadge: 'Signed',
  },
  leads: {
    metaDescription: 'Lead inbox — RSV 360 CRM module',
    demoHint:
      'Demo inbox — use New lead in the ⋯ menu or Create… on the avatar to add a lead. The full inbox lives on the Leads tab in Overview.',
  },
  commission: {
    title: 'Commission',
    optionsAria: 'Commission options',
    expandAria: 'Expand commission chart',
    copyTotal: 'Copy total',
    myCommissions: 'My commissions',
    earnedThisYear: 'earned this year',
    monthsAtTargetSuffix: 'of {total} months at target',
    paidBrlPrefix: 'paid commissions',
    paidBrlSuffix: 'months on chart',
    earnedLegend: 'Commission earned',
    teamTarget: 'Team target',
    perMonth: '/mo',
    teamTargetDemoBrl: 'team target (USD demo)',
    tooltipCommission: 'Commission',
    tooltipTarget: 'Target',
    kpiThisMonth: 'This month',
    rankingTab: 'Commission',
    dealsTab: 'Deals',
  },
};

export function getCrmCopy(locale: CrmLocale): CrmCopy {
  return locale === 'en' ? EN : PT;
}
