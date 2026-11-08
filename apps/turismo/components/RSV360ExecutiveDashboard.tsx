import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Compass,
  Navigation,
  Camera,
  Folder,
  UserCheck,
  ListTodo,
  History,
  Layers,
  CheckSquare,
  Copy,
  Star,
  Sliders,
  Edit3,
  Tag,
  Bookmark,
  Printer,
  Building,
  Calendar,
  Clock,
  MapPin,
  Search,
  Bell,
  Sun,
  Moon,
  Plus,
  ChevronRight,
  ChevronDown,
  Maximize2,
  CheckCircle2,
  Circle,
  Play,
  Pause,
  Send,
  Paperclip,
  Mic,
  DollarSign,
  ChevronLeft,
  MoreHorizontal,
  ThumbsUp,
  Smile,
  Check,
  Phone,
  FileText,
  Key,
  Flame,
  ArrowUpRight,
  ShieldCheck,
  Download,
  Filter,
  Eye,
  Heart,
  Share2,
  Mail,
  MessageSquare,
  Sparkles,
  Award,
  X,
  Command,
  RotateCcw,
  Keyboard
} from 'lucide-react';
import {
  lintelBtnPrimary,
  lintelBtnGhost,
  lintelIconBtn,
  lintelNavTab,
  LintelNavTabBadge,
  lintelSegment,
  lintelGreeting,
  lintelLayoutEase,
  OVERVIEW_BOOT_MS,
  OverviewSkeleton,
} from './lintel/overview-primitives';
import {
  BookViewingModal,
  PortfolioMapCard,
  PortfolioMapExpandModal,
  PortfolioMapCanvas,
  PortfolioMapLegend,
  PortfolioMapPin,
  type BookViewingForm,
} from './lintel/portfolio-map';
import {
  CommissionOverviewCard,
  commissionMonthKpi,
  type CommissionMonthPoint,
} from './lintel/commission-chart';
import { LintelHeaderActions } from './lintel/lintel-header-actions';
import { Carousel, mapOverviewHeroToCarousel } from './lintel/carousel';
import { LintelSemiCircularPriceGauge } from './lintel/price-gauge';
import type { PortfolioMapPin } from './lintel/portfolio-map';
import type { OverviewContactRow } from '@/lib/overview-contacts';
import type { OverviewHeroListing } from '@/lib/overview-portfolio';

export type OverviewListingKpis = {
  publicadas: number;
  emAprovacao: number;
  incompletas: number;
  isLoading?: boolean;
};

interface RSV360DashboardProps {
  userName?: string;
  roleTitle?: string;
  onNewListing?: () => void;
  /** Série mensal (12 meses); se vazio, usa demo Lintel USD. */
  commissionSeries12M?: CommissionMonthPoint[] | null;
  commissionCurrency?: 'USD' | 'BRL';
  onOpenComissoes?: () => void;
  /** KPIs de unidades (`GET /acomodacoes/anfitriao/dashboard`). */
  listingKpis?: OverviewListingKpis | null;
  portfolioPins?: PortfolioMapPin[] | null;
  portfolioMapSummary?: string;
  featuredHeroListings?: OverviewHeroListing[] | null;
  carteiraContacts?: OverviewContactRow[] | null;
  carteiraContactsLoading?: boolean;
}

export default function RSV360ExecutiveDashboard({
  userName = 'Imani',
  roleTitle = 'Captador Executivo & Gestor de Carteira',
  onNewListing,
  commissionSeries12M = null,
  commissionCurrency = 'USD',
  onOpenComissoes,
  listingKpis = null,
  portfolioPins = null,
  portfolioMapSummary,
  featuredHeroListings = null,
  carteiraContacts = null,
  carteiraContactsLoading = false,
}: RSV360DashboardProps) {
  const kpiLoading = listingKpis?.isLoading === true;
  const kpiValue = (n: number | undefined) =>
    kpiLoading ? '…' : String(n ?? 0);
  // Controle de abas principais
  const [activeTab, setActiveTab] = useState<'overview' | 'rentals' | 'sales' | 'deals' | 'leads' | 'contacts'>('overview');
  const [period, setPeriod] = useState<'6M' | '12M'>('12M');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [voicePlaying, setVoicePlaying] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [overviewBootLoading, setOverviewBootLoading] = useState(true);
  const [portfolioMapExpanded, setPortfolioMapExpanded] = useState(false);
  const [activeMapPinId, setActiveMapPinId] = useState<string | null>(null);
  const [showBookViewingModal, setShowBookViewingModal] = useState(false);
  const [bookViewingForm, setBookViewingForm] = useState<BookViewingForm>({
    title: '',
    kind: 'Visita',
    assignedTo: 'Imani Brooks',
    date: '',
    time: '09:30',
    withContact: '—',
    property: 'Hollis Modern House',
  });

  const openBookViewingModal = () => {
    const today = new Date();
    const isoDate = today.toISOString().slice(0, 10);
    setBookViewingForm((prev) => ({
      ...prev,
      title: prev.title || 'Visita com cliente',
      date: prev.date || isoDate,
    }));
    setShowBookViewingModal(true);
  };

  useEffect(() => {
    if (activeTab !== 'overview') return;
    setOverviewBootLoading(true);
    const id = window.setTimeout(() => setOverviewBootLoading(false), OVERVIEW_BOOT_MS);
    return () => window.clearTimeout(id);
  }, [activeTab]);

  // Controle de recolher / expandir Live Chat
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [activeChatId, setActiveChatId] = useState<'hollis' | 'ashby' | 'omar' | 'nora'>('hollis');

  // Conversas completas do Live Chat
  const [chatThreads, setChatThreads] = useState({
    hollis: {
      id: 'hollis',
      name: 'Hollis',
      unreadBadge: 2,
      avatarImg: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=80&q=80',
      property: {
        name: 'Hollis Modern House',
        location: 'La Jolla · $1.24M',
        thumb: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=120&q=80'
      },
      messages: [
        {
          id: 'm1',
          sender: 'Spencer Hale',
          time: '10:30 AM',
          type: 'audio',
          audioDuration: '1:21',
          reactions: ['👍 1', '😊 2'],
          isSelf: false
        },
        {
          id: 'm2',
          sender: 'Jordan Ellis',
          time: '10:45 AM',
          type: 'text',
          text: 'Staging is booked for Thursday — the media room gets the dark sofa.',
          isSelf: false
        },
        {
          id: 'm3',
          sender: 'Imani Brooks',
          time: '8:45 AM',
          type: 'photos',
          photoCount: '6 photos · 298 KB',
          reactions: ['👏 1', '😊 2'],
          isSelf: true
        },
        {
          id: 'm4',
          sender: 'Spencer Hale',
          time: '9:30 AM',
          type: 'text',
          text: 'Can I see a photo of the upstairs, or other options nearby?',
          isSelf: false
        }
      ]
    },
    ashby: {
      id: 'ashby',
      name: 'Ashby',
      unreadBadge: 0,
      avatarInitials: 'AW',
      property: {
        name: 'Cedar Ridge House',
        location: 'Julian · $1.4M',
        thumb: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=120&q=80'
      },
      messages: [
        {
          id: 'a1',
          sender: 'Ashby White',
          time: '11:15 AM',
          type: 'text',
          text: 'Hi Imani! Did the buyer submit the proof of funds for Cedar Ridge yet?',
          isSelf: false
        },
        {
          id: 'a2',
          sender: 'Imani Brooks',
          time: '11:20 AM',
          type: 'text',
          text: 'Yes! Just reviewed the pre-approval letter and escrow deposit receipt.',
          isSelf: true
        },
        {
          id: 'a3',
          sender: 'Ashby White',
          time: '11:32 AM',
          type: 'text',
          text: 'Perfect. We can proceed with scheduling the home inspection for Monday.',
          reactions: ['👍 1'],
          isSelf: false
        }
      ]
    },
    omar: {
      id: 'omar',
      name: 'Omar',
      unreadBadge: 1,
      avatarImg: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80',
      property: {
        name: 'Hvar Cliff House',
        location: 'Del Mar · $3.45M',
        thumb: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=120&q=80'
      },
      messages: [
        {
          id: 'o1',
          sender: 'Omar Saleh',
          time: '9:10 AM',
          type: 'text',
          text: 'Good morning! We are ready to counter-offer at $3.35M with a 21-day escrow period.',
          isSelf: false
        },
        {
          id: 'o2',
          sender: 'Henrik Dahl',
          time: '9:25 AM',
          type: 'text',
          text: 'Understood Omar. Drafting the counter-addendum now for your signature.',
          reactions: ['👌 1'],
          isSelf: false
        },
        {
          id: 'o3',
          sender: 'Omar Saleh',
          time: '10:05 AM',
          type: 'text',
          text: 'Excellent, send it via DocuSign as soon as ready.',
          isSelf: false
        }
      ]
    },
    nora: {
      id: 'nora',
      name: 'Nora',
      unreadBadge: 0,
      avatarImg: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=80&q=80',
      property: {
        name: 'Stonebrook Cabin',
        location: 'Julian · $2,800/mo',
        thumb: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=120&q=80'
      },
      messages: [
        {
          id: 'n1',
          sender: 'Nora Whitfield',
          time: 'Yesterday',
          type: 'text',
          text: 'Hi Camila! The lease agreement looks great. Sent the security deposit via wire.',
          isSelf: false
        },
        {
          id: 'n2',
          sender: 'Camila Duarte',
          time: 'Yesterday',
          type: 'text',
          text: 'Deposit confirmed Nora! Keys and welcome packet are scheduled for delivery Friday.',
          reactions: ['🔑 1', '❤️ 1'],
          isSelf: true
        }
      ]
    }
  });

  // 1. Controle da Busca Global (Command Palette)
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  // 2. Controle do Modal "Novo anúncio for sale"
  const [showNewListingModal, setShowNewListingModal] = useState(false);
  const [newListingForm, setNewListingForm] = useState({
    name: '',
    address: '12 Juniper Court',
    neighborhood: 'North Park',
    price: '',
    type: 'House',
    beds: 3,
    baths: 2,
    sqft: '1800',
    seller: 'Elise Marchetti',
    agent: 'Imani Brooks'
  });

  // 4. Controle do Modal "Novo Contato"
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [newContactForm, setNewContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: 'La Jolla',
    kind: 'buyer' as 'buyer' | 'seller' | 'tenant' | 'landlord',
    budget: '$1.0M – $1.5M',
    agent: 'Imani Brooks'
  });

  // 5. Controle do Perfil do Contato e Chamada Telefônica
  const [selectedContactForProfile, setSelectedContactForProfile] = useState<any | null>(null);
  const [callingContact, setCallingContact] = useState<any | null>(null);

  // 6. Controle do Modal de Detalhes do Imóvel e Ranking de Agentes
  const [selectedPropertyModal, setSelectedPropertyModal] = useState<any | null>(null);
  const [viewingPropertyDetail, setViewingPropertyDetail] = useState<any | null>(null);
  const [propertySubTab, setPropertySubTab] = useState<string>('overview');
  const [showPriceMenu, setShowPriceMenu] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [planningTasks, setPlanningTasks] = useState([
    { stage: '1. Listagem', tasks: [
      { id: 'p1', title: 'Avaliação inicial acordada com proprietário', done: true },
      { id: 'p2', title: 'Sessão fotográfica profissional realizada', done: true },
      { id: 'p3', title: 'Planta baixa e medições conferidas', done: true },
      { id: 'p4', title: 'Declaração e autorização de venda assinadas', done: true }
    ]},
    { stage: '2. Marketing', tasks: [
      { id: 'p5', title: 'Anúncio publicado nos portais imobiliários', done: true },
      { id: 'p6', title: 'Vídeo / Reel do Instagram publicado', done: true },
      { id: 'p7', title: 'Disparo de e-mail marketing para compradores qualificados', done: false },
      { id: 'p8', title: 'Open house agendado', done: false }
    ]},
    { stage: '3. Visitas', tasks: [
      { id: 'p9', title: 'Horários de visita abertos na agenda', done: true },
      { id: 'p10', title: 'Coleta de feedback após cada visita', done: true },
      { id: 'p11', title: 'Segunda visita agendada com Priya Natarajan', done: true },
      { id: 'p12', title: 'Prazo limite para recebimento de propostas fixado', done: false }
    ]},
    { stage: '4. Fechamento', tasks: [
      { id: 'p13', title: 'Proposta preliminar aceita', done: false },
      { id: 'p14', title: 'Vistoria técnica detalhada (Home inspection)', done: false },
      { id: 'p15', title: 'Avaliação bancária / Laudo de engenharia', done: false },
      { id: 'p16', title: 'Escritura e entrega das chaves', done: false }
    ]}
  ]);
  const [propertyTasksList, setPropertyTasksList] = useState([
    { id: 't1', title: 'Visita presencial com Priya Natarajan', at: 'Hoje, 09:30', kind: 'Visita', done: true, who: 'Imani Brooks' },
    { id: 't2', title: 'Ligar para Elise Marchetti sobre contraproposta', at: 'Hoje, 11:00', kind: 'Ligação', done: true, who: 'Imani Brooks' },
    { id: 't3', title: 'Enviar pacote de certidões e matrícula atualizada', at: 'Amanhã, 10:00', kind: 'Documento', done: false, who: 'Henrik Dahl' },
    { id: 't4', title: 'Vistoria predial com engenheiro avaliador', at: 'Quinta, 14:00', kind: 'Inspeção', done: false, who: 'Jordan Ellis' }
  ]);
  const [targetPrice, setTargetPrice] = useState<number>(1.24);
  const [lowestAcceptable, setLowestAcceptable] = useState<number>(1.185);
  const [blueprintFloor, setBlueprintFloor] = useState<'ground' | 'upper'>('ground');
  const [agentRankingTab, setAgentRankingTab] = useState<'commission' | 'deals'>('commission');
  const [showActivityModal, setShowActivityModal] = useState(false);

  // Filtros de Leads
  const [leadIntent, setLeadIntent] = useState<'all' | 'buy' | 'rent' | 'sell'>('all');
  const [leadStatus, setLeadStatus] = useState<'all' | 'new' | 'contacted' | 'qualified' | 'viewing' | 'converted' | 'lost'>('all');
  const [leadSearch, setLeadSearch] = useState('');

  // Filtros de Deals (Kanban)
  const [dealType, setDealType] = useState<'all' | 'sale' | 'rent'>('all');
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string | null>(null);


  const defaultHollisProperty = {
    id: 'hollis-modern-house',
    name: 'Hollis Modern House',
    address: '2481 Hollis Lane, La Jolla',
    statusTag: 'For sale',
    price: '$1.24M',
    priceValue: 1.24,
    lowestAcceptableValue: 1.185,
    risk: 'High risk',
    pipeline: [
      { step: '1. Listing', avatars: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80'] },
      { step: '2. Marketing', avatars: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80'] },
      { step: '3. Viewings', avatars: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=80&q=80'] },
      { step: '4. Closing', avatars: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80'] }
    ],
    photos: [
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=80'
    ],
    propertyType: 'Detached house',
    propertyBadge: 'In progress',
    area: '2,380 ft²',
    floor: '2',
    beds: '4',
    baths: '3',
    offers: [
      { id: 'o1', name: 'Priya Natarajan', status: 'Viewing', statusColor: 'bg-indigo-500', amount: '$1.24M', delta: '+0.0%', pct: 100, initials: 'PN', bg: 'bg-amber-100 text-amber-900' },
      { id: 'o2', name: 'Spencer Hale', status: 'Negotiation', statusColor: 'bg-blue-500', amount: '$1.215M', delta: '-2.0%', pct: 85, initials: 'SH', bg: 'bg-gray-100 text-gray-800' },
      { id: 'o3', name: 'Marcus Adebayo', status: 'Offer', statusColor: 'bg-amber-500', amount: '$1.185M', delta: '-4.4%', pct: 60, img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80' }
    ],
    overviewTable: [
      { label: 'Tipo de solicitação', value: 'Venda' },
      { label: 'Ano de construção', value: '2019' },
      { label: 'Vendedor', value: 'Elise Marchetti', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80' },
      { label: 'Corretor responsável', value: 'Imani Brooks', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=80&q=80' },
      { label: 'Localização', value: 'La Jolla, San Diego, CA' },
      { label: 'Endereço', value: '2481 Hollis Lane, 92037' },
      { label: 'Estacionamento', value: '2 vagas' },
      { label: 'Tempo no mercado', value: '24 dias · desde 8 de out' },
      { label: 'Engajamento', value: '1.842 visualizações · 126 salvos · 31 contatos' },
      { label: 'Terreno', value: '5.200 ft²' }
    ],
    documents: [
      { name: 'Minuta do contrato de compra', type: 'Contrato', size: '412 KB' },
      { name: 'Relatório de vistoria predial', type: 'Relatório', size: '2.9 MB' }
    ],
    description: 'Casa contemporânea impecável de dois andares em uma via calma a cinco minutos da enseada. Revestimento vertical em cedro e acabamentos em branco envolvem uma planta aberta e banhada por luz natural; o pavimento superior conta com quatro quartos ao redor de um mezanino envidraçado, e o jardim externo foi projetado com paisagismo sustentável para tardes aconchegantes.',
    tags: ['Energia solar + bateria', 'Carregador Veicular EV', 'Revestimento em cedro', 'Guarda-corpo de vidro', 'Jardim sustentável', 'Automação Smart Home']
  };

  const getFullProperty = (propObj: any) => {
    if (!propObj) return defaultHollisProperty;
    const name = propObj.name || propObj.title || 'Hollis Modern House';
    const isMistfield = name.toLowerCase().includes('mistfield');
    const isCedar = name.toLowerCase().includes('cedar');
    const isHvar = name.toLowerCase().includes('hvar');
    
    if (isMistfield) {
      return {
        ...defaultHollisProperty,
        id: 'mistfield-cabin',
        name: 'Mistfield Cabin',
        address: '102 Mistfield Way, Julian',
        statusTag: 'For sale',
        price: '$780,000',
        priceValue: 0.78,
        lowestAcceptableValue: 0.74,
        propertyType: 'Mountain Cabin',
        area: '1,850 ft²',
        floor: '2',
        beds: '3',
        baths: '2',
        photos: [
          'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80'
        ],
        description: 'Refúgio rústico sofisticado situado nas colinas arborizadas de Julian, apresentando lareira de pedra natural, acabamentos artesanais e vista panorâmica para a floresta.'
      };
    }
    
    return {
      ...defaultHollisProperty,
      name: propObj.name || propObj.title || defaultHollisProperty.name,
      address: propObj.address || propObj.location || defaultHollisProperty.address,
      price: propObj.price || propObj.rent || defaultHollisProperty.price,
      photos: propObj.photo ? [propObj.photo, ...defaultHollisProperty.photos] : (propObj.img ? [propObj.img, ...defaultHollisProperty.photos] : defaultHollisProperty.photos)
    };
  };

  const handlePortfolioPinSelect = (pin: PortfolioMapPin) => {
    setActiveMapPinId(pin.id);
    setPortfolioMapExpanded(false);
    setViewingPropertyDetail(getFullProperty({ name: pin.title }));
    setActiveTab('sales');
    setPropertySubTab('overview');
  };

  const agendaNowLabel = new Date().toLocaleTimeString('pt-BR', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const tomorrowAgenda = [
    {
      id: 'tm1',
      time: '10:00',
      ampm: 'AM',
      title: 'Vistoria em Casa Alva',
      sub: 'Casa Alva · Henrik',
      icon: 'check' as const,
    },
    {
      id: 'tm2',
      time: '2:00',
      ampm: 'PM',
      title: 'Call de financiamento com Arjun',
      sub: 'Cedar Ridge House · Hana',
      icon: 'phone' as const,
    },
    {
      id: 'tm3',
      time: '4:00',
      ampm: 'PM',
      title: 'Visita com Aisha Rahman',
      sub: 'Marea Desert Villa · Imani',
      icon: 'check' as const,
    },
  ];

  const renderAgendaSideIcon = (item: {
    hasThumb?: boolean;
    thumb?: string;
    icon?: string;
  }) => {
    if (item.hasThumb && item.thumb) {
      return <img src={item.thumb} alt="" className="w-8 h-8 rounded-lg object-cover" />;
    }
    if (item.icon === 'phone') {
      return (
        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
          <Phone className="w-3.5 h-3.5" />
        </div>
      );
    }
    if (item.icon === 'key') {
      return (
        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
          <Key className="w-3.5 h-3.5" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
        <Check className="w-3.5 h-3.5" />
      </div>
    );
  };

  // 1. CARROSSEL DE IMÓVEIS (Overview)
  const defaultHeroListings = [
    {
      title: 'Hvar Cliff House',
      location: 'Del Mar',
      price: '$3.45M',
      beds: '4 bd',
      baths: '6 ba',
      sqft: '4,100 ft²',
      stats: '17 days listed · 1,607 views',
      tag: 'For sale',
      img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=80'
    },
    {
      title: 'Cedar Ridge House',
      location: 'Julian',
      price: '$1.4M',
      beds: '3 bd',
      baths: '3 ba',
      sqft: '2,160 ft²',
      stats: '73 days listed · 1,897 views',
      tag: 'For sale',
      img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80'
    }
  ];
  const heroListings =
    featuredHeroListings && featuredHeroListings.length > 0 ? featuredHeroListings : defaultHeroListings;
  const featuredCarouselListings = useMemo(
    () => mapOverviewHeroToCarousel(heroListings),
    [heroListings],
  );

  // 2. AGENDA DE HOJE
  const [agenda, setAgenda] = useState([
    { id: '1', time: '9:30', ampm: 'AM', title: 'Visita com Priya Natarajan', sub: 'Hollis Modern House · 45 min · Imani', done: true, hasThumb: true, thumb: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=120&q=80' },
    { id: '2', time: '11:00', ampm: 'AM', title: 'Ligar para Elise sobre a contraproposta', sub: 'Hollis Modern House · 20 min · Imani', done: false, icon: 'phone' },
    { id: '3', time: '12:30', ampm: 'PM', title: 'Fotógrafo em Larchwood', sub: 'Larchwood House · 90 min · Jordan', done: false, icon: 'check' },
    { id: '4', time: '3:00', ampm: 'PM', title: 'Visita com Spencer Hale', sub: 'Hollis Modern House · 45 min · Imani', done: false, hasThumb: true, thumb: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=120&q=80' },
    { id: '5', time: '4:30', ampm: 'PM', title: 'Assinar locação — Quayside 3C', sub: 'Quayside Apartments · 30 min · Camila', done: false, icon: 'key' },
    { id: '6', time: '6:00', ampm: 'PM', title: 'Enviar documentação de Hollis', sub: 'Hollis Modern House · 15 min · Imani', done: false, icon: 'check' }
  ]);

  const toggleAgenda = (id: string) => {
    setAgenda(prev => prev.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  // 3. RANKING DE AGENTES
  const agents = [
    { rank: 1, name: 'Imani Brooks', val: '$384.6K', sub: '92% of $420K target · Senior Agent', pct: 92, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80' },
    { rank: 2, name: 'Camila Duarte', val: '$170.6K', sub: '107% of $160K target · Leasing Manager', pct: 100, avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=80&q=80' },
    { rank: 3, name: 'Hana Seo', val: '$120.3K', sub: '67% of $180K target · Mortgage Advisor', pct: 67, avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=80&q=80' },
    { rank: 4, name: 'Henrik Dahl', val: '$103.3K', sub: '20% of $520K target · Managing Broker', pct: 20, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80' },
    { rank: 5, name: 'Jordan Ellis', val: '$45.8K', sub: '15% of $300K target · Listing Agent', pct: 15, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80' }
  ];

  // 4. ATIVIDADES
  const activities = [
    { name: 'Spencer', action: 'aumentou a proposta para $1.215M ·', prop: 'Hollis Modern House', time: '3 h ago', av: 'SH', avColor: 'bg-indigo-100 text-indigo-700' },
    { name: 'Imani', action: 'apresentou Hollis para Priya Natarajan ·', prop: 'Hollis Modern House', time: '4 h ago', avImg: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=60&q=80' },
    { name: 'Jordan', action: 'capturou lead do portal para', prop: 'Mistfield Cabin', time: '4 h ago', avImg: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=60&q=80' },
    { name: 'Jordan', action: 'enviou relatório de custos ·', prop: 'Hollis Modern House', time: '6 h ago', avImg: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=60&q=80' },
    { name: 'Henrik', action: 'reduziu Cedar Ridge para $1.395M ·', prop: 'Cedar Ridge House', time: '1 d ago', avImg: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=60&q=80' },
    { name: 'Camila', action: 'alugou Stonebrook Cabin para Nora Whitfield', prop: 'Stonebrook Cabin', time: '1 d ago', avImg: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=60&q=80' },
    { name: 'Henrik', action: 'fechou venda de Linden Long House por $1.56M', prop: 'Linden Long House', time: '4 d ago', avImg: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=60&q=80' }
  ];

  // 5. LISTA COMPLETA DOS 14 LEADS (Inclusão fiel com todas as métricas)
  const leadsData = [
    { id: 'l1', name: 'Nadia Petrova', status: 'new', intent: 'buy', amount: '$1.25M', area: 'La Jolla', beds: '4 bd', msg: 'Saw Hollis on your site — is the garden south-facing?', src: 'Website', time: '34 min ago', score: 65, thumb: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=120&q=80', initials: 'NP' },
    { id: 'l2', name: 'Chris Navarro', status: 'new', intent: 'buy', amount: '$780K', area: 'Julian', beds: '2 bd', msg: 'Is Mistfield Cabin still available? Could view Sunday.', src: 'Listing portal', time: '1 h ago', score: 81, thumb: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=120&q=80', initials: 'CN' },
    { id: 'l6', name: 'Fatima Zahra', status: 'new', intent: 'sell', amount: '$2M', area: 'Del Mar', beds: '4 bd', msg: 'Thinking of selling our place on Camino Del Mar this year.', src: 'Website', time: '2 h ago', score: 74, initials: 'FZ' },
    { id: 'l12', name: 'Isabel Duarte', status: 'new', intent: 'rent', amount: '$4,500/mo', area: 'Downtown', beds: '2 bd', msg: 'Is the Northbank loft with the mezzanine still open?', src: 'Listing portal', time: '4 h ago', score: 72, thumb: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=120&q=80', initials: 'ID' },
    { id: 'l9', name: 'Tomás Silva', status: 'viewing', intent: 'rent', amount: '$6,800/mo', area: 'Rancho Santa Fe', beds: '3 bd', msg: 'Furnished for a year while we build.', src: 'Walk-in', time: '1 d ago', score: 84, thumb: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=120&q=80', initials: 'TS' },
    { id: 'l8', name: 'Mei Lin', status: 'qualified', intent: 'buy', amount: '$3.4M', area: 'Del Mar', beds: '4 bd', msg: 'Referred by Omar Saleh. Wants ocean, nothing else.', src: 'Referral', time: '4 d ago', score: 72, thumb: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=120&q=80', initials: 'ML' },
    { id: 'l14', name: 'Ama Owusu', status: 'qualified', intent: 'sell', amount: '$1.1M', area: 'North Park', beds: '3 bd', msg: 'Valuation for a craftsman bungalow on 30th Street.', src: 'Website', time: 'Oct 21', score: 77, initials: 'AO' },
    { id: 'l7', name: 'Oliver Grant', status: 'contacted', intent: 'rent', amount: '$3,300/mo', area: 'North Park', beds: '1 bd', msg: 'Can I bring a small dog to Quayside?', src: 'Listing portal', time: 'Oct 17', score: 95, thumb: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=120&q=80', initials: 'OG' },
    { id: 'l10', name: 'Hannah Cole', status: 'lost', intent: 'buy', amount: '$900K', area: 'Encinitas', beds: '2 bd', msg: 'Bought elsewhere — thanks!', src: 'Instagram', time: 'Oct 16', score: 15, initials: 'HC' },
    { id: 'l11', name: 'Kofi Mensah', status: 'converted', intent: 'buy', amount: '$1.4M', area: 'Julian', beds: '3 bd', msg: 'Loved Cedar Ridge — let’s talk numbers.', src: 'Website', time: 'Oct 15', score: 72, initials: 'KM' },
    { id: 'l3', name: 'Yuki Mori', status: 'contacted', intent: 'rent', amount: '$4,200/mo', area: 'Little Italy', beds: '2 bd', msg: 'Relocating from Tokyo with my company in July.', src: 'Referral', time: 'Oct 12', score: 56, initials: 'YM' },
    { id: 'l5', name: 'Jonas Becker', status: 'viewing', intent: 'buy', amount: '$1.15M', area: 'Encinitas', beds: '3 bd', msg: 'Came to Larchwood on Sunday, want a second look.', src: 'Open house', time: 'Oct 13', score: 78, thumb: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=120&q=80', initials: 'JB' },
    { id: 'l4', name: 'Elena Rossi', status: 'qualified', intent: 'buy', amount: '$1.7M', area: 'Palm Springs', beds: '3 bd', msg: 'The desert villa reel stopped me scrolling. Pool size?', src: 'Instagram', time: 'Oct 5', score: 91, thumb: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=120&q=80', initials: 'ER' },
    { id: 'l13', name: 'Sam Whitaker', status: 'contacted', intent: 'buy', amount: '$1.3M', area: 'La Jolla', beds: '3 bd', msg: 'Liked Hollis but the upstairs felt small. Plans?', src: 'Open house', time: 'Oct 4', score: 55, thumb: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=120&q=80', initials: 'SW' }
  ];

  // Filtragem dinâmica dos leads
  const filteredLeads = leadsData.filter(l => {
    if (leadIntent !== 'all' && l.intent !== leadIntent) return false;
    if (leadStatus !== 'all' && l.status !== leadStatus) return false;
    if (leadSearch && !l.name.toLowerCase().includes(leadSearch.toLowerCase()) && !l.msg.toLowerCase().includes(leadSearch.toLowerCase())) return false;
    return true;
  });

  // 6. COLUNAS DO BOARD DEALS (Kanban interativo)
  const dealsColumns = [
    {
      id: 'viewing',
      title: 'Visita',
      count: 3,
      total: '$3.98M',
      color: 'bg-gray-200 dark:bg-gray-700',
      deals: [
        { title: 'Hollis Modern House', client: 'Priya Natarajan', price: '$1,240,000', delta: 'At ask', deltaType: 'mint', left: 'Dec 15 · 45 d left', agent: 'Jordan Ellis', img: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=200&q=80' },
        { title: 'Marea Desert Villa', client: 'Aisha Rahman', price: '$1,650,000', delta: '-1.8%', deltaType: 'cobalt', left: 'Dec 10 · 40 d left', agent: 'Imani Brooks', img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=200&q=80' },
        { title: 'Larchwood House', client: 'Ben Okoro', price: '$1,090,000', delta: '-2.7%', deltaType: 'cobalt', left: 'Dec 20 · 50 d left', agent: 'Jordan Ellis', img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=200&q=80' }
      ]
    },
    {
      id: 'offer',
      title: 'Proposta',
      count: 3,
      total: '$2.5M',
      color: 'bg-[#ff8a3d]',
      deals: [
        { title: 'Hollis Modern House', client: 'Marcus Adebayo', price: '$1,185,000', delta: '-4.4%', deltaType: 'apricot', left: 'Dec 4 · 34 d left', agent: 'Imani Brooks', img: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=200&q=80' },
        { title: 'Cedar Ridge House', client: 'Arjun Patel', price: '$1,310,000', delta: '-6.1%', deltaType: 'apricot', left: 'Dec 8 · 38 d left', agent: 'Jordan Ellis', img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=200&q=80' },
        { title: 'Hearth Pavilion', client: 'Sara Lindholm', price: '$6,600/mo', delta: '-4.3%', deltaType: 'apricot', left: 'Nov 14 · 14 d left', agent: 'Camila Duarte', img: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=200&q=80' }
      ]
    },
    {
      id: 'negotiation',
      title: 'Negociação',
      count: 4,
      total: '$5.25M',
      color: 'bg-[#2f5bea]',
      deals: [
        { title: 'Hollis Modern House', client: 'Spencer Hale', price: '$1,215,000', delta: '-2.0%', deltaType: 'cobalt', left: 'Nov 28 · 28 d left', agent: 'Imani Brooks', img: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=200&q=80' },
        { title: 'Hvar Cliff House', client: 'Omar Saleh', price: '$3,300,000', delta: '-4.3%', deltaType: 'apricot', left: 'Nov 30 · 30 d left', agent: 'Henrik Dahl', img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=200&q=80' },
        { title: 'Mistfield Cabin', client: 'Arjun Patel', price: '$730,000', delta: '-2.0%', deltaType: 'cobalt', left: 'Nov 26 · 26 d left', agent: 'Imani Brooks', img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=200&q=80' },
        { title: 'Arbor Tower', client: 'Ren Takeda', price: '$3,700/mo', delta: '-3.9%', deltaType: 'apricot', left: 'Nov 18 · 18 d left', agent: 'Camila Duarte', img: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=200&q=80' }
      ]
    },
    {
      id: 'contract',
      title: 'Em contrato',
      count: 3,
      total: '$3.99M',
      color: 'bg-[#121722] dark:bg-white',
      deals: [
        { title: 'Casa Alva', client: 'Omar Saleh', price: '$2,120,000', delta: '-1.4%', deltaType: 'cobalt', left: 'Nov 12 · 12 d left', agent: 'Henrik Dahl', img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=200&q=80' },
        { title: 'Palm Court Residence', client: 'Aisha Rahman', price: '$1,870,000', delta: '-1.1%', deltaType: 'cobalt', left: 'Nov 9 · 9 d left', agent: 'Jordan Ellis', img: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=200&q=80' },
        { title: 'Quayside Apartments', client: 'Grace Liu', price: '$3,200/mo', delta: 'At ask', deltaType: 'mint', left: 'Nov 5 · 5 d left', agent: 'Camila Duarte', img: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=200&q=80' }
      ]
    },
    {
      id: 'closed',
      title: 'Fechados no mês',
      count: 4,
      total: '$5.23M',
      color: 'bg-[#138a63]',
      deals: [
        { title: 'Linden Long House', client: 'Omar Saleh', price: '$1,560,000', delta: 'At ask', deltaType: 'mint', left: 'Closed Oct 27', agent: 'Imani Brooks', img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=200&q=80' },
        { title: 'Casa Alva', client: 'Marcus Adebayo', price: '$2,195,000', delta: '+2.1%', deltaType: 'mint', left: 'Closed Oct 12', agent: 'Imani Brooks', img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=200&q=80' }
      ]
    }
  ];

  // 7. DATASETS DE RENTALS
  const [rentalsFilter, setRentalsFilter] = useState<'all' | 'vacant' | 'let'>('all');
  const [rentalsSearch, setRentalsSearch] = useState('');
  const rentalsData = [
    { id: 'r1', name: 'Arbor Tower', address: '1240 5th Ave', area: 'Downtown', units: 48, occupied: 44, rent: '$3,700/mo', roll: '$177,600/mo', type: 'High-rise', photo: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80' },
    { id: 'r2', name: 'Northbank Lofts', address: '880 Front St', area: 'Marina', units: 36, occupied: 31, rent: '$4,200/mo', roll: '$130,200/mo', type: 'Lofts', photo: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80' },
    { id: 'r3', name: 'Quayside Apartments', address: '210 Harbor Dr', area: 'Embarcadero', units: 18, occupied: 17, rent: '$3,200/mo', roll: '$54,400/mo', type: 'Waterfront', photo: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=600&q=80' },
    { id: 'r4', name: 'Stonebrook Cabin', address: '44 Pine Rd', area: 'Julian', units: 3, occupied: 3, rent: '$2,800/mo', roll: '$8,400/mo', type: 'Cabin', photo: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80' }
  ];

  // 8. DATASETS DE SALES
  const [salesViewMode, setSalesViewMode] = useState<'grid' | 'list'>('grid');
  const [salesStatusFilter, setSalesStatusFilter] = useState<'all' | 'active' | 'offer' | 'sold'>('all');
  const [salesSearch, setSalesSearch] = useState('');
  const salesData = [
    { id: 's1', name: 'Hvar Cliff House', address: '420 Cliff Dr', area: 'Del Mar', price: '$3,450,000', estimate: '$3,600,000', beds: 4, baths: 6, sqft: '4,100', dom: 17, views: 1607, status: 'active', agent: 'Henrik Dahl', photo: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80' },
    { id: 's2', name: 'Cedar Ridge House', address: '710 Pinecrest', area: 'Julian', price: '$1,400,000', estimate: '$1,310,000', beds: 3, baths: 3, sqft: '2,160', dom: 73, views: 1897, status: 'active', agent: 'Jordan Ellis', photo: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80' },
    { id: 's3', name: 'Hollis Modern House', address: '18 Hollis Ct', area: 'La Jolla', price: '$1,240,000', estimate: '$1,215,000', beds: 4, baths: 3, sqft: '2,800', dom: 45, views: 2410, status: 'offer', agent: 'Imani Brooks', photo: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80' },
    { id: 's4', name: 'Marea Desert Villa', address: '55 Ocotillo', area: 'Palm Springs', price: '$1,650,000', estimate: '$1,680,000', beds: 3, baths: 4, sqft: '3,200', dom: 40, views: 3120, status: 'offer', agent: 'Imani Brooks', photo: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80' },
    { id: 's5', name: 'Linden Long House', address: '93 Linden Way', area: 'Coronado', price: '$1,560,000', estimate: '$1,560,000', beds: 4, baths: 3, sqft: '2,900', dom: 28, views: 1980, status: 'sold', agent: 'Henrik Dahl', photo: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80' },
    { id: 's6', name: 'Casa Alva', address: '14 Alva Mesa', area: 'Rancho Santa Fe', price: '$2,195,000', estimate: '$2,150,000', beds: 5, baths: 5, sqft: '4,600', dom: 35, views: 2890, status: 'sold', agent: 'Imani Brooks', photo: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80' }
  ];

  // 9. DATASETS DE CONTACTS
  const [contactsSearch, setContactsSearch] = useState('');
  const [contactsKindFilter, setContactsKindFilter] = useState<'all' | 'buyer' | 'seller' | 'tenant' | 'landlord'>('all');
  const [contactsData, setContactsData] = useState([
    { id: 'c1', name: 'Priya Natarajan', kind: 'buyer', email: 'priya.n@gmail.com', phone: '+1 (858) 555-0192', city: 'La Jolla', budget: '$1.2M – $1.4M', agent: 'Imani Brooks', lastContact: 'Today', favorite: true },
    { id: 'c2', name: 'Spencer Hale', kind: 'buyer', email: 'spencer.h@outlook.com', phone: '+1 (619) 555-0144', city: 'La Jolla', budget: '$1.1M – $1.3M', agent: 'Imani Brooks', lastContact: '21 min ago', favorite: true },
    { id: 'c3', name: 'Omar Saleh', kind: 'seller', email: 'o.saleh@investments.co', phone: '+1 (858) 555-0188', city: 'Del Mar', budget: '$3M – $4M', agent: 'Henrik Dahl', lastContact: '1 d ago', favorite: false },
    { id: 'c4', name: 'Camila Duarte', kind: 'tenant', email: 'camila.d@creative.io', phone: '+1 (619) 555-0173', city: 'Downtown', budget: '$4K – $5K /mo', agent: 'Camila Duarte', lastContact: '3 d ago', favorite: false },
    { id: 'c5', name: 'Marcus Adebayo', kind: 'buyer', email: 'marcus.a@adebayo.org', phone: '+1 (760) 555-0112', city: 'Rancho Santa Fe', budget: '$2M – $2.5M', agent: 'Imani Brooks', lastContact: 'Oct 12', favorite: true },
    { id: 'c6', name: 'Grace Liu', kind: 'tenant', email: 'grace.liu@techsd.com', phone: '+1 (858) 555-0131', city: 'Marina', budget: '$3K – $3.5K /mo', agent: 'Camila Duarte', lastContact: 'Nov 5', favorite: false },
    { id: 'c7', name: 'Ben Okoro', kind: 'buyer', email: 'ben.okoro@biotech.com', phone: '+1 (619) 555-0165', city: 'Encinitas', budget: '$1M – $1.2M', agent: 'Jordan Ellis', lastContact: 'Oct 20', favorite: false }
  ]);

  const effectiveContacts = carteiraContacts ?? contactsData;

  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-200 ${
        isDarkMode ? 'bg-[#0e1117] text-[#eef1f6]' : 'bg-slate-50 text-[#121722]'
      }`}
      style={{
        backgroundImage: isDarkMode
          ? 'radial-gradient(circle at 10% 10%, rgba(47,91,234,0.15), transparent 45%), radial-gradient(circle at 90% 80%, rgba(255,138,61,0.1), transparent 45%)'
          : 'radial-gradient(circle at 0% 0%, rgba(211,220,250,0.45) 0%, transparent 45%), radial-gradient(circle at 100% 100%, rgba(251,220,198,0.45) 0%, transparent 45%), radial-gradient(circle at 50% 100%, rgba(210,235,226,0.4) 0%, transparent 40%)'
      }}
    >
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 py-4">

        {/* ========================================================================= */}
        {/* TOP NAVIGATION BAR                                                        */}
        {/* ========================================================================= */}
        <header className="grid grid-cols-[auto_1fr_auto] items-center gap-4 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#121722] dark:bg-white text-white dark:text-[#121722] flex items-center justify-center shadow-md">
              <Building className="w-5 h-5" />
            </div>
            <span className="text-xl font-black tracking-wider uppercase">RSV360°</span>
          </div>

          <nav className="flex justify-center">
            <div className="inline-flex items-center p-1 bg-white/70 dark:bg-[#1d222c]/80 backdrop-blur-md border border-white/80 dark:border-white/10 rounded-full shadow-sm gap-0.5">
              {[
                { id: 'overview', label: 'Visão Geral' },
                { id: 'rentals', label: 'Locações' },
                { id: 'sales', label: 'Vendas' },
                { id: 'deals', label: 'Negócios', badge: '6' },
                { id: 'leads', label: 'Leads', badge: '4' },
                { id: 'contacts', label: 'Contatos' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    if (tab.id === 'sales') {
                      setViewingPropertyDetail(defaultHollisProperty);
                    } else {
                      setViewingPropertyDetail(null);
                    }
                  }}
                  className={lintelNavTab(
                    activeTab === tab.id || !!(viewingPropertyDetail && tab.id === 'sales'),
                  )}
                >
                  {tab.label}
                  {'badge' in tab && tab.badge ? <LintelNavTabBadge value={tab.badge} /> : null}
                </button>
              ))}
            </div>
          </nav>

          <LintelHeaderActions
            onDarkModeChange={setIsDarkMode}
            onOpenCommandPalette={() => setShowSearchModal(true)}
          />
        </header>

        {/* ========================================================================= */}
        {/* TELA DE DETALHES COMPLETOS DO IMÓVEL (Ex: Hollis Modern House / Mistfield) */}
        {/* ========================================================================= */}
        {viewingPropertyDetail && (
          <div className="flex flex-col gap-5 animate-in fade-in duration-200">
            {/* Top Bar com Botão Voltar, Título, Ações e Download/Print */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setViewingPropertyDetail(null)}
                  className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1f29] shadow-xs flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
                  title="Ver Todos os Imóveis à Venda"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
                      {viewingPropertyDetail.name}
                    </h1>
                    {/* Action pill icons */}
                    <div className="hidden sm:flex items-center gap-1.5 ml-2">
                      <button className="w-8 h-8 rounded-full bg-white dark:bg-[#1a1f29] border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                        <Building className="w-3.5 h-3.5" />
                      </button>
                      <button className="w-8 h-8 rounded-full bg-white dark:bg-[#1a1f29] border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                        <Bookmark className="w-3.5 h-3.5" />
                      </button>
                      <button className="w-8 h-8 rounded-full bg-white dark:bg-[#1a1f29] border border-gray-200 dark:border-gray-700 flex items-center justify-center text-amber-500 hover:scale-105">
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <button className="w-8 h-8 rounded-full bg-white dark:bg-[#1a1f29] border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                        <Tag className="w-3.5 h-3.5" />
                      </button>
                      <button className="w-8 h-8 rounded-full bg-white dark:bg-[#1a1f29] border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                        <MapPin className="w-3.5 h-3.5" />
                      </button>
                      <button className="w-8 h-8 rounded-full bg-white dark:bg-[#1a1f29] border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button className="w-8 h-8 rounded-full bg-white dark:bg-[#1a1f29] border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      {viewingPropertyDetail.address}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[11px] font-bold">
                      • {viewingPropertyDetail.statusTag || 'For sale'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botões Download & Print */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => alert('Download do dossiê completo iniciado.')}
                  className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1f29] text-gray-700 dark:text-gray-200 text-xs font-bold shadow-2xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Baixar Dossiê
                </button>
                <button
                  type="button"
                  onClick={() => setViewingPropertyDetail(null)}
                  className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1f29] text-gray-700 dark:text-gray-200 text-xs font-bold shadow-2xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Building className="w-3.5 h-3.5" /> Ver Lista de Imóveis
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2 rounded-full bg-[#121722] text-white dark:bg-white dark:text-[#121722] text-xs font-black shadow-md hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir Ficha
                </button>
              </div>
            </div>

            {/* Pipeline Stages Header */}
            <div className="p-3 rounded-2xl bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur-md shadow-xs flex items-center justify-between overflow-x-auto gap-4">
              <div className="flex items-center gap-2 min-w-max">
                <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                  <Filter className="w-3.5 h-3.5" />
                </div>
              </div>

              {(viewingPropertyDetail.pipeline || [
                { step: '1. Listagem', avatars: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80'] },
                { step: '2. Marketing', avatars: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80'] },
                { step: '3. Visitas', avatars: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80'] },
                { step: '4. Fechamento', avatars: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80'] }
              ]).map((st: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2 min-w-max">
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{st.step}</span>
                  <div className="flex items-center -space-x-1.5">
                    {st.avatars?.map((av: string, avIdx: number) => (
                      <img key={avIdx} src={av} alt="" className="w-6 h-6 rounded-full object-cover ring-2 ring-white dark:ring-[#171b23]" />
                    ))}
                    <button className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-[10px] text-gray-400 font-bold hover:text-gray-800">
                      +
                    </button>
                  </div>
                  {idx < 3 && <span className="text-gray-300 dark:text-gray-700 ml-2">····</span>}
                </div>
              ))}
            </div>

            {/* Sub-Tabs de Navegação */}
            <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-800 overflow-x-auto pb-1 text-xs font-bold text-gray-500">
              {[
                { id: 'overview', label: 'Visão Geral' },
                { id: 'planning', label: 'Planejamento' },
                { id: 'activities', label: 'Atividades' },
                { id: 'history', label: 'Histórico' },
                { id: 'tasks', label: 'Tarefas' },
                { id: 'documents', label: 'Documentos' },
                { id: 'media', label: 'Mídia e Fotos' },
                { id: 'map', label: 'No Mapa' },
                { id: 'owner', label: 'O Proprietário' }
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setPropertySubTab(sub.id)}
                  className={`px-3 py-2 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                    propertySubTab === sub.id
                      ? 'border-[#121722] dark:border-white text-gray-900 dark:text-white'
                      : 'border-transparent hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {/* CONTEÚDO PRINCIPAL: BASEADO NA SUB-ABA SELECIONADA */}
            
            {/* 1. SUB-ABA: VISÃO GERAL (OVERVIEW - Pixel Perfect Lintel) */}
            
            {propertySubTab === 'overview' && (() => {
              const minP = 1.0;
              const maxP = 1.5;

              // Dynamic Status & Colors: "Fair price" (green) vs "High risk" (red/rose) vs "Below market"
              const isHighRisk = targetPrice > 1.22;
              const isFairPrice = targetPrice >= 1.15 && targetPrice <= 1.22;
              const statusLabel = isHighRisk ? 'High risk' : isFairPrice ? 'Fair price' : 'Below market';
              const statusBadgeColor = isHighRisk 
                ? 'bg-rose-500/10 text-rose-500 border border-rose-200/50' 
                : isFairPrice 
                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-200/50' 
                : 'bg-blue-500/10 text-blue-600 border border-blue-200/50';

              const deltaMarket = targetPrice - 1.185;
              const deltaPct = ((deltaMarket / 1.185) * 100).toFixed(1);

              return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-in fade-in duration-150">

                {/* COLUNA ESQUERDA (5 colunas no LG) */}
                <div className="lg:col-span-5 flex flex-col gap-5">

                  {/* 1. PRICE GAUGE & SLIDER WIDGET (Pixel-Perfect Lintel Design) */}
                  <div className="rounded-[24px] bg-white dark:bg-[#171b23] border border-slate-100/80 dark:border-white/5 shadow-xs p-6 relative">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                        <DollarSign className="w-4 h-4 text-slate-500" /> Price
                      </h3>
                      
                      {/* Menu 3 pontos do Preço */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowPriceMenu(prev => !prev)}
                          className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {/* POPUP MENU DO PREÇO */}
                        {showPriceMenu && (
                          <div className="absolute right-0 top-9 w-64 rounded-2xl bg-white dark:bg-[#1c212c] border border-slate-200/80 dark:border-slate-700 shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                setTargetPrice(1.185);
                                setShowPriceMenu(false);
                                setCopyFeedback('Matched to market estimate ($1.185M)!');
                                setTimeout(() => setCopyFeedback(null), 3000);
                              }}
                              className="flex items-center gap-2.5 w-full p-2.5 rounded-xl text-left font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-750 transition-all cursor-pointer"
                            >
                              <TrendingUp className="w-4 h-4 text-[#2f5bea]" />
                              <span>Match the market estimate</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(`$${targetPrice.toFixed(2)}M`);
                                setShowPriceMenu(false);
                                setCopyFeedback('Price copied to clipboard!');
                                setTimeout(() => setCopyFeedback(null), 3000);
                              }}
                              className="flex items-center gap-2.5 w-full p-2.5 rounded-xl text-left font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-750 transition-all cursor-pointer"
                            >
                              <Copy className="w-4 h-4 text-slate-500" />
                              <span>Copy price</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setShowPriceMenu(false);
                                setPropertySubTab('history');
                              }}
                              className="flex items-center gap-2.5 w-full p-2.5 rounded-xl text-left font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-750 transition-all cursor-pointer"
                            >
                              <History className="w-4 h-4 text-[#ff8a3d]" />
                              <span>Price history</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Feedback Toast */}
                    {copyFeedback && (
                      <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] font-bold px-3.5 py-1.5 rounded-full shadow-xl z-50 animate-in fade-in">
                        {copyFeedback}
                      </div>
                    )}

                    <LintelSemiCircularPriceGauge targetPriceM={targetPrice} minM={minP} maxM={maxP} />

                    {/* Sliders: Target Price & Lowest Acceptable com Marcadores Verticais (Ruler Ticks) */}
                    <div className="grid grid-cols-2 gap-5 mt-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500 font-semibold block">Target price</span>
                          <span className={`text-[11px] font-black ${isHighRisk ? 'text-rose-500' : 'text-emerald-600'}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1.5 mt-0.5 mb-1.5">
                          <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight">${targetPrice.toFixed(2)}M</span>
                        </div>
                        {/* Styled Range Track interativo */}
                        <div className="relative flex items-center">
                          <input
                            type="range"
                            min="1.0"
                            max="1.5"
                            step="0.01"
                            value={targetPrice}
                            onChange={(e) => setTargetPrice(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                        </div>
                        {/* Marcadores verticais réplica exata do Lintel */}
                        <div className="flex justify-between items-end h-3 mt-1.5 px-0.5 opacity-60">
                          {Array.from({ length: 24 }).map((_, i) => (
                            <span key={i} className={`w-px ${i % 4 === 0 ? 'h-3 bg-red-400' : 'h-1.5 bg-slate-300 dark:bg-slate-600'}`} />
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500 font-semibold block">Lowest acceptable</span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            ${Math.round((targetPrice - lowestAcceptable) * 1000)}K room
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1.5 mt-0.5 mb-1.5">
                          <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight">${lowestAcceptable.toFixed(3)}M</span>
                        </div>
                        <div className="relative flex items-center">
                          <input
                            type="range"
                            min="0.9"
                            max="1.3"
                            step="0.005"
                            value={lowestAcceptable}
                            onChange={(e) => setLowestAcceptable(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-900 dark:accent-white"
                          />
                        </div>
                        <div className="flex justify-between items-end h-3 mt-1.5 px-0.5 opacity-60">
                          {Array.from({ length: 24 }).map((_, i) => (
                            <span key={i} className={`w-px ${i % 4 === 0 ? 'h-3 bg-slate-600 dark:bg-slate-400' : 'h-1.5 bg-slate-300 dark:bg-slate-600'}`} />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Alert Box Rosa Suave ou Verde se Justo */}
                    <div className={`mt-4 p-3 rounded-2xl text-xs flex items-center gap-2 border ${
                      isHighRisk 
                        ? 'bg-rose-50/80 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-300'
                        : 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300'
                    }`}>
                      <span className="font-bold">{isHighRisk ? '⚠' : '✓'}</span>
                      <p className="leading-snug">
                        The price is <b>{Math.abs(Number(deltaPct))}%</b> {deltaMarket >= 0 ? 'above' : 'below'} the market estimate of $1.185M {isHighRisk ? '— expect fewer viewings.' : '— competitive positioning.'}
                      </p>
                    </div>

                    {/* Botões Cancel e Save Changes (Estilo pílula: rounded-full px-6 py-2.5, Save changes: bg-slate-900 text-white) */}
                    <div className="flex items-center gap-3 mt-4 pt-2">
                      <button
                        type="button"
                        onClick={() => { setTargetPrice(1.24); setLowestAcceptable(1.185); }}
                        className="flex-1 py-2.5 px-6 rounded-full border border-slate-200 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-xs text-center"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => alert('Changes saved successfully!')}
                        className="flex-1 py-2.5 px-6 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-black shadow-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-all cursor-pointer text-center"
                      >
                        Save changes
                      </button>
                    </div>
                  </div>

                  {/* 2. OFFERS LIST WIDGET (Clean justify-between, No blue horizontal bars) */}
                  <div className="rounded-[24px] bg-white dark:bg-[#171b23] border border-slate-100/80 dark:border-white/5 shadow-xs p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-slate-500" />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Offers</h3>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                          {viewingPropertyDetail.offers?.length || 3} open
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => alert('Record offer modal')}
                        className="text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-black dark:hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        + Record
                      </button>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      {(viewingPropertyDetail.offers || defaultHollisProperty.offers).map((offer: any) => (
                        <div key={offer.id} className="p-3 rounded-2xl bg-slate-50/70 dark:bg-[#1d222c] border border-slate-100/80 dark:border-white/5 flex items-center justify-between gap-3 hover:bg-slate-100/60 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            {offer.img ? (
                              <img src={offer.img} alt="" className="w-9 h-9 rounded-full object-cover" />
                            ) : (
                              <div className={`w-9 h-9 rounded-full font-black text-xs flex items-center justify-center ${offer.bg || 'bg-amber-100 text-amber-900'}`}>
                                {offer.initials || offer.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{offer.name}</h4>
                              <span className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <span className={`w-2 h-2 rounded-full ${offer.statusColor || 'bg-blue-500'}`} />
                                {offer.status}
                              </span>
                            </div>
                          </div>

                          {/* Alinhado à direita com valor e percentagem (sem barras de progresso) */}
                          <div className="text-right">
                            <span className="text-sm font-black text-slate-900 dark:text-white block tracking-tight">{offer.amount}</span>
                            <span className={`text-[11px] font-bold ${offer.delta.startsWith('+') ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {offer.delta}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. DOCUMENTS WIDGET */}
                  <div className="rounded-[24px] bg-white dark:bg-[#171b23] border border-slate-100/80 dark:border-white/5 shadow-xs p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                        <FileText className="w-4 h-4 text-slate-500" /> Documents
                      </h3>
                      <button
                        type="button"
                        onClick={() => setPropertySubTab('documents')}
                        className="text-xs font-bold text-[#2f5bea] hover:underline cursor-pointer"
                      >
                        View all 6
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(viewingPropertyDetail.documents || defaultHollisProperty.documents).map((doc: any, i: number) => (
                        <div key={i} className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-[#1d222c] border border-slate-100/80 dark:border-white/5 shadow-2xs flex flex-col justify-between">
                          <div className="p-3 bg-white dark:bg-slate-800/60 rounded-xl mb-2 flex flex-col gap-1.5 border border-slate-100 dark:border-slate-700">
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                              <span className="truncate max-w-[120px]">{doc.name}</span>
                              <Download className="w-3 h-3 text-slate-400" />
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full" />
                            <div className="w-4/5 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full" />
                            <div className="w-2/3 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{doc.name}</h4>
                            <span className="text-[10px] text-slate-400">{doc.type} · {doc.size}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* COLUNA DIREITA (7 colunas no LG) */}
                <div className="lg:col-span-7 flex flex-col gap-5">

                  {/* 1. PREVIEW PHOTO CAROUSEL & FLOOR PLANS BLUEPRINTS (Pixel-Perfect Lintel: Edge-to-Edge p-0, Full-Bleed rounded-xl, Overlaid Badges top-4 left-4, Borderless Atributos) */}
                  <div className="rounded-[24px] bg-white dark:bg-[#171b23] border border-slate-100/80 dark:border-white/5 shadow-xs overflow-hidden">
                    {/* Header do Preview com padding */}
                    <div className="flex items-center justify-between px-6 pt-5 pb-3">
                      <h3 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                        <Eye className="w-4 h-4 text-slate-500" /> Preview
                      </h3>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                        <span>1 / 6</span>
                        <button className="text-slate-400 hover:text-slate-600">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Área da Foto e Floor Plans: Edge-to-Edge p-4 sm:p-5 */}
                    <div className="px-6 pb-6">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                        {/* Edge-to-edge Main Photo: container p-0 com rounded-xl e full-bleed */}
                        <div className="md:col-span-8 rounded-xl overflow-hidden shadow-xs">
                          <Carousel
                            listings={(
                              viewingPropertyDetail.photos?.length
                                ? viewingPropertyDetail.photos
                                : [
                                    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=80',
                                  ]
                            ).map((photo: string, index: number) => ({
                              id: `property-photo-${index}`,
                              name: viewingPropertyDetail.name,
                              address: viewingPropertyDetail.location ?? '',
                              price: viewingPropertyDetail.price ?? '',
                              img: photo,
                              tag: viewingPropertyDetail.propertyType || 'Detached house',
                            }))}
                            showStats={false}
                            showPrice={false}
                            slideMinHeightClass="h-64 sm:h-72"
                            className="rounded-xl"
                          />
                        </div>

                        {/* Floor Plan Blueprints */}
                        <div className="md:col-span-4 flex flex-col gap-3">
                          <div
                            onClick={() => setBlueprintFloor('ground')}
                            className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                              blueprintFloor === 'ground'
                                ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-400 ring-2 ring-blue-500/20'
                                : 'bg-white dark:bg-[#1d222c] border-slate-200/60 dark:border-white/5'
                            }`}
                          >
                            <div className="h-24 rounded-xl border-2 border-blue-600 dark:border-blue-400 p-2 relative bg-blue-500/5">
                              <div className="absolute inset-2 border border-blue-400" />
                              <div className="absolute top-2 left-1/3 bottom-2 border-l border-blue-400" />
                              <div className="absolute top-1/2 left-2 right-2 border-t border-blue-400" />
                              <div className="absolute bottom-2 right-1/4 top-1/2 border-l border-blue-400" />
                            </div>
                            <span className="text-[11px] font-bold text-center block mt-1.5 text-slate-700 dark:text-slate-300">
                              Ground floor
                            </span>
                          </div>

                          <div
                            onClick={() => setBlueprintFloor('upper')}
                            className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                              blueprintFloor === 'upper'
                                ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-400 ring-2 ring-blue-500/20'
                                : 'bg-white dark:bg-[#1d222c] border-slate-200/60 dark:border-white/5'
                            }`}
                          >
                            <div className="h-24 rounded-xl border-2 border-blue-600 dark:border-blue-400 p-2 relative bg-blue-500/5">
                              <div className="absolute inset-2 border border-blue-400" />
                              <div className="absolute top-2 left-1/2 bottom-2 border-l border-blue-400" />
                              <div className="absolute top-1/3 left-2 right-2 border-t border-blue-400" />
                              <div className="absolute top-2/3 left-2 right-2 border-t border-blue-400" />
                            </div>
                            <span className="text-[11px] font-bold text-center block mt-1.5 text-slate-700 dark:text-slate-300">
                              Upper floor
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Barra Inferior de Atributos: fluindo numa única linha horizontal SEM borders ao redor de cada atributo */}
                      <div className="flex flex-wrap items-center justify-between gap-4 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <Maximize2 className="text-emerald-500 w-4 h-4 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-slate-500 font-medium">Area</p>
                            <p className="font-bold text-sm text-slate-900 dark:text-white">{viewingPropertyDetail.area || '4,800 ft²'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <TrendingUp className="text-blue-500 w-4 h-4 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-slate-500 font-medium">Floor</p>
                            <p className="font-bold text-sm text-slate-900 dark:text-white">{viewingPropertyDetail.floor || '2'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Building className="text-emerald-500 w-4 h-4 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-slate-500 font-medium">Bedroom</p>
                            <p className="font-bold text-sm text-slate-900 dark:text-white">{viewingPropertyDetail.beds || '4'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="text-emerald-500 w-4 h-4 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-slate-500 font-medium">Bathroom</p>
                            <p className="font-bold text-sm text-slate-900 dark:text-white">{viewingPropertyDetail.baths || '3'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. OVERVIEW SPECIFICATION TABLE */}
                  <div className="rounded-[24px] bg-white dark:bg-[#171b23] border border-slate-100/80 dark:border-white/5 shadow-xs p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                        <Building className="w-4 h-4 text-slate-500" /> Overview
                      </h3>
                      <button className="text-slate-400 hover:text-slate-600">
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-col text-xs divide-y divide-slate-100 dark:divide-slate-800">
                      {(viewingPropertyDetail.overviewTable || defaultHollisProperty.overviewTable).map((row: any, i: number) => (
                        <div key={i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                          <span className="text-slate-400 font-semibold">{row.label}</span>
                          <div className="flex items-center gap-2">
                            {row.avatar && (
                              <img src={row.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                            )}
                            <span className="font-bold text-slate-900 dark:text-white">{row.value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. DESCRIPTION & AMENITY TAGS: leading-relaxed, tags com texto simples + checkmark verde */}
                  <div className="rounded-[24px] bg-white dark:bg-[#171b23] border border-slate-100/80 dark:border-white/5 shadow-xs p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                        <FileText className="w-4 h-4 text-slate-500" /> Description
                      </h3>
                      <button className="text-slate-400 hover:text-slate-600">
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4 font-normal text-left">
                      {viewingPropertyDetail.description || defaultHollisProperty.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                      {(viewingPropertyDetail.tags || defaultHollisProperty.tags).map((tag: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                          <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <span>{tag}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
              );
            })()}

            {propertySubTab === 'planning' && (
              <div className="flex flex-col gap-5 animate-in fade-in duration-150">
                <div className="p-5 rounded-[24px] bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur-md shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-black text-gray-900 dark:text-white">Etapas e Checklist de Venda (Planning)</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Progresso operacional em tempo real do imóvel</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 text-xs font-bold">
                      11 de 16 tarefas concluídas
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {planningTasks.map((stage, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-white dark:bg-[#1d222c] border border-gray-100 dark:border-white/5 flex flex-col gap-3 shadow-2xs">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                          <span className="font-bold text-xs text-gray-900 dark:text-white">{stage.stage}</span>
                          <span className="text-[10px] font-bold text-gray-400">
                            {stage.tasks.filter(t => t.done).length}/{stage.tasks.length}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2 text-xs">
                          {stage.tasks.map(t => (
                            <label key={t.id} className="flex items-start gap-2 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={t.done}
                                onChange={() => {
                                  setPlanningTasks(prev => prev.map(s => ({
                                    ...s,
                                    tasks: s.tasks.map(task => task.id === t.id ? { ...task, done: !task.done } : task)
                                  })));
                                }}
                                className="mt-0.5 rounded accent-[#2f5bea] cursor-pointer"
                              />
                              <span className={`leading-snug transition-colors ${t.done ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200 group-hover:text-black dark:group-hover:text-white'}`}>
                                {t.title}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 3. SUB-ABA: ATIVIDADES (ACTIVITIES) */}
            {propertySubTab === 'activities' && (
              <div className="flex flex-col gap-5 animate-in fade-in duration-150">
                <div className="p-5 rounded-[24px] bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur-md shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" /> Registro de Atividades e Ocorrências
                    </h3>
                    <button
                      onClick={() => alert('Nova ocorrência registrada com sucesso!')}
                      className="px-4 py-1.5 rounded-full bg-[#121722] text-white dark:bg-white dark:text-[#121722] text-xs font-bold"
                    >
                      + Registrar nota / ligação
                    </button>
                  </div>

                  <div className="flex flex-col gap-3">
                    {[
                      { who: 'Spencer Hale', action: 'enviou uma contraproposta oficial de $1,215,000.', time: 'Há 19 minutos', tag: 'Oferta', color: 'bg-indigo-500' },
                      { who: 'Imani Brooks', action: 'realizou visita guiada presencial com Priya Natarajan.', time: 'Hoje às 09:30', tag: 'Visita', color: 'bg-emerald-500' },
                      { who: 'Elise Marchetti', action: 'confirmou concordância com margem de negociação de $1.185M.', time: 'Ontem às 17:40', tag: 'Nota', color: 'bg-amber-500' },
                      { who: 'Marcus Adebayo', action: 'apresentou proposta preliminar de compra em $1,185,000.', time: 'Há 2 dias', tag: 'Oferta', color: 'bg-indigo-500' },
                      { who: 'Henrik Dahl', action: 'emitiu laudo prévio de vistoria e autorização de comercialização.', time: 'Há 5 dias', tag: 'Inspeção', color: 'bg-purple-500' }
                    ].map((act, i) => (
                      <div key={i} className="p-3.5 rounded-2xl bg-white dark:bg-[#1d222c] border border-gray-100 dark:border-white/5 shadow-2xs flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full ${act.color}`} />
                          <div>
                            <p className="text-gray-900 dark:text-white">
                              <b>{act.who}</b> {act.action}
                            </p>
                            <span className="text-[10px] text-gray-400">{act.time}</span>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-500">
                          {act.tag}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 4. SUB-ABA: HISTÓRICO (HISTORY) */}
            {propertySubTab === 'history' && (
              <div className="flex flex-col gap-5 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur shadow-xs">
                    <span className="text-[11px] text-gray-400 font-bold block">Visualizações (Views)</span>
                    <span className="text-2xl font-black text-gray-900 dark:text-white mt-1 block">1.842</span>
                    <span className="text-[11px] text-[#138a63] font-semibold mt-1 block">+124 nesta semana</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur shadow-xs">
                    <span className="text-[11px] text-gray-400 font-bold block">Imóveis Salvos (Saves)</span>
                    <span className="text-2xl font-black text-gray-900 dark:text-white mt-1 block">126</span>
                    <span className="text-[11px] text-[#138a63] font-semibold mt-1 block">+18 nesta semana</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur shadow-xs">
                    <span className="text-[11px] text-gray-400 font-bold block">Contatos (Enquiries)</span>
                    <span className="text-2xl font-black text-gray-900 dark:text-white mt-1 block">31</span>
                    <span className="text-[11px] text-[#138a63] font-semibold mt-1 block">+5 nesta semana</span>
                  </div>
                </div>

                <div className="p-5 rounded-[24px] bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur-md shadow-xs">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Histórico de Alterações de Preço & Eventos</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400">
                          <th className="pb-2 font-semibold">Data</th>
                          <th className="pb-2 font-semibold">Evento</th>
                          <th className="pb-2 font-semibold">Preço</th>
                          <th className="pb-2 font-semibold text-right">Variação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        <tr>
                          <td className="py-2.5 text-gray-400">10 de Outubro, 2026</td>
                          <td className="py-2.5 font-bold text-gray-900 dark:text-white">Lançamento oficial no mercado</td>
                          <td className="py-2.5 font-black">$1.280.000</td>
                          <td className="py-2.5 text-right font-bold text-gray-400">—</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 text-gray-400">24 de Outubro, 2026</td>
                          <td className="py-2.5 font-bold text-gray-900 dark:text-white">Revisão de preço estratégico</td>
                          <td className="py-2.5 font-black text-[#138a63]">$1.240.000</td>
                          <td className="py-2.5 text-right font-bold text-[#138a63]">-3.1%</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 text-gray-400">Hoje</td>
                          <td className="py-2.5 font-bold text-gray-900 dark:text-white">Contraproposta de Spencer Hale em andamento</td>
                          <td className="py-2.5 font-black text-[#2f5bea]">$1.215.000</td>
                          <td className="py-2.5 text-right font-bold text-[#ff8a3d]">-2.0%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 5. SUB-ABA: TAREFAS (TASKS) */}
            {propertySubTab === 'tasks' && (
              <div className="flex flex-col gap-5 animate-in fade-in duration-150">
                <div className="p-5 rounded-[24px] bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur-md shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                      <ListTodo className="w-4 h-4 text-gray-500" /> Tarefas e Compromissos do Imóvel
                    </h3>
                    <button
                      onClick={() => alert('Nova tarefa adicionada com sucesso!')}
                      className="px-4 py-1.5 rounded-full bg-[#121722] text-white dark:bg-white dark:text-[#121722] text-xs font-bold"
                    >
                      + Nova tarefa
                    </button>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {propertyTasksList.map(task => (
                      <div key={task.id} className="p-3.5 rounded-2xl bg-white dark:bg-[#1d222c] border border-gray-100 dark:border-white/5 shadow-2xs flex items-center justify-between text-xs">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={task.done}
                            onChange={() => {
                              setPropertyTasksList(prev => prev.map(t => t.id === task.id ? { ...t, done: !t.done } : t));
                            }}
                            className="rounded accent-[#2f5bea] cursor-pointer"
                          />
                          <div>
                            <span className={`font-bold block ${task.done ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                              {task.title}
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium">
                              {task.kind} · {task.at} · Responsável: <b>{task.who}</b>
                            </span>
                          </div>
                        </label>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${task.done ? 'bg-gray-100 dark:bg-gray-800 text-gray-400' : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'}`}>
                          {task.done ? 'Concluída' : 'Pendente'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 6. SUB-ABA: DOCUMENTOS (DOCUMENTS) */}
            {propertySubTab === 'documents' && (
              <div className="flex flex-col gap-5 animate-in fade-in duration-150">
                <div className="p-5 rounded-[24px] bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur-md shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                      <Folder className="w-4 h-4 text-gray-500" /> Repositório de Documentos e Certidões
                    </h3>
                    <button
                      onClick={() => alert('Janela de upload de documentos')}
                      className="px-4 py-1.5 rounded-full bg-[#121722] text-white dark:bg-white dark:text-[#121722] text-xs font-bold"
                    >
                      + Enviar documento
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { name: 'Minuta do Contrato de Compra e Venda', type: 'Contrato', size: '412 KB', date: 'Atualizado há 2 dias' },
                      { name: 'Laudo de Vistoria Predial Completo', type: 'Relatório', size: '2.9 MB', date: 'Emitido em 12 de Out' },
                      { name: 'Matrícula Atualizada do Imóvel', type: 'Certidão', size: '1.2 MB', date: 'Validade até Dez/2026' },
                      { name: 'Certidão Negativa de Ônus Reais', type: 'Certidão', size: '340 KB', date: 'Concluída' },
                      { name: 'Plantas Arquitetônicas em PDF', type: 'Planta', size: '8.4 MB', date: 'Arquivos em alta definição' },
                      { name: 'Manual do Proprietário e Garantias', type: 'Manual', size: '5.1 MB', date: 'Documentos do construtor' }
                    ].map((doc, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-white dark:bg-[#1d222c] border border-gray-100 dark:border-white/5 shadow-2xs flex flex-col justify-between">
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#2f5bea] flex items-center justify-center font-bold">
                            <FileText className="w-4 h-4" />
                          </div>
                          <button
                            onClick={() => alert(`Baixando ${doc.name}...`)}
                            className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-black dark:hover:text-white cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-gray-900 dark:text-white line-clamp-2 mb-1">{doc.name}</h4>
                          <span className="text-[11px] text-gray-400 block">{doc.type} · {doc.size}</span>
                          <span className="text-[10px] text-gray-400 font-medium block mt-1">{doc.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 7. SUB-ABA: MÍDIA E FOTOS (MEDIA FILES) */}
            {propertySubTab === 'media' && (
              <div className="flex flex-col gap-5 animate-in fade-in duration-150">
                <div className="p-5 rounded-[24px] bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur-md shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                      <Camera className="w-4 h-4 text-gray-500" /> Galeria de Mídia do Imóvel (6 Fotos)
                    </h3>
                    <button
                      onClick={() => alert('Iniciando apresentação em tela cheia...')}
                      className="px-4 py-1.5 rounded-full bg-[#121722] text-white dark:bg-white dark:text-[#121722] text-xs font-bold flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5" /> Apresentação (Slideshow)
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { img: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80', title: 'Fachada frontal', isCover: true },
                      { img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80', title: 'Living e sala de estar integrada' },
                      { img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80', title: 'Área gourmet e piscina' },
                      { img: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80', title: 'Suíte master com closet' },
                      { img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80', title: 'Cozinha planejada com ilha' },
                      { img: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80', title: 'Jardim contemporâneo e lareira externa' }
                    ].map((photo, idx) => (
                      <div key={idx} className="relative rounded-2xl overflow-hidden group shadow-2xs">
                        <img src={photo.img} alt={photo.title} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-3 text-white">
                          <span className="text-xs font-bold">{photo.title}</span>
                          <span className="text-[10px] text-gray-300">Foto 0{idx + 1} de 06</span>
                        </div>
                        {photo.isCover && (
                          <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-[#121722]/80 backdrop-blur text-white text-[10px] font-bold flex items-center gap-1">
                            <Star className="w-2.5 h-2.5 fill-current text-amber-400" /> Capa
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 8. SUB-ABA: NO MAPA (IN MAP) */}
            {propertySubTab === 'map' && (
              <div className="flex flex-col gap-5 animate-in fade-in duration-150">
                <div className="p-5 rounded-[24px] bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur-md shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500" /> Localização & Imóveis no Raio de Vizinhança
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#2f5bea]" /> À venda</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#138a63]" /> Locação</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border border-gray-400" /> Raio 1.5 mi</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    <div className="lg:col-span-8 flex flex-col gap-3">
                      <PortfolioMapCanvas
                        heightClass="h-80"
                        activePinId={activeMapPinId}
                        onPinHover={setActiveMapPinId}
                        onPinSelect={handlePortfolioPinSelect}
                      />
                      <PortfolioMapLegend compact />
                    </div>

                    {/* Nearby Comparables List */}
                    <div className="lg:col-span-4 flex flex-col gap-3">
                      <h4 className="font-bold text-xs text-gray-900 dark:text-white">Imóveis Comparáveis na Região</h4>
                      {[
                        { name: 'Quayside Apartments', type: 'Locação', dist: '0.4 mi de distância', price: '$3,200/mo' },
                        { name: 'Linden Long House', type: 'Venda recente', dist: '0.8 mi de distância', price: '$1,560,000' },
                        { name: 'Casa Alva', type: 'Venda recente', dist: '1.1 mi de distância', price: '$2,195,000' }
                      ].map((item, i) => (
                        <div key={i} className="p-3 rounded-2xl bg-white dark:bg-[#1d222c] border border-gray-100 dark:border-white/5 flex items-center justify-between text-xs shadow-2xs">
                          <div>
                            <b className="text-gray-900 dark:text-white block">{item.name}</b>
                            <span className="text-[10px] text-gray-400">{item.dist} · {item.type}</span>
                          </div>
                          <span className="font-black text-gray-900 dark:text-white">{item.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 9. SUB-ABA: O PROPRIETÁRIO (THE OWNER) */}
            {propertySubTab === 'owner' && (
              <div className="flex flex-col gap-5 animate-in fade-in duration-150">
                <div className="p-5 rounded-[24px] bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur-md shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                      <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80" alt="Elise" className="w-14 h-14 rounded-full object-cover ring-2 ring-[#2f5bea]" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-black text-gray-900 dark:text-white">Elise Marchetti</h3>
                          <span className="px-2.5 py-0.5 rounded-full bg-[#2f5bea]/15 text-[#2f5bea] text-[10px] font-black">Proprietária / Vendedora</span>
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 text-[10px] font-black">Cliente VIP</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Cliente desde Jan/2023 · Último contato registrado hoje às 11:00</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => alert('Iniciando chat com Elise Marchetti...')}
                        className="px-4 py-2 rounded-full bg-[#121722] text-white dark:bg-white dark:text-[#121722] text-xs font-black shadow-md flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Enviar Mensagem
                      </button>
                      <button
                        onClick={() => alert('Ligando para Elise Marchetti: +1 (858) 555-0192')}
                        className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-xs font-bold flex items-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5" /> Ligar
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4 border-b border-gray-100 dark:border-gray-800 text-xs">
                    <div>
                      <span className="text-gray-400 font-semibold block">E-mail Cadastrado</span>
                      <a href="mailto:elise.m@marchetti.com" className="font-bold text-[#2f5bea] hover:underline mt-0.5 block">
                        elise.m@marchetti.com
                      </a>
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold block">Telefone Comercial</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200 mt-0.5 block">+1 (858) 555-0192</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold block">Cidade / Residência</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200 mt-0.5 block">La Jolla, San Diego, CA</span>
                    </div>
                  </div>

                  <div className="pt-4">
                    <h4 className="font-bold text-xs text-gray-900 dark:text-white mb-2">Notas do Corretor (Imani Brooks)</h4>
                    <p className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                      "A cliente está motivada para concluir a transação até o final de novembro devido à mudança de estado. Aceita negociar até $1,185M se o comprador comprovar fundos imediatamente e dispensar contingências estendidas."
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}


        {!viewingPropertyDetail && (
          <>
        {/* ========================================================================= */}
        {/* ABA: LEADS (Lead Inbox - 100% Funcional e com todos os 14 leads)           */}
        {/* ========================================================================= */}
        {activeTab === 'leads' && (
          <div className="flex flex-col gap-5">
            {/* Header da aba Leads */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white leading-none">
                Caixa de<br />Leads
              </h1>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setViewingPropertyDetail(defaultHollisProperty)}
                  className="px-4 py-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold shadow-xs hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  ⭐ Ver Hollis Modern House (Dossiê)
                </button>
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur shadow-xs">
                  <div className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 border border-gray-200/60 flex items-center justify-center text-gray-700 dark:text-gray-300">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-base font-black block leading-none text-gray-900 dark:text-white">4</span>
                    <span className="text-[11px] text-gray-500 font-semibold">Novos nas últimas 24h</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur shadow-xs">
                  <div className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 border border-gray-200/60 flex items-center justify-center text-gray-700 dark:text-gray-300">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <span className="text-base font-black block leading-none text-gray-900 dark:text-white">75</span>
                    <span className="text-[11px] text-gray-500 font-semibold">Score médio dos leads</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur shadow-xs">
                  <div className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 border border-gray-200/60 flex items-center justify-center text-gray-700 dark:text-gray-300">
                    <TrendingUp className="w-4 h-4 text-[#138a63]" />
                  </div>
                  <div>
                    <span className="text-base font-black block leading-none text-gray-900 dark:text-white">50%</span>
                    <span className="text-[11px] text-gray-500 font-semibold">Taxa de conversão</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur shadow-xs">
                  <div className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 border border-gray-200/60 flex items-center justify-center text-gray-700 dark:text-gray-300">
                    <Flame className="w-4 h-4 text-[#ff8a3d]" />
                  </div>
                  <div>
                    <span className="text-base font-black block leading-none text-gray-900 dark:text-white">4</span>
                    <span className="text-[11px] text-gray-500 font-semibold">Leads quentes (80+)</span>
                  </div>
                </div>

                <button className="px-5 py-2.5 rounded-full border border-gray-200/80 dark:border-gray-700/80 bg-white/70 dark:bg-gray-800/70 backdrop-blur text-xs font-bold flex items-center gap-1.5 shadow-xs hover:bg-black/5">
                  <Download className="w-4 h-4" /> Exportar</button>
              </div>
            </div>

            {/* Layout Principal da Aba Leads (Inbox + Sidebar com Tempo de resposta, Origens de Leads e Funil de Vendas) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              
              {/* Inbox de Leads (8 Colunas) */}
              <div className="lg:col-span-8 rounded-[26px] bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur-md p-5 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                  <h2 className="text-sm font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                    <Mail className="w-4 h-4 text-gray-500" /> Inbox <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{filteredLeads.length}</span>
                  </h2>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 text-xs font-bold flex items-center gap-1">
                      Mais recentes <ChevronDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => {
                        setNewContactForm(prev => ({ ...prev, kind: 'buyer' }));
                        setShowNewContactModal(true);
                      }}
                      className="px-4 py-1.5 rounded-full bg-[#121722] text-white dark:bg-white dark:text-[#121722] text-xs font-bold flex items-center gap-1 hover:scale-105 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Novo lead</button>
                  </div>
                </div>

                {/* Filtros de Busca e Intenção */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[220px] relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
                    <input
                      type="text"
                      value={leadSearch}
                      onChange={e => setLeadSearch(e.target.value)}
                      placeholder="Search name, area, message…"
                      className="w-full bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-full pl-9 pr-3 py-1.5 text-xs outline-none focus:border-[#2f5bea]"
                    />
                  </div>

                  <div className="inline-flex p-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-bold">
                    {(['all', 'buy', 'rent', 'sell'] as const).map(intent => (
                      <button
                        key={intent}
                        onClick={() => setLeadIntent(intent)}
                        className={`px-3 py-1 rounded-full uppercase text-[11px] transition-all ${
                          leadIntent === intent ? 'bg-white dark:bg-gray-700 shadow-xs text-gray-900 dark:text-white' : 'text-gray-400'
                        }`}
                      >
                        {intent}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chips de Status */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
                  {[
                    { id: 'all', label: 'All', count: 14 },
                    { id: 'new', label: 'New', count: 4 },
                    { id: 'contacted', label: 'Contacted', count: 3 },
                    { id: 'qualified', label: 'Qualified', count: 3 },
                    { id: 'viewing', label: 'Viewing booked', count: 2 },
                    { id: 'converted', label: 'Converted', count: 1 },
                    { id: 'lost', label: 'Lost', count: 1 }
                  ].map(st => (
                    <button
                      key={st.id}
                      onClick={() => setLeadStatus(st.id as any)}
                      className={`px-3 py-1 rounded-full border transition-all flex items-center gap-1.5 whitespace-nowrap ${
                        leadStatus === st.id
                          ? 'bg-[#121722] text-white dark:bg-white dark:text-[#121722] border-transparent'
                          : 'bg-white/60 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {st.label} <span className="opacity-70 text-[10px]">{st.count}</span>
                    </button>
                  ))}
                </div>

                {/* Lista Completa dos Leads Renderizados */}
                <div className="flex flex-col gap-2.5">
                  {filteredLeads.map(lead => (
                    <div
                      key={lead.id}
                      className="p-3.5 rounded-2xl bg-white/80 dark:bg-[#1d222c] border border-gray-100 dark:border-white/5 hover:border-[#2f5bea]/40 transition-all flex items-center gap-3.5 shadow-2xs group cursor-pointer"
                    >
                      {/* Avatar / Inicial */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 text-gray-800 dark:text-white font-black flex items-center justify-center text-xs flex-none shadow-xs">
                        {lead.initials}
                      </div>

                      {/* Informações Principais do Lead */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-xs text-gray-900 dark:text-white truncate">{lead.name}</span>
                          <span className={`text-[10px] font-black px-2 py-0.2 rounded-full uppercase ${
                            lead.status === 'new' ? 'bg-[#ff8a3d]/15 text-[#ff8a3d]' :
                            lead.status === 'qualified' ? 'bg-[#2f5bea]/15 text-[#2f5bea]' :
                            lead.status === 'viewing' ? 'bg-[#121722] text-white dark:bg-white dark:text-[#121722]' :
                            lead.status === 'converted' ? 'bg-[#138a63]/15 text-[#138a63]' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {lead.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 font-semibold">
                          <span className="uppercase text-[#2f5bea] font-bold">{lead.intent}</span>
                          <span>·</span>
                          <span className="font-extrabold text-gray-900 dark:text-gray-200">{lead.amount}</span>
                          <span>·</span>
                          <span>{lead.area}</span>
                          <span>·</span>
                          <span>{lead.beds}</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 truncate">{lead.msg}</p>
                      </div>

                      {/* Origem e Tempo */}
                      <div className="text-right text-[11px] text-gray-400 flex flex-col items-end flex-none">
                        <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full font-bold text-gray-600 dark:text-gray-300 mb-1">
                          {lead.src}
                        </span>
                        <span>{lead.time}</span>
                      </div>

                      {/* Foto da propriedade associada (se houver) */}
                      {lead.thumb && (
                        <img src={lead.thumb} alt="" className="w-10 h-10 rounded-xl object-cover flex-none border border-gray-200 dark:border-gray-700" />
                      )}

                      {/* Score Circular do Lead */}
                      <div className="relative w-10 h-10 flex items-center justify-center flex-none">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3.5"
                            strokeOpacity="0.1"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke={lead.score >= 80 ? '#ff8a3d' : lead.score >= 60 ? '#2f5bea' : '#94a3b8'}
                            strokeWidth="3.5"
                            strokeDasharray={`${lead.score}, 100`}
                          />
                        </svg>
                        <span className="absolute text-[11px] font-black text-gray-900 dark:text-white">{lead.score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sidebar da Aba Leads (4 Colunas) */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                
                {/* Card 1: Response Time */}
                <div className="rounded-[26px] bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur-md p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                      <Clock className="w-4 h-4 text-gray-500" /> Tempo de resposta
                    </h3>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-gray-900 dark:text-white">5 h 45 m</span>
                    <span className="text-xs text-gray-400 font-semibold">avg. wait · 4 new leads</span>
                  </div>
                  <p className="text-[11px] text-[#ff8a3d] font-bold mt-1">Over the 2 h reply target by 3 h 45 m</p>

                  <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                      <div>
                        <b className="block">Isabel Duarte</b>
                        <span className="text-[10px] text-gray-400">waiting 7 h 39 m</span>
                      </div>
                      <button className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white font-bold text-xs">
                        Reply
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                      <div>
                        <b className="block">Fatima Zahra</b>
                        <span className="text-[10px] text-gray-400">waiting 5 h 41 m</span>
                      </div>
                      <button className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white font-bold text-xs">
                        Reply
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                      <div>
                        <b className="block">Chris Navarro</b>
                        <span className="text-[10px] text-gray-400">waiting 5 h 07 m</span>
                      </div>
                      <button className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white font-bold text-xs">
                        Reply
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card 2: Lead Origens de Leads (Donut & Percentuais) */}
                <div className="rounded-[26px] bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur-md p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Lead sources</h3>
                    <span className="text-xs font-bold text-gray-400">14 leads</span>
                  </div>

                  <div className="flex flex-col gap-2 text-xs">
                    <div className="flex justify-between items-center"><span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#2f5bea]" /> Website</span><b>4 (29%)</b></div>
                    <div className="flex justify-between items-center"><span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#ff8a3d]" /> Listing portal</span><b>3 (21%)</b></div>
                    <div className="flex justify-between items-center"><span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#138a63]" /> Referral</span><b>2 (14%)</b></div>
                    <div className="flex justify-between items-center"><span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#121722] dark:bg-white" /> Instagram</span><b>2 (14%)</b></div>
                    <div className="flex justify-between items-center"><span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Open house</span><b>2 (14%)</b></div>
                    <div className="flex justify-between items-center"><span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> Walk-in</span><b>1 (7%)</b></div>
                  </div>
                </div>

                {/* Card 3: Funil de Vendas */}
                <div className="rounded-[26px] bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur-md p-5 shadow-xs">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Funil de Vendas</h3>
                  <div className="flex flex-col gap-2.5 text-xs">
                    <div>
                      <div className="flex justify-between font-bold mb-1"><span>New</span><span>13</span></div>
                      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full"><div className="w-full h-full bg-[#ff8a3d] rounded-full" /></div>
                    </div>
                    <div>
                      <div className="flex justify-between font-bold mb-1"><span>Contacted</span><span>9</span></div>
                      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full"><div className="w-[69%] h-full bg-[#2f5bea] rounded-full" /></div>
                    </div>
                    <div>
                      <div className="flex justify-between font-bold mb-1"><span>Qualified</span><span>6</span></div>
                      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full"><div className="w-[46%] h-full bg-[#7192ff] rounded-full" /></div>
                    </div>
                    <div>
                      <div className="flex justify-between font-bold mb-1"><span>Viewing booked</span><span>3</span></div>
                      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full"><div className="w-[23%] h-full bg-[#121722] dark:bg-white rounded-full" /></div>
                    </div>
                    <div>
                      <div className="flex justify-between font-bold mb-1"><span>Converted</span><span>1</span></div>
                      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full"><div className="w-[8%] h-full bg-[#138a63] rounded-full" /></div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA: DEALS (Kanban Board - Visualização de Ofertas e Negócios)             */}
        {/* ========================================================================= */}
        {activeTab === 'deals' && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white leading-none">
                Deals
              </h1>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur shadow-xs">
                  <div>
                    <span className="text-base font-black block leading-none text-gray-900 dark:text-white">13</span>
                    <span className="text-[11px] text-gray-500 font-semibold">Negócios abertos</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur shadow-xs">
                  <div>
                    <span className="text-base font-black block leading-none text-gray-900 dark:text-white">$222,806</span>
                    <span className="text-[11px] text-gray-500 font-semibold">Comissão ponderada</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur shadow-xs">
                  <div>
                    <span className="text-base font-black block leading-none text-gray-900 dark:text-white">97%</span>
                    <span className="text-[11px] text-gray-500 font-semibold">Taxa de conversão</span>
                  </div>
                </div>
                <button className="px-5 py-2.5 rounded-full bg-[#121722] text-white dark:bg-white dark:text-[#121722] text-xs font-black shadow-md flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Registrar oferta</button>
              </div>
            </div>

            {/* Kanban Columns */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start overflow-x-auto pb-4">
              {dealsColumns.map(col => (
                <div key={col.id} className="rounded-[22px] bg-white/60 dark:bg-[#171b23]/70 border border-white/80 dark:border-white/10 backdrop-blur-md p-3.5 flex flex-col gap-3 min-w-[260px]">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${col.color}`} /> {col.title}
                    </span>
                    <div className="text-right">
                      <span className="text-xs font-black text-gray-900 dark:text-white block leading-none">{col.total}</span>
                      <span className="text-[10px] text-gray-400 font-bold">{col.count} deals</span>
                    </div>
                  </div>

                  {/* Cards dentro da coluna */}
                  <div className="flex flex-col gap-2.5">
                    {col.deals.map((deal, idx) => (
                      <div key={idx} className="p-3 rounded-2xl bg-white dark:bg-[#1d222c] border border-gray-100 dark:border-white/5 shadow-2xs hover:shadow-xs transition-all">
                        <div className="relative h-28 rounded-xl overflow-hidden mb-2">
                          <img src={deal.img} alt="" className="w-full h-full object-cover" />
                          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-bold backdrop-blur">
                            Sale
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-gray-900 dark:text-white truncate">{deal.title}</h4>
                        <span className="text-[11px] text-gray-500 block truncate">{deal.client}</span>
                        <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                          <b className="text-xs text-gray-900 dark:text-white">{deal.price}</b>
                          <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                            deal.deltaType === 'mint' ? 'bg-[#138a63]/15 text-[#138a63]' :
                            deal.deltaType === 'apricot' ? 'bg-[#ff8a3d]/15 text-[#ff8a3d]' : 'bg-[#2f5bea]/15 text-[#2f5bea]'
                          }`}>
                            {deal.delta}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-gray-400 mt-2 font-medium">
                          <span>{deal.left}</span>
                          <span>{deal.agent}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA: RENTALS (Gestão de Imóveis para Locação e Ocupação)                  */}
        {/* ========================================================================= */}
        {activeTab === 'rentals' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white leading-none">
                Rentals
              </h1>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur shadow-xs">
                  <span className="text-base font-black text-gray-900 dark:text-white">89%</span>
                  <span className="text-[11px] text-gray-500 font-semibold">Taxa de Ocupação (93/105 unidades)</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur shadow-xs">
                  <span className="text-base font-black text-gray-900 dark:text-white">$363,150</span>
                  <span className="text-[11px] text-gray-500 font-semibold">Receita mensal de aluguel</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur shadow-xs">
                  <span className="text-base font-black text-gray-900 dark:text-white">12</span>
                  <span className="text-[11px] text-gray-500 font-semibold">Unidades vagas</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur shadow-xs">
                  <span className="text-base font-black text-gray-900 dark:text-white">4</span>
                  <span className="text-[11px] text-gray-500 font-semibold">Contratos vencendo (90 d)</span>
                </div>
                <button
                  onClick={() => setShowNewListingModal(true)}
                  className="px-5 py-2.5 rounded-full bg-[#121722] text-white dark:bg-white dark:text-[#121722] text-xs font-black shadow-md flex items-center gap-1.5 hover:scale-105 transition-all"
                >
                  <Plus className="w-4 h-4" /> Novo aluguel</button>
              </div>
            </div>

            {/* Sub-painéis de Rentals: Rent Roll Bar Chart + Lease Calendar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7 rounded-[26px] bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur-md p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                    <TrendingUp className="w-4 h-4 text-gray-500" /> Rent roll
                  </h3>
                  <span className="text-xs bg-[#138a63]/15 text-[#138a63] font-bold px-2 py-0.5 rounded-full">+14.2% in 12 months</span>
                </div>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-black text-gray-900 dark:text-white">$363,150</span>
                  <span className="text-xs text-gray-500 font-medium">a month, from 93 let units · 14 leases signed</span>
                </div>
                <div className="h-32 flex items-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                  {[280, 295, 305, 310, 315, 320, 335, 340, 348, 355, 360, 363].map((val, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-t-lg transition-all ${i === 11 ? 'bg-[#ff8a3d]' : 'bg-[#2f5bea]'}`}
                        style={{ height: `${(val / 380) * 100}%` }}
                      />
                      <span className="text-[10px] text-gray-400 font-bold">
                        {['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'][i]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5 rounded-[26px] bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur-md p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                      <Calendar className="w-4 h-4 text-gray-500" /> Calendário de locações
                    </h3>
                    <span className="text-xs bg-[#ff8a3d]/15 text-[#ff8a3d] font-bold px-2 py-0.5 rounded-full">4 ending in 90 d</span>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {[
                      { title: 'Assinar locação — Quayside 3C', sub: 'Quayside Apartments · Grace Liu', tag: 'Signing', time: 'today', color: 'text-[#2f5bea] bg-[#2f5bea]/10' },
                      { title: 'Lease ends — Northbank 2A', sub: 'Yuki Mori · Marina', tag: 'Lease end', time: 'in 24 d', color: 'text-[#ff8a3d] bg-[#ff8a3d]/10' },
                      { title: 'Lease ends — Arbor Tower 12B', sub: 'Ren Takeda · Downtown', tag: 'Lease end', time: 'in 45 d', color: 'text-[#ff8a3d] bg-[#ff8a3d]/10' },
                      { title: 'Lease ends — Stonebrook Cabin', sub: 'Nora Whitfield · Julian', tag: 'Lease end', time: 'in 82 d', color: 'text-[#ff8a3d] bg-[#ff8a3d]/10' }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#1d222c] border border-gray-100 dark:border-white/5 text-xs shadow-2xs">
                        <div>
                          <b className="block text-gray-900 dark:text-white font-bold">{item.title}</b>
                          <span className="text-[11px] text-gray-400">{item.sub}</span>
                        </div>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${item.color}`}>
                          {item.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Barra de Filtros e Grid de Locações */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 bg-white/70 dark:bg-[#171b23]/80 backdrop-blur rounded-2xl border border-white/80 dark:border-white/10 shadow-xs">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100/80 dark:bg-gray-800 text-xs w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={rentalsSearch}
                    onChange={e => setRentalsSearch(e.target.value)}
                    placeholder="Buscar nome, rua ou região..."
                    className="bg-transparent outline-none flex-1 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex items-center p-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-bold">
                  {(['all', 'vacant', 'let'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setRentalsFilter(f)}
                      className={`px-3 py-1 rounded-full capitalize ${rentalsFilter === f ? 'bg-white dark:bg-gray-700 shadow-xs' : 'text-gray-400'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <span className="text-xs text-gray-400 font-bold pr-2">{rentalsData.length} imóveis de locação</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {rentalsData
                .filter(r => !rentalsSearch || r.name.toLowerCase().includes(rentalsSearch.toLowerCase()) || r.area.toLowerCase().includes(rentalsSearch.toLowerCase()))
                .map(r => (
                  <div key={r.id} className="rounded-[22px] bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur-md p-3.5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
                    <div>
                      <div className="relative h-44 rounded-2xl overflow-hidden mb-3">
                        <img src={r.photo} alt={r.name} className="w-full h-full object-cover" />
                        <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-black backdrop-blur">
                          {r.type}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-gray-900 dark:text-white">{r.name}</h4>
                      <p className="text-xs text-gray-500 mb-2">{r.address} · {r.area}</p>
                      <div className="flex items-baseline justify-between mb-2">
                        <b className="text-base font-black text-gray-900 dark:text-white">{r.rent}</b>
                        <span className="text-xs font-bold text-[#138a63]">{r.occupied}/{r.units} units let</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-[#138a63] rounded-full" style={{ width: `${(r.occupied / r.units) * 100}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100 dark:border-gray-800 text-xs">
                      <span className="text-gray-400 font-medium">Roll: {r.roll}</span>
                      <button className="px-3 py-1 rounded-full bg-[#121722] text-white dark:bg-white dark:text-[#121722] font-black text-[11px]">
                        Manage
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA: SALES (Portfólio de Imóveis para Venda e Market Pulse)                */}
        {/* ========================================================================= */}
        {activeTab === 'sales' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white leading-none">
                Homes for sale
              </h1>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur shadow-xs">
                  <span className="text-base font-black text-gray-900 dark:text-white">10</span>
                  <span className="text-[11px] text-gray-500 font-semibold">Anúncios ativos</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur shadow-xs">
                  <span className="text-base font-black text-gray-900 dark:text-white">3</span>
                  <span className="text-[11px] text-gray-500 font-semibold">Em proposta</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur shadow-xs">
                  <span className="text-base font-black text-gray-900 dark:text-white">14</span>
                  <span className="text-[11px] text-gray-500 font-semibold">Sold this year ($18.4M)</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur shadow-xs">
                  <span className="text-base font-black text-gray-900 dark:text-white">$742</span>
                  <span className="text-[11px] text-gray-500 font-semibold">Avg. price / ft²</span>
                </div>
                <button
                  onClick={() => setShowNewListingModal(true)}
                  className="px-5 py-2.5 rounded-full bg-[#121722] text-white dark:bg-white dark:text-[#121722] text-xs font-black shadow-md flex items-center gap-1.5 hover:scale-105 transition-all"
                >
                  <Plus className="w-4 h-4" /> Novo anúncio
                </button>
              </div>
            </div>

            {/* Market Pulse: Preço Pedido vs. Estimativa Independente */}
            <div className="rounded-[26px] bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur-md p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                  <TrendingUp className="w-4 h-4 text-gray-500" /> Market pulse <span className="text-xs text-gray-400 font-normal">asking vs. independent estimate</span>
                </h3>
                <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#ff8a3d]" /> Above</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#138a63]" /> Below</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { name: 'Cedar Ridge House', delta: '+6.9%', type: 'above', sub: 'Asking $1.4M · est. $1.31M' },
                  { name: 'Marea Desert Villa', delta: '-1.8%', type: 'below', sub: 'Asking $1.65M · est. $1.68M' },
                  { name: 'Hvar Cliff House', delta: '-4.2%', type: 'below', sub: 'Asking $3.45M · est. $3.6M' },
                  { name: 'Casa Alva', delta: '+2.1%', type: 'above', sub: 'Asking $2.195M · est. $2.15M' }
                ].map((item, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-white dark:bg-[#1d222c] border border-gray-100 dark:border-white/5 shadow-2xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs truncate text-gray-900 dark:text-white">{item.name}</span>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${item.type === 'above' ? 'bg-[#ff8a3d]/15 text-[#ff8a3d]' : 'bg-[#138a63]/15 text-[#138a63]'}`}>
                        {item.delta}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-400 block truncate">{item.sub}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Barra de Filtros e Grid de Imóveis à Venda */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 bg-white/70 dark:bg-[#171b23]/80 backdrop-blur rounded-2xl border border-white/80 dark:border-white/10 shadow-xs">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100/80 dark:bg-gray-800 text-xs w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={salesSearch}
                    onChange={e => setSalesSearch(e.target.value)}
                    placeholder="Buscar nome, rua ou região..."
                    className="bg-transparent outline-none flex-1 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex items-center p-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-bold">
                  {(['all', 'active', 'offer', 'sold'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setSalesStatusFilter(s)}
                      className={`px-3 py-1 rounded-full capitalize ${salesStatusFilter === s ? 'bg-white dark:bg-gray-700 shadow-xs' : 'text-gray-400'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center p-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-bold">
                  <button
                    onClick={() => setSalesViewMode('grid')}
                    className={`px-3 py-1 rounded-full ${salesViewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-xs' : 'text-gray-400'}`}
                  >
                    Grid
                  </button>
                  <button
                    onClick={() => setSalesViewMode('list')}
                    className={`px-3 py-1 rounded-full ${salesViewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-xs' : 'text-gray-400'}`}
                  >
                    List
                  </button>
                </div>
                <span className="text-xs text-gray-400 font-bold pr-2">{salesData.length} listings</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {salesData
                .filter(s => salesStatusFilter === 'all' || s.status === salesStatusFilter)
                .filter(s => !salesSearch || s.name.toLowerCase().includes(salesSearch.toLowerCase()) || s.area.toLowerCase().includes(salesSearch.toLowerCase()))
                .map(s => (
                  <div key={s.id} className="rounded-[22px] bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur-md p-3.5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
                    <div>
                      <div className="relative h-52 rounded-2xl overflow-hidden mb-3">
                        <img src={s.photo} alt={s.name} className="w-full h-full object-cover" />
                        <span className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-white text-[10px] font-black backdrop-blur ${
                          s.status === 'active' ? 'bg-emerald-600/80' : s.status === 'offer' ? 'bg-[#ff8a3d]/80' : 'bg-gray-800/80'
                        }`}>
                          {s.status === 'active' ? 'For sale' : s.status === 'offer' ? 'Em proposta' : 'Sold'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">{s.name}</h4>
                        <b className="text-base font-black text-gray-900 dark:text-white">{s.price}</b>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{s.address} · {s.area}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 font-medium pb-2 border-b border-gray-100 dark:border-gray-800">
                        <span>{s.beds} bd</span>
                        <span>{s.baths} ba</span>
                        <span>{s.sqft} ft²</span>
                        <span>{s.dom} DOM</span>
                        <span>{s.views} views</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 text-xs">
                      <span className="text-gray-400 font-medium">Agent: {s.agent}</span>
                      <button
                        onClick={() => setViewingPropertyDetail(getFullProperty(s))}
                        className="px-3.5 py-1 rounded-full bg-[#121722] text-white dark:bg-white dark:text-[#121722] font-black text-xs hover:scale-105 transition-all"
                      >
                        Ver Detalhes
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA: CONTACTS (Diretório Completo de Clientes e Proprietários)              */}
        {/* ========================================================================= */}
        {activeTab === 'contacts' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white leading-none">
                Contacts
              </h1>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur shadow-xs">
                  <span className="text-base font-black text-gray-900 dark:text-white">
                    {carteiraContactsLoading ? '…' : effectiveContacts.length}
                  </span>
                  <span className="text-[11px] text-gray-500 font-semibold">Vínculos carteira</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur shadow-xs">
                  <span className="text-base font-black text-gray-900 dark:text-white">
                    {carteiraContactsLoading
                      ? '…'
                      : effectiveContacts.filter((c) => c.kind === 'landlord').length}
                  </span>
                  <span className="text-[11px] text-gray-500 font-semibold">Proprietários</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur shadow-xs">
                  <span className="text-base font-black text-gray-900 dark:text-white">
                    {carteiraContactsLoading
                      ? '…'
                      : effectiveContacts.filter((c) => c.favorite).length}
                  </span>
                  <span className="text-[11px] text-gray-500 font-semibold">Ativos</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur shadow-xs">
                  <span className="text-base font-black text-gray-900 dark:text-white">
                    {carteiraContactsLoading
                      ? '…'
                      : effectiveContacts.filter((c) => c.kind === 'seller').length}
                  </span>
                  <span className="text-[11px] text-gray-500 font-semibold">Corretores</span>
                </div>
                <button
                  onClick={() => setShowNewContactModal(true)}
                  className="px-5 py-2.5 rounded-full bg-[#121722] text-white dark:bg-white dark:text-[#121722] text-xs font-black shadow-md flex items-center gap-1.5 hover:scale-105 transition-all"
                >
                  <Plus className="w-4 h-4" /> Novo contato</button>
              </div>
            </div>

            {/* Toolbar de Busca e Filtro de Contatos */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 bg-white/70 dark:bg-[#171b23]/80 backdrop-blur rounded-2xl border border-white/80 dark:border-white/10 shadow-xs">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100/80 dark:bg-gray-800 text-xs w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={contactsSearch}
                    onChange={e => setContactsSearch(e.target.value)}
                    placeholder="Buscar nome, cidade ou bairro..."
                    className="bg-transparent outline-none flex-1 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex items-center p-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-bold">
                  {(['all', 'buyer', 'seller', 'tenant'] as const).map(k => (
                    <button
                      key={k}
                      onClick={() => setContactsKindFilter(k)}
                      className={`px-3 py-1 rounded-full capitalize ${contactsKindFilter === k ? 'bg-white dark:bg-gray-700 shadow-xs' : 'text-gray-400'}`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
              <span className="text-xs text-gray-400 font-bold pr-2">
                {carteiraContactsLoading ? '…' : `${effectiveContacts.length} shown`}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {carteiraContactsLoading && (
                <p className="text-sm text-gray-500 col-span-full py-8 text-center lintel-shimmer">
                  Carregando carteira…
                </p>
              )}
              {!carteiraContactsLoading &&
              effectiveContacts
                .filter(c => contactsKindFilter === 'all' || c.kind === contactsKindFilter)
                .filter(c => !contactsSearch || c.name.toLowerCase().includes(contactsSearch.toLowerCase()) || c.city.toLowerCase().includes(contactsSearch.toLowerCase()))
                .map(c => (
                  <div key={c.id} className="rounded-[22px] bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur-md p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#2f5bea] to-[#7192ff] text-white flex items-center justify-center font-black text-sm shadow-sm">
                            {c.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">{c.name}</h4>
                            <span className="text-[11px] text-gray-400">{c.city} · {c.agent}</span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full capitalize ${
                          c.kind === 'buyer' ? 'bg-[#2f5bea]/15 text-[#2f5bea]' :
                          c.kind === 'seller' || c.kind === 'landlord' ? 'bg-[#ff8a3d]/15 text-[#ff8a3d]' : 'bg-[#138a63]/15 text-[#138a63]'
                        }`}>
                          {c.kind}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1.5 text-xs text-gray-600 dark:text-gray-300 py-2 border-y border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          <span className="truncate">{c.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <span>{c.phone}</span>
                        </div>
                      </div>

                      <div className="mt-3">
                        <span className="text-[10px] text-gray-400 block font-bold uppercase">Orçamento / Pretensão</span>
                        <b className="text-xs font-bold text-gray-900 dark:text-white">{c.budget}</b>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100 dark:border-gray-800 text-xs">
                      <span className="text-gray-400 text-[10px]">Último contato: {c.lastContact}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setCallingContact(c)}
                          title={`Ligar para ${c.name} (${c.phone})`}
                          className="p-1.5 rounded-full hover:bg-[#138a63]/15 text-[#138a63] dark:text-[#2feaa8] transition-all hover:scale-110"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedContactForProfile(c)}
                          className="px-3 py-1 rounded-full bg-[#121722] text-white dark:bg-white dark:text-[#121722] font-black text-xs hover:scale-105 transition-all shadow-xs"
                        >
                          Profile
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              {!carteiraContactsLoading &&
                effectiveContacts.length === 0 &&
                carteiraContacts != null && (
                  <p className="col-span-full text-center text-sm text-gray-500 py-10">
                    Nenhum vínculo na carteira. Staff pode atribuir em{' '}
                    <span className="font-semibold">/anfitriao/admin/carteira-corretor</span>.
                  </p>
                )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA: OVERVIEW (Layout Principal padrão)                                   */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && overviewBootLoading && <OverviewSkeleton />}

        {activeTab === 'overview' && !overviewBootLoading && (
          <div className="lintel-overview-enter">
            {/* SAUDAÇÃO & TOP KPIS */}
            <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white leading-none">
                {lintelGreeting()},<br />{userName}
              </h1>

              <div className="flex flex-wrap items-center gap-3">
                                {/* Active listings - static Lintel */}
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur shadow-xs">
                  <div className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 border border-gray-200/60 flex items-center justify-center text-gray-700 dark:text-gray-300">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-base font-black block leading-none text-gray-900 dark:text-white">10</span>
                    <span className="text-[11px] text-gray-500 font-semibold">Active listings</span>
                    <span className="text-[11px] text-gray-500 font-semibold ml-1">Imóveis ativos</span>
                  </div>
                </div>

                {/* Under offer - static Lintel */}
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur shadow-xs">
                  <div className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 border border-gray-200/60 flex items-center justify-center text-gray-700 dark:text-gray-300">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-base font-black block leading-none text-orange-600 dark:text-orange-400">3</span>
                    <span className="text-[11px] text-gray-500 font-semibold">Under offer</span>
                    <span className="text-[11px] text-gray-500 font-semibold ml-1">Propostas ativas</span>
                  </div>
                </div>

                {/* Avg days on market - static Lintel */}
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur shadow-xs">
                  <div className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 border border-gray-200/60 flex items-center justify-center text-gray-700 dark:text-gray-300">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-base font-black block leading-none text-purple-600 dark:text-purple-400">54</span>
                    <span className="text-[11px] text-gray-500 font-semibold">Avg. days on market</span>
                    <span className="text-[11px] text-gray-500 font-semibold ml-1">Média dias mercado</span>
                  </div>
                </div>

<div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur shadow-xs">
                  <div className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 border border-gray-200/60 flex items-center justify-center text-gray-700 dark:text-gray-300">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <span
                      className={`text-base font-black block leading-none text-gray-900 dark:text-white ${kpiLoading ? 'lintel-shimmer inline-block min-w-[1.25rem]' : ''}`}
                      aria-busy={kpiLoading}
                    >
                      {kpiValue(listingKpis?.publicadas)}
                    </span>
                    <span className="text-[11px] text-gray-500 font-semibold">Anúncios publicados</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur shadow-xs">
                  <div className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 border border-gray-200/60 flex items-center justify-center text-gray-700 dark:text-gray-300">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span
                      className={`text-base font-black block leading-none text-gray-900 dark:text-white ${kpiLoading ? 'lintel-shimmer inline-block min-w-[1.25rem]' : ''}`}
                      aria-busy={kpiLoading}
                    >
                      {kpiValue(listingKpis?.emAprovacao)}
                    </span>
                    <span className="text-[11px] text-gray-500 font-semibold">In approval</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur shadow-xs">
                  <div className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 border border-gray-200/60 flex items-center justify-center text-gray-700 dark:text-gray-300">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-base font-black block leading-none text-gray-900 dark:text-white">
                      {commissionMonthKpi(commissionSeries12M, commissionCurrency)}
                    </span>
                    <span className="text-[11px] text-gray-500 font-semibold">Commission this month</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur shadow-xs">
                  <div className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 border border-gray-200/60 flex items-center justify-center text-gray-700 dark:text-gray-300">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <span
                      className={`text-base font-black block leading-none text-gray-900 dark:text-white ${kpiLoading ? 'lintel-shimmer inline-block min-w-[1.25rem]' : ''}`}
                      aria-busy={kpiLoading}
                    >
                      {kpiValue(listingKpis?.incompletas)}
                    </span>
                    <span className="text-[11px] text-gray-500 font-semibold">Avg. days on market</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowNewListingModal(true);
                    if (onNewListing) onNewListing();
                  }}
                  className={`${lintelBtnPrimary} px-5 py-2.5`}
                >
                  <Plus className="w-4 h-4" />
                  Novo anúncio
                </button>

                <button type="button" className={`w-10 h-10 ${lintelIconBtn}`}>
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </section>

            {/* GRID PRINCIPAL: 8 COLS CENTRO + 4 COLS LIVE CHAT (ou 11 + 1 quando recolhido) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              
              <div
                className={`${
                  isChatCollapsed ? 'lg:col-span-11' : 'lg:col-span-8'
                } lintel-stagger flex flex-col gap-4 transition-[grid-column] ${lintelLayoutEase}`}
              >
                
                {/* LINHA 1: COMMISSION + FEATURED LISTING */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  
                  <CommissionOverviewCard
                    period={period}
                    onPeriodChange={setPeriod}
                    series12M={commissionSeries12M}
                    onOpenComissoes={onOpenComissoes}
                    moneyCurrency={commissionCurrency}
                  />

                  <div className="md:col-span-5 min-h-[380px] lintel-card-hover">
                    <Carousel
                      listings={featuredCarouselListings}
                      featuredBadge="Featured listing"
                      slideMinHeightClass="min-h-[380px]"
                      showStats
                      showPrice
                      onSelect={() => setViewingPropertyDetail(defaultHollisProperty)}
                    />
                  </div>

                </div>

                {/* LINHA 2: PIPELINE BY STAGE */}
                <div className="rounded-[26px] bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur-md p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                      <Building className="w-4 h-4 text-gray-500" />
                      Funil por Estágio
                    </h2>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('deals')}
                        className={`${lintelBtnGhost} px-3 py-1`}
                      >
                        Abrir quadro <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                      <button className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-3xl font-black text-gray-900 dark:text-white">$222,806</span>
                    <span className="text-xs text-gray-500 font-semibold">comissão ponderada · 13 negócios abertos · US$ 406.3K ao fechar</span>
                  </div>

                  <div className="flex h-10 gap-1.5 my-2">
                    <button
                      onClick={() => setActiveTab('deals')}
                      title="Ver 3 negócios em Viewing na aba Deals"
                      className="flex-[3] bg-[#e4e7ec] dark:bg-gray-700 hover:opacity-90 rounded-xl flex items-center px-3 font-black text-gray-700 dark:text-gray-200 text-xs transition-all hover:scale-[1.02]"
                    >
                      3
                    </button>
                    <button
                      onClick={() => setActiveTab('deals')}
                      title="Ver 3 negócios em Offer na aba Deals"
                      className="flex-[3] bg-[#ff8a3d] hover:opacity-90 rounded-xl flex items-center px-3 font-black text-white text-xs transition-all hover:scale-[1.02]"
                    >
                      3
                    </button>
                    <button
                      onClick={() => setActiveTab('deals')}
                      title="Ver 4 negócios em Negotiation na aba Deals"
                      className="flex-[4] bg-[#2f5bea] hover:opacity-90 rounded-xl flex items-center px-3 font-black text-white text-xs transition-all hover:scale-[1.02]"
                    >
                      4
                    </button>
                    <button
                      onClick={() => setActiveTab('deals')}
                      title="Ver 3 negócios em Under contract na aba Deals"
                      className="flex-[3] bg-[#121722] dark:bg-white hover:opacity-90 rounded-xl flex items-center px-3 font-black text-white dark:text-[#121722] text-xs transition-all hover:scale-[1.02]"
                    >
                      3
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-xs pt-2 mt-2">
                    <div
                      onClick={() => setActiveTab('deals')}
                      className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-2 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-lg p-1.5 transition-all"
                    >
                      <span className="flex items-center gap-1.5 font-bold"><span className="w-2.5 h-2.5 rounded-sm bg-gray-300 dark:bg-gray-600" /> Visita</span>
                      <span className="font-bold text-gray-400">3</span>
                      <span className="font-black">$14.9K</span>
                      <span className="text-gray-400">15%</span>
                    </div>
                    <div
                      onClick={() => setActiveTab('deals')}
                      className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-2 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-lg p-1.5 transition-all"
                    >
                      <span className="flex items-center gap-1.5 font-bold"><span className="w-2.5 h-2.5 rounded-sm bg-[#ff8a3d]" /> Proposta</span>
                      <span className="font-bold text-gray-400">3</span>
                      <span className="font-black">$27.6K</span>
                      <span className="text-gray-400">40%</span>
                    </div>
                    <div
                      onClick={() => setActiveTab('deals')}
                      className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-2 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-lg p-1.5 transition-all"
                    >
                      <span className="flex items-center gap-1.5 font-bold"><span className="w-2.5 h-2.5 rounded-sm bg-[#2f5bea]" /> Negociação</span>
                      <span className="font-bold text-gray-400">4</span>
                      <span className="font-black">$87.6K</span>
                      <span className="text-gray-400">65%</span>
                    </div>
                    <div
                      onClick={() => setActiveTab('deals')}
                      className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-2 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-lg p-1.5 transition-all"
                    >
                      <span className="flex items-center gap-1.5 font-bold"><span className="w-2.5 h-2.5 rounded-sm bg-[#121722] dark:bg-white" /> Em contrato</span>
                      <span className="font-bold text-gray-400">3</span>
                      <span className="font-black">$92.7K</span>
                      <span className="text-gray-400">90%</span>
                    </div>
                  </div>
                </div>

                {/* LINHA 3: TODAY'S AGENDA + PORTFOLIO MAP + RENTALS DONUT */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  
                  {/* Today's Agenda */}
                  <div className="md:col-span-4 rounded-[26px] bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur-md p-4 shadow-xs flex flex-col justify-between lintel-card-hover">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                          <Calendar className="w-4 h-4 text-gray-500" /> Agenda de Hoje
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 font-semibold">1 de 6 feitas</span>
                          <button
                            type="button"
                            onClick={openBookViewingModal}
                            aria-label="Nova entrada na agenda"
                            className={`w-7 h-7 ${lintelIconBtn}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={openBookViewingModal}
                        className={`${lintelBtnGhost} mb-3 w-full justify-center py-1.5 text-[11px]`}
                      >
                        Agendar visita
                      </button>

                      <div className="flex flex-col gap-2.5 max-h-[280px] overflow-y-auto pr-0.5">
                        {agenda.map(item => (
                          <div key={item.id} className="flex items-start gap-2.5 text-xs">
                            <div className="w-10 text-right font-black leading-tight text-gray-700 dark:text-gray-300">
                              {item.time}<br /><span className="text-[10px] text-gray-400 font-semibold">{item.ampm}</span>
                            </div>
                            <button type="button" onClick={() => toggleAgenda(item.id)} className="mt-0.5">
                              {item.done ? <CheckCircle2 className="w-4 h-4 text-[#2f5bea]" /> : <Circle className="w-4 h-4 text-gray-400" />}
                            </button>
                            <div className="flex-1 min-w-0 bg-white/80 dark:bg-[#1d222c] border border-gray-100 dark:border-white/5 rounded-xl p-2 shadow-2xs flex items-center justify-between">
                              <div className="truncate pr-1">
                                <span className={`font-bold block truncate ${item.done ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>{item.title}</span>
                                <span className="text-[10px] text-gray-400 truncate block">{item.sub}</span>
                              </div>
                              {renderAgendaSideIcon(item)}
                            </div>
                          </div>
                        ))}

                        <div className="flex items-center gap-2 py-1" aria-hidden>
                          <div className="flex-1 h-px bg-[#ff8a3d]/70" />
                          <span className="text-[10px] font-black text-[#ff8a3d] whitespace-nowrap">
                            Agora, {agendaNowLabel}
                          </span>
                          <div className="flex-1 h-px bg-[#ff8a3d]/70" />
                        </div>

                        <p className="text-[10px] font-black text-gray-400 tracking-wide pt-1">AMANHÃ</p>
                        {tomorrowAgenda.map(item => (
                          <div key={item.id} className="flex items-start gap-2.5 text-xs opacity-90">
                            <div className="w-10 text-right font-black leading-tight text-gray-500">
                              {item.time}<br /><span className="text-[10px] text-gray-400 font-semibold">{item.ampm}</span>
                            </div>
                            <Circle className="w-4 h-4 text-gray-300 mt-0.5" aria-hidden />
                            <div className="flex-1 min-w-0 bg-white/60 dark:bg-[#1d222c]/80 border border-gray-100 dark:border-white/5 rounded-xl p-2 flex items-center justify-between">
                              <div className="truncate pr-1">
                                <span className="font-bold block truncate text-gray-800 dark:text-gray-200">{item.title}</span>
                                <span className="text-[10px] text-gray-400 truncate block">{item.sub}</span>
                              </div>
                              {renderAgendaSideIcon(item)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <PortfolioMapCard
                    onExpand={() => setPortfolioMapExpanded(true)}
                    activePinId={activeMapPinId}
                    onPinHover={setActiveMapPinId}
                    onPinSelect={handlePortfolioPinSelect}
                    pins={portfolioPins ?? undefined}
                    summaryLabel={portfolioMapSummary}
                  />

                  {/* Rentals Donut 89% */}
                  <div className="md:col-span-3 rounded-[26px] bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur-md p-4 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Rentals</h3>
                        <button onClick={() => setActiveTab('rentals')} className="px-3 py-0.5 rounded-full border border-gray-200 dark:border-gray-700 text-xs font-bold flex items-center gap-1">
                          All <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3 my-2">
                        <div className="relative w-20 h-20 flex items-center justify-center flex-none">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="12" strokeOpacity="0.1" fill="none" />
                            <circle cx="50" cy="50" r="40" stroke="#138a63" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset="27.6" strokeLinecap="round" fill="none" />
                          </svg>
                          <div className="absolute text-center">
                            <span className="text-base font-black leading-none block">89%</span>
                            <span className="text-[9px] text-gray-400 font-bold">ocupadas</span>
                          </div>
                        </div>
                        <div className="text-xs">
                          <span className="text-[10px] text-gray-400 font-semibold block">Faturamento</span>
                          <span className="text-base font-black text-gray-900 dark:text-white">$363,150<small className="text-[10px] font-normal">/mo</small></span>
                          <span className="text-[11px] text-gray-500 font-semibold block mt-0.5">Locadas: <b>93 of 105</b></span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 mt-2 text-xs">
                        <div
                          onClick={() => setViewingPropertyDetail(getFullProperty({ name: 'Arbor Tower' }))}
                          className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-1 rounded-lg transition-all"
                        >
                          <div className="flex justify-between font-bold text-[11px]"><span className="truncate">Arbor Tower</span><span>44/48</span></div>
                          <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full mt-0.5"><div className="w-[92%] h-full bg-[#138a63] rounded-full" /></div>
                        </div>
                        <div
                          onClick={() => setViewingPropertyDetail(getFullProperty({ name: 'Northbank Lofts' }))}
                          className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-1 rounded-lg transition-all"
                        >
                          <div className="flex justify-between font-bold text-[11px]"><span className="truncate">Northbank Lofts</span><span>31/36</span></div>
                          <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full mt-0.5"><div className="w-[86%] h-full bg-[#138a63] rounded-full" /></div>
                        </div>
                        <div
                          onClick={() => setViewingPropertyDetail(getFullProperty({ name: 'Quayside Apartments' }))}
                          className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-1 rounded-lg transition-all"
                        >
                          <div className="flex justify-between font-bold text-[11px]"><span className="truncate">Quayside Apartments</span><span>17/18</span></div>
                          <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full mt-0.5"><div className="w-[94%] h-full bg-[#138a63] rounded-full" /></div>
                        </div>
                        <div
                          onClick={() => setViewingPropertyDetail(getFullProperty({ name: 'Stonebrook Cabin' }))}
                          className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-1 rounded-lg transition-all"
                        >
                          <div className="flex justify-between font-bold text-[11px]"><span className="truncate">Stonebrook Cabin</span><span className="text-[#138a63] font-black">Let</span></div>
                          <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full mt-0.5"><div className="w-full h-full bg-[#138a63] rounded-full" /></div>
                        </div>
                        <div
                          onClick={() => setViewingPropertyDetail(getFullProperty({ name: 'Hearth Pavilion' }))}
                          className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-1 rounded-lg transition-all"
                        >
                          <div className="flex justify-between font-bold text-[11px]"><span className="truncate">Hearth Pavilion</span><span className="text-[#ff8a3d] font-black">Vacant</span></div>
                          <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full mt-0.5"><div className="w-[15%] h-full bg-[#ff8a3d] rounded-full" /></div>
                        </div>
                        <div
                          onClick={() => setViewingPropertyDetail(getFullProperty({ name: 'Casa Marea Guest House' }))}
                          className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-1 rounded-lg transition-all"
                        >
                          <div className="flex justify-between font-bold text-[11px]"><span className="truncate">Casa Marea Guest House</span><span className="text-[#ff8a3d] font-black">Vacant</span></div>
                          <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full mt-0.5"><div className="w-[10%] h-full bg-[#ff8a3d] rounded-full" /></div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* LINHA 4: TOP AGENTS + ACTIVITY FEED */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  
                  {/* Top Agents */}
                  <div className="md:col-span-6 rounded-[26px] bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur-md p-5 shadow-xs">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Award className="w-4 h-4 text-gray-500" /> Principais Corretores
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className="inline-flex p-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-[11px] font-bold">
                          <button
                            onClick={() => setAgentRankingTab('commission')}
                            className={`px-2.5 py-0.5 rounded-full transition-all ${agentRankingTab === 'commission' ? 'bg-white dark:bg-gray-700 shadow-xs text-gray-900 dark:text-white' : 'text-gray-400'}`}
                          >
                            Commission
                          </button>
                          <button
                            onClick={() => setAgentRankingTab('deals')}
                            className={`px-2.5 py-0.5 rounded-full transition-all ${agentRankingTab === 'deals' ? 'bg-white dark:bg-gray-700 shadow-xs text-gray-900 dark:text-white' : 'text-gray-400'}`}
                          >
                            Deals
                          </button>
                        </div>
                        <button
                          onClick={() => setActiveTab('deals')}
                          title="Abrir negócios dos agentes"
                          className="w-7 h-7 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:text-[#2f5bea] transition-all"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-400 font-semibold mb-3">
                      {agentRankingTab === 'commission' ? 'Comissões fechadas em 2026, comparadas à meta individual' : 'Total closed & active deals managed per agent in 2026'}
                    </p>

                    <div className="flex flex-col gap-2.5">
                      {(agentRankingTab === 'commission' ? agents : [
                        { rank: 1, name: 'Imani Brooks', val: '8 deals', sub: '5 closed · 3 under contract', pct: 90, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80' },
                        { rank: 2, name: 'Camila Duarte', val: '6 deals', sub: '4 leased · 2 open', pct: 75, avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=80&q=80' },
                        { rank: 3, name: 'Henrik Dahl', val: '5 deals', sub: '3 closed · 2 negotiation', pct: 65, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80' },
                        { rank: 4, name: 'Jordan Ellis', val: '4 deals', sub: '2 closed · 2 viewing', pct: 50, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80' },
                        { rank: 5, name: 'Hana Seo', val: '3 deals', sub: 'Mortgage & advisory closed', pct: 40, avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=80&q=80' }
                      ]).map((ag, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            setSelectedContactForProfile({
                              name: ag.name,
                              kind: 'agent',
                              email: `${ag.name.toLowerCase().replace(/\s+/g, '.')}@rsv360.com`,
                              phone: '+1 (858) 555-0100',
                              city: 'San Diego, CA',
                              budget: ag.val,
                              agent: ag.sub,
                              lastContact: 'Active today',
                              favorite: true
                            });
                          }}
                          className="flex items-center gap-3 text-xs cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-1 rounded-xl transition-all"
                        >
                          <span className="w-3 text-gray-400 font-bold">{ag.rank}</span>
                          <img src={ag.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between font-bold">
                              <span className="truncate">{ag.name}</span>
                              <span>{ag.val}</span>
                            </div>
                            <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full my-1 overflow-hidden">
                              <div className="h-full bg-[#2f5bea] rounded-full" style={{ width: `${ag.pct}%` }} />
                            </div>
                            <span className="text-[10px] text-gray-400 truncate block">{ag.sub}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Atividades Recentes Feed */}
                  <div className="md:col-span-6 rounded-[26px] bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur-md p-5 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-gray-500" /> Atividades Recentes
                      </h3>
                      <button
                        onClick={() => setShowActivityModal(true)}
                        title="Ver todas as atividades recentes"
                        className="w-7 h-7 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:text-[#2f5bea] hover:border-[#2f5bea] transition-all"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-col gap-2.5 text-xs">
                      {activities.map((act, i) => (
                        <div key={i} className="flex items-start gap-2.5 pb-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                          {act.avImg ? (
                            <img src={act.avImg} alt="" className="w-7 h-7 rounded-full object-cover" />
                          ) : (
                            <div className={`w-7 h-7 rounded-full font-bold flex items-center justify-center text-[11px] ${act.avColor}`}>
                              {act.av}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="leading-snug truncate">
                              <b>{act.name}</b> {act.action}{' '}
                              {act.prop ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedPropertyModal({
                                    name: act.prop,
                                    address: act.prop.includes('Hollis') ? '18 Hollis Ct · La Jolla' : act.prop.includes('Cedar') ? '710 Pinecrest · Julian' : act.prop.includes('Stonebrook') ? '44 Pine Rd · Julian' : 'Coronado, CA',
                                    type: act.prop.includes('Cabin') ? 'Cabin' : 'Single Family House',
                                    rent: act.prop.includes('Stonebrook') ? '$2,800/mo' : '$1,240,000',
                                    units: 'Residential',
                                    img: act.prop.includes('Hollis') ? 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80' : 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80'
                                  })}
                                  className="text-[#2f5bea] font-semibold hover:underline inline text-left"
                                >
                                  {act.prop}
                                </button>
                              ) : null}
                            </p>
                            <span className="text-[10px] text-gray-400 font-medium">{act.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>

              {/* LADO DIREITO: LIVE CHAT STICKY (4 Colunas ou 1 Coluna colapsada) */}
              {isChatCollapsed ? (
                <div className="lg:col-span-1 lintel-chat-panel rounded-[26px] bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur-md p-3 shadow-xs flex flex-col items-center h-[calc(100vh-140px)] sticky top-4">
                  <button
                    onClick={() => setIsChatCollapsed(false)}
                    className="w-10 h-10 rounded-full border border-gray-200/80 dark:border-gray-700/80 bg-white/80 dark:bg-gray-800/80 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:scale-110 shadow-sm transition-all mb-4"
                    title="Expandir Live Chat"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  </button>

                  <div className="flex flex-col items-center gap-3.5 flex-1">
                    {(['hollis', 'ashby', 'omar', 'nora'] as const).map(chatKey => {
                      const th = chatThreads[chatKey];
                      const isActive = activeChatId === chatKey;
                      return (
                        <div
                          key={chatKey}
                          onClick={() => {
                            setActiveChatId(chatKey);
                            setIsChatCollapsed(false);
                          }}
                          className="relative cursor-pointer hover:scale-105 transition-all"
                          title={`Abrir conversa de ${th.name}`}
                        >
                          {th.avatarImg ? (
                            <div className={`w-9 h-9 rounded-full overflow-hidden p-0.5 ${isActive ? 'ring-2 ring-[#2f5bea]' : ''}`}>
                              <img src={th.avatarImg} alt="" className="w-full h-full rounded-full object-cover" />
                            </div>
                          ) : (
                            <div className={`w-9 h-9 rounded-full bg-gray-900 text-white font-bold text-xs flex items-center justify-center ${isActive ? 'ring-2 ring-[#2f5bea]' : ''}`}>
                              {th.avatarInitials}
                            </div>
                          )}
                          {th.unreadBadge > 0 && (
                            <span className="absolute -top-1 -right-1 bg-[#ff8a3d] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                              {th.unreadBadge}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <span className="w-2.5 h-2.5 rounded-full bg-[#138a63] animate-pulse my-2" title="23 Online" />
                </div>
              ) : (
                <div className="lg:col-span-4 lintel-chat-panel rounded-[26px] bg-white/70 dark:bg-[#171b23]/80 border border-white/80 dark:border-white/10 backdrop-blur-md p-4 shadow-xs flex flex-col h-[calc(100vh-140px)] sticky top-4">
                  
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 font-black text-sm text-gray-900 dark:text-white">
                      <button
                        onClick={() => setIsChatCollapsed(true)}
                        className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all mr-0.5"
                        title="Recolher Live Chat"
                      >
                        <ChevronRight className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                      </button>
                      Live Chat
                    </div>
                    <span className="bg-[#138a63]/15 text-[#138a63] font-bold text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#138a63] animate-pulse" /> 23 Online
                    </span>
                  </div>

                  {/* Barra de Abas das Conversas (Hollis, Ashby, Omar, Nora) */}
                  <div className="flex items-center gap-3 py-2.5 overflow-x-auto border-b border-gray-100 dark:border-gray-800">
                    {(['hollis', 'ashby', 'omar', 'nora'] as const).map(chatKey => {
                      const th = chatThreads[chatKey];
                      const isActive = activeChatId === chatKey;
                      return (
                        <div
                          key={chatKey}
                          onClick={() => setActiveChatId(chatKey)}
                          className="relative flex flex-col items-center cursor-pointer hover:scale-105 transition-all group"
                        >
                          <div className={`w-9 h-9 rounded-full p-0.5 transition-all ${
                            isActive ? 'ring-2 ring-[#2f5bea]' : 'ring-1 ring-transparent hover:ring-gray-300'
                          }`}>
                            {th.avatarImg ? (
                              <img src={th.avatarImg} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <div className="w-full h-full rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-xs">
                                {th.avatarInitials}
                              </div>
                            )}
                          </div>
                          {th.unreadBadge > 0 && (
                            <span className="absolute -top-1 -right-1 bg-[#ff8a3d] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                              {th.unreadBadge}
                            </span>
                          )}
                          <span className={`text-[10px] font-bold mt-1 transition-colors ${
                            isActive ? 'text-[#2f5bea]' : 'text-gray-500 group-hover:text-gray-800 dark:group-hover:text-gray-200'
                          }`}>
                            {th.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Card do Imóvel Vinculado à Conversa Ativa */}
                  <div className="py-2">
                    <div
                      onClick={() => {
                        const cur = chatThreads[activeChatId];
                        setViewingPropertyDetail(getFullProperty({
                          name: cur.property.name,
                          location: cur.property.location,
                          img: cur.property.thumb
                        }));
                      }}
                      className="p-2 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/60 flex items-center justify-between text-xs cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <img src={chatThreads[activeChatId].property.thumb} alt="" className="w-10 h-8 rounded-lg object-cover" />
                        <div>
                          <b className="block leading-tight text-gray-900 dark:text-white truncate">
                            {chatThreads[activeChatId].property.name}
                          </b>
                          <span className="text-[11px] text-gray-400">
                            {chatThreads[activeChatId].property.location}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>

                  {/* Lista de Mensagens da Conversa Ativa */}
                  <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-3 text-xs">
                    {chatThreads[activeChatId].messages.map((msg: any) => {
                      if (msg.type === 'audio') {
                        return (
                          <div key={msg.id} className="flex flex-col items-start max-w-[85%]">
                            <div className="flex items-center gap-1.5 mb-1 ml-1">
                              <span className="font-bold text-gray-800 dark:text-gray-200">{msg.sender}</span>
                              <span className="text-[10px] text-gray-400">{msg.time}</span>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-2.5 rounded-2xl rounded-tl-xs border border-gray-200/60 dark:border-gray-700/60 shadow-xs flex items-center gap-2.5">
                              <button onClick={() => setVoicePlaying(!voicePlaying)} className="w-7 h-7 rounded-full bg-[#2f5bea] text-white flex items-center justify-center">
                                {voicePlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                              </button>
                              <div className="flex-1">
                                <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full w-24">
                                  <div className={`h-full bg-[#2f5bea] rounded-full ${voicePlaying ? 'w-2/3 animate-pulse' : 'w-1/3'}`} />
                                </div>
                              </div>
                              <span className="text-[10px] text-gray-400 font-bold">{msg.audioDuration}</span>
                            </div>
                            {msg.reactions && (
                              <div className="flex gap-1 mt-1">
                                {msg.reactions.map((r: string, ri: number) => (
                                  <span key={ri} className="text-[10px] bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
                                    {r}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }

                      if (msg.type === 'photos') {
                        return (
                          <div key={msg.id} className="flex flex-col items-end self-end max-w-[85%]">
                            <div className="flex items-center gap-1.5 mb-1 mr-1">
                              <span className="text-[10px] text-gray-400">{msg.time}</span>
                              <span className="font-bold text-gray-800 dark:text-gray-200">{msg.sender}</span>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-2 rounded-2xl rounded-tr-xs border border-gray-200/60 dark:border-gray-700/60 shadow-xs">
                              <div className="grid grid-cols-2 gap-1.5 w-48">
                                <img src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=300&q=80" alt="" className="w-full h-16 rounded-xl object-cover" />
                                <div className="relative rounded-xl overflow-hidden bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center font-black text-base text-[#2f5bea]">
                                  +4
                                </div>
                              </div>
                              <span className="text-[10px] text-gray-400 block mt-1.5 font-medium">{msg.photoCount}</span>
                            </div>
                            {msg.reactions && (
                              <div className="flex gap-1 mt-1">
                                {msg.reactions.map((r: string, ri: number) => (
                                  <span key={ri} className="text-[10px] bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
                                    {r}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${msg.isSelf ? 'items-end self-end' : 'items-start'} max-w-[85%]`}
                        >
                          <div className={`flex items-center gap-1.5 mb-1 ${msg.isSelf ? 'mr-1' : 'ml-1'}`}>
                            {msg.isSelf ? (
                              <>
                                <span className="text-[10px] text-gray-400">{msg.time}</span>
                                <span className="font-bold text-gray-800 dark:text-gray-200">{msg.sender}</span>
                              </>
                            ) : (
                              <>
                                <span className="font-bold text-gray-800 dark:text-gray-200">{msg.sender}</span>
                                <span className="text-[10px] text-gray-400">{msg.time}</span>
                              </>
                            )}
                          </div>
                          <div className={`p-3 rounded-2xl border shadow-xs leading-relaxed ${
                            msg.isSelf
                              ? 'bg-[#121722] text-white dark:bg-white dark:text-[#121722] rounded-tr-xs border-transparent'
                              : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-xs border-gray-200/60 dark:border-gray-700/60'
                          }`}>
                            {msg.text}
                          </div>
                          {msg.reactions && (
                            <div className="flex gap-1 mt-1">
                              {msg.reactions.map((r: string, ri: number) => (
                                <span key={ri} className="text-[10px] bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
                                  {r}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Input de Envio de Mensagem com Envio Real */}
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      if (!chatMessage.trim()) return;
                      const newMsg = {
                        id: `msg_${Date.now()}`,
                        sender: 'Imani Brooks',
                        time: 'Just now',
                        type: 'text',
                        text: chatMessage,
                        isSelf: true
                      };
                      setChatThreads(prev => ({
                        ...prev,
                        [activeChatId]: {
                          ...prev[activeChatId],
                          messages: [...prev[activeChatId].messages, newMsg]
                        }
                      }));
                      setChatMessage('');
                    }}
                    className="pt-2 border-t border-gray-100 dark:border-gray-800"
                  >
                    <div className="flex items-center gap-1.5 p-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-inner">
                      <input
                        type="text"
                        value={chatMessage}
                        onChange={e => setChatMessage(e.target.value)}
                        placeholder="Enter your message"
                        className="flex-1 bg-transparent text-xs text-gray-900 dark:text-white outline-none px-3"
                      />
                      <button type="button" className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full">
                        <Paperclip className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full">
                        <Mic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-full bg-[#121722] text-white dark:bg-white dark:text-[#121722] font-black text-xs flex items-center gap-1 hover:brightness-110 transition-all"
                      >
                        <Send className="w-3 h-3" />
                        Send
                      </button>
                    </div>
                  </form>

                </div>
              )}

            </div>
          </div>
        )}

          </>
        )}

        {/* ========================================================================= */}
        {/* MODAL 1: SEARCH / COMMAND PALETTE (Pesquisar propriedades, pessoas, etc.) */}
        {/* ========================================================================= */}
        {showSearchModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-in fade-in">
            <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-[#1a1f29] border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden">
              <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-800">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  autoFocus
                  value={globalSearchQuery}
                  onChange={e => setGlobalSearchQuery(e.target.value)}
                  placeholder="Pesquisar propriedades, pessoas, páginas..."
                  className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white outline-none font-medium"
                />
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-[11px] font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white"
                >
                  esc
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-4 flex flex-col gap-4 text-xs">
                {/* Seção Páginas */}
                <div>
                  <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase block mb-2 px-2">Pages</span>
                  <div className="flex flex-col gap-1">
                    {[
                      { id: 'overview', title: 'Overview', sub: 'Go to page' },
                      { id: 'rentals', title: 'Rentals', sub: 'Go to page' },
                      { id: 'sales', title: 'Sales', sub: 'Go to page' },
                      { id: 'deals', title: 'Deals', sub: 'Go to page' },
                      { id: 'leads', title: 'Leads', sub: 'Go to page' },
                      { id: 'contacts', title: 'Contacts', sub: 'Go to page' }
                    ]
                      .filter(p => !globalSearchQuery || p.title.toLowerCase().includes(globalSearchQuery.toLowerCase()))
                      .map(p => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setActiveTab(p.id as any);
                            setShowSearchModal(false);
                          }}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-all text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300">
                              <ArrowUpRight className="w-4 h-4" />
                            </div>
                            <div>
                              <b className="block text-gray-900 dark:text-white text-xs">{p.title}</b>
                              <span className="text-[10px] text-gray-400">{p.sub}</span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </button>
                      ))}
                  </div>
                </div>

                {/* Seção Propriedades */}
                <div>
                  <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase block mb-2 px-2">Properties</span>
                  <div className="flex flex-col gap-1">
                    {[
                      { name: 'Hollis Modern House', loc: 'La Jolla · For sale · $1.24M', img: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=80&q=80' },
                      { name: 'Casa Alva', loc: 'Rancho Santa Fe · Sold · $2.195M', img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=80&q=80' },
                      { name: 'Cedar Ridge House', loc: 'Julian · For sale · $1.4M', img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=80&q=80' },
                      { name: 'Arbor Tower', loc: 'Downtown · To rent · $3,700/mo', img: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=80&q=80' }
                    ]
                      .filter(pr => !globalSearchQuery || pr.name.toLowerCase().includes(globalSearchQuery.toLowerCase()) || pr.loc.toLowerCase().includes(globalSearchQuery.toLowerCase()))
                      .map((pr, idx) => (
                        <div
                          key={idx}
                          onClick={() => setShowSearchModal(false)}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/60 cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <img src={pr.img} alt="" className="w-9 h-9 rounded-lg object-cover" />
                            <div>
                              <b className="block text-gray-900 dark:text-white text-xs">{pr.name}</b>
                              <span className="text-[10px] text-gray-400">{pr.loc}</span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 2: NEW LISTING FOR SALE (Criar anúncio de venda)                     */}
        {/* ========================================================================= */}
        {showNewListingModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#1a1f29] border border-gray-200 dark:border-gray-700 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowNewListingModal(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <h2 className="text-xl font-black text-gray-900 dark:text-white mb-1">
                Novo anúncio for sale
              </h2>
              <p className="text-xs text-gray-500 mb-6">
                Inicia como rascunho — publique quando as fotos forem inseridas.
              </p>

              <form
                onSubmit={e => {
                  e.preventDefault();
                  alert(`Anúncio "${newListingForm.name || 'Nova Propriedade'}" criado com sucesso!`);
                  setShowNewListingModal(false);
                }}
                className="flex flex-col gap-4 text-xs"
              >
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Nome do imóvel
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Juniper Court House"
                    value={newListingForm.name}
                    onChange={e => setNewListingForm({ ...newListingForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#141820] text-gray-900 dark:text-white outline-none focus:border-[#2f5bea]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Endereço / Logradouro
                    </label>
                    <input
                      type="text"
                      value={newListingForm.address}
                      onChange={e => setNewListingForm({ ...newListingForm, address: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#141820] text-gray-900 dark:text-white outline-none focus:border-[#2f5bea]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Bairro / Região
                    </label>
                    <input
                      type="text"
                      value={newListingForm.neighborhood}
                      onChange={e => setNewListingForm({ ...newListingForm, neighborhood: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#141820] text-gray-900 dark:text-white outline-none focus:border-[#2f5bea]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Preço de venda (US$)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1,250,000"
                      value={newListingForm.price}
                      onChange={e => setNewListingForm({ ...newListingForm, price: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#141820] text-gray-900 dark:text-white outline-none focus:border-[#2f5bea]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Tipo do imóvel
                    </label>
                    <select
                      value={newListingForm.type}
                      onChange={e => setNewListingForm({ ...newListingForm, type: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#141820] text-gray-900 dark:text-white outline-none focus:border-[#2f5bea]"
                    >
                      <option>House</option>
                      <option>Villa</option>
                      <option>Apartment</option>
                      <option>Condo</option>
                      <option>Cabin</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Quartos
                    </label>
                    <input
                      type="number"
                      value={newListingForm.beds}
                      onChange={e => setNewListingForm({ ...newListingForm, beds: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#141820] text-gray-900 dark:text-white outline-none focus:border-[#2f5bea]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Banheiros
                    </label>
                    <input
                      type="number"
                      value={newListingForm.baths}
                      onChange={e => setNewListingForm({ ...newListingForm, baths: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#141820] text-gray-900 dark:text-white outline-none focus:border-[#2f5bea]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Área útil (m²)
                    </label>
                    <input
                      type="text"
                      value={newListingForm.sqft}
                      onChange={e => setNewListingForm({ ...newListingForm, sqft: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#141820] text-gray-900 dark:text-white outline-none focus:border-[#2f5bea]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Proprietário / Vendedor
                    </label>
                    <select
                      value={newListingForm.seller}
                      onChange={e => setNewListingForm({ ...newListingForm, seller: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#141820] text-gray-900 dark:text-white outline-none focus:border-[#2f5bea]"
                    >
                      <option>Elise Marchetti</option>
                      <option>Omar Saleh</option>
                      <option>Spencer Hale</option>
                      <option>Priya Natarajan</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Corretor responsável
                  </label>
                  <select
                    value={newListingForm.agent}
                    onChange={e => setNewListingForm({ ...newListingForm, agent: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#141820] text-gray-900 dark:text-white outline-none focus:border-[#2f5bea]"
                  >
                    <option>Imani Brooks</option>
                    <option>Henrik Dahl</option>
                    <option>Jordan Ellis</option>
                    <option>Camila Duarte</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => setShowNewListingModal(false)}
                    className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-full bg-[#121722] text-white dark:bg-white dark:text-[#121722] font-black hover:scale-105 transition-all shadow-md"
                  >
                    Salvar rascunho
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 3: NEW CONTACT (Adicionar novo cliente ou proprietário)               */}
        {/* ========================================================================= */}
        {showNewContactModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#1a1f29] border border-gray-200 dark:border-gray-700 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowNewContactModal(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <h2 className="text-xl font-black text-gray-900 dark:text-white mb-1">
                Novo Contato
              </h2>
              <p className="text-xs text-gray-500 mb-6">
                Cadastre um novo cliente, comprador, vendedor ou inquilino na sua base de CRM.
              </p>

              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (!newContactForm.name.trim()) return;
                  const newContact = {
                    id: `c_${Date.now()}`,
                    name: newContactForm.name,
                    kind: newContactForm.kind,
                    email: newContactForm.email || `${newContactForm.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
                    phone: newContactForm.phone || '+1 (555) 019-9000',
                    city: newContactForm.city,
                    budget: newContactForm.budget,
                    agent: newContactForm.agent,
                    lastContact: 'Just now',
                    favorite: false
                  };
                  setContactsData(prev => [newContact, ...prev]);
                  setNewContactForm({
                    name: '',
                    email: '',
                    phone: '',
                    city: 'La Jolla',
                    kind: 'buyer',
                    budget: '$1.0M – $1.5M',
                    agent: 'Imani Brooks'
                  });
                  setShowNewContactModal(false);
                  alert(`Contato "${newContact.name}" adicionado com sucesso!`);
                }}
                className="flex flex-col gap-4 text-xs"
              >
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Nome completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sofia Vergara"
                    value={newContactForm.name}
                    onChange={e => setNewContactForm({ ...newContactForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#141820] text-gray-900 dark:text-white outline-none focus:border-[#2f5bea]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Role / Tipo do imóvel
                    </label>
                    <select
                      value={newContactForm.kind}
                      onChange={e => setNewContactForm({ ...newContactForm, kind: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#141820] text-gray-900 dark:text-white outline-none focus:border-[#2f5bea]"
                    >
                      <option value="buyer">Buyer</option>
                      <option value="seller">Proprietário / Vendedor</option>
                      <option value="tenant">Tenant</option>
                      <option value="landlord">Landlord</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Cidade / Bairro
                    </label>
                    <input
                      type="text"
                      value={newContactForm.city}
                      onChange={e => setNewContactForm({ ...newContactForm, city: e.target.value })}
                      placeholder="e.g. Del Mar"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#141820] text-gray-900 dark:text-white outline-none focus:border-[#2f5bea]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                      E-mail de contato
                    </label>
                    <input
                      type="email"
                      placeholder="client@domain.com"
                      value={newContactForm.email}
                      onChange={e => setNewContactForm({ ...newContactForm, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#141820] text-gray-900 dark:text-white outline-none focus:border-[#2f5bea]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Telefone de contato
                    </label>
                    <input
                      type="tel"
                      placeholder="+1 (858) 555-0100"
                      value={newContactForm.phone}
                      onChange={e => setNewContactForm({ ...newContactForm, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#141820] text-gray-900 dark:text-white outline-none focus:border-[#2f5bea]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Faixa de investimento / Orçamento
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. $1.5M – $2.0M"
                      value={newContactForm.budget}
                      onChange={e => setNewContactForm({ ...newContactForm, budget: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#141820] text-gray-900 dark:text-white outline-none focus:border-[#2f5bea]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Corretor atribuído
                    </label>
                    <select
                      value={newContactForm.agent}
                      onChange={e => setNewContactForm({ ...newContactForm, agent: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#141820] text-gray-900 dark:text-white outline-none focus:border-[#2f5bea]"
                    >
                      <option>Imani Brooks</option>
                      <option>Henrik Dahl</option>
                      <option>Jordan Ellis</option>
                      <option>Camila Duarte</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => setShowNewContactModal(false)}
                    className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-full bg-[#121722] text-white dark:bg-white dark:text-[#121722] font-black hover:scale-105 transition-all shadow-md"
                  >
                    Adicionar contato
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 4: CONTACT PROFILE (Visualização detalhada do perfil do contato)     */}
        {/* ========================================================================= */}
        {selectedContactForProfile && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#1a1f29] border border-gray-200 dark:border-gray-700 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setSelectedContactForProfile(null)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#2f5bea] to-[#7192ff] text-white flex items-center justify-center font-black text-xl shadow-md">
                  {selectedContactForProfile.name.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight">
                    {selectedContactForProfile.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400 font-medium">
                      {selectedContactForProfile.city} · {selectedContactForProfile.agent}
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full capitalize bg-[#2f5bea]/15 text-[#2f5bea]">
                      {selectedContactForProfile.kind}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 py-4 border-y border-gray-100 dark:border-gray-800 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-semibold flex items-center gap-2">
                    <Mail className="w-4 h-4" /> E-mail
                  </span>
                  <a href={`mailto:${selectedContactForProfile.email}`} className="font-bold text-[#2f5bea] hover:underline">
                    {selectedContactForProfile.email}
                  </a>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-semibold flex items-center gap-2">
                    <Phone className="w-4 h-4" /> Telefone
                  </span>
                  <button
                    onClick={() => {
                      setCallingContact(selectedContactForProfile);
                      setSelectedContactForProfile(null);
                    }}
                    className="font-bold text-[#138a63] hover:underline flex items-center gap-1"
                  >
                    {selectedContactForProfile.phone}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-semibold">Orçamento / Budget</span>
                  <b className="font-black text-gray-900 dark:text-white">{selectedContactForProfile.budget}</b>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-semibold">Último contato</span>
                  <span className="font-medium text-gray-600 dark:text-gray-300">{selectedContactForProfile.lastContact}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-5">
                <button
                  type="button"
                  onClick={() => {
                    setCallingContact(selectedContactForProfile);
                    setSelectedContactForProfile(null);
                  }}
                  className="flex-1 py-2.5 rounded-full bg-[#138a63] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm hover:scale-[1.02] transition-all"
                >
                  <Phone className="w-4 h-4" /> Fazer Ligação
                </button>
                <button
                  type="button"
                  onClick={() => {
                    alert(`Mensagem direta enviada para ${selectedContactForProfile.name}!`);
                    setSelectedContactForProfile(null);
                  }}
                  className="flex-1 py-2.5 rounded-full bg-[#121722] text-white dark:bg-white dark:text-[#121722] font-black text-xs flex items-center justify-center gap-2 shadow-sm hover:scale-[1.02] transition-all"
                >
                  <Mail className="w-4 h-4" /> Enviar Mensagem
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 5: ACTIVE PHONE CALL (Discador e simulação de chamada ativa)         */}
        {/* ========================================================================= */}
        {callingContact && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-3xl bg-[#171b23] text-white border border-white/10 shadow-2xl p-6 text-center relative flex flex-col items-center">
              <div className="relative mb-4 mt-2">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#138a63] to-[#2feaa8] text-white flex items-center justify-center font-black text-2xl shadow-lg animate-pulse">
                  <Phone className="w-8 h-8" />
                </div>
                <span className="absolute -bottom-1 right-1 w-4 h-4 rounded-full bg-[#138a63] border-2 border-[#171b23]" />
              </div>

              <h3 className="text-xl font-black mb-1">{callingContact.name}</h3>
              <p className="text-xs text-gray-400 mb-2">{callingContact.phone || '+1 (858) 555-0100'}</p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#138a63]/20 text-[#2feaa8] text-[11px] font-bold mb-6">
                <span className="w-2 h-2 rounded-full bg-[#2feaa8] animate-ping" />
                Chamando corretor / cliente...
              </div>

              <div className="flex items-center justify-center gap-4 w-full">
                <button
                  onClick={() => {
                    alert(`Ligação para ${callingContact.name} atendida e gravada no histórico CRM.`);
                    setCallingContact(null);
                  }}
                  className="flex-1 py-3 rounded-2xl bg-[#138a63] text-white font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-md"
                >
                  <Phone className="w-4 h-4" /> Conectar
                </button>
                <button
                  onClick={() => setCallingContact(null)}
                  className="flex-1 py-3 rounded-2xl bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-md"
                >
                  <X className="w-4 h-4" /> Desligar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 6: PROPERTY DETAILS (Visualização rápida da propriedade)             */}
        {/* ========================================================================= */}
        {selectedPropertyModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#1a1f29] border border-gray-200 dark:border-gray-700 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setSelectedPropertyModal(null)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="h-44 w-full rounded-2xl overflow-hidden mb-4 border border-gray-200 dark:border-gray-700 relative">
                <img src={selectedPropertyModal.img} alt="" className="w-full h-full object-cover" />
                <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#121722]/80 backdrop-blur text-white text-[11px] font-black">
                  {selectedPropertyModal.type || 'Property'}
                </span>
              </div>

              <div className="flex items-start justify-between mb-2">
                <div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white">
                    {selectedPropertyModal.name}
                  </h2>
                  <p className="text-xs text-gray-400">{selectedPropertyModal.address}</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-[#138a63] block">
                    {selectedPropertyModal.rent || selectedPropertyModal.price || '$3,200/mo'}
                  </span>
                  <span className="text-[11px] text-gray-400 font-semibold">{selectedPropertyModal.units || 'Active'}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-800 mt-4">
                <button
                  type="button"
                  onClick={() => setSelectedPropertyModal(null)}
                  className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold text-xs"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const p = selectedPropertyModal;
                    setSelectedPropertyModal(null);
                    setViewingPropertyDetail(getFullProperty(p));
                  }}
                  className="px-5 py-2 rounded-full bg-[#121722] text-white dark:bg-white dark:text-[#121722] font-black text-xs hover:scale-105 transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  Ver Ficha Completa <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 7: ACTIVITY MODAL (Popup completo de atividades recentes)           */}
        {/* ========================================================================= */}
        {showActivityModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-[#1a1f29] border border-gray-200 dark:border-gray-700 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowActivityModal(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-[#2f5bea]">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white">
                  Activity
                </h2>
              </div>

              <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                {activities.map((act, i) => (
                  <div key={i} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {act.avImg ? (
                        <img src={act.avImg} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className={`w-9 h-9 rounded-full font-bold flex items-center justify-center text-xs flex-shrink-0 ${act.avColor || 'bg-gray-200 text-gray-800'}`}>
                          {act.av || act.name[0]}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="leading-snug text-gray-800 dark:text-gray-200">
                          <b>{act.name}</b> {act.action}{' '}
                          {act.prop ? (
                            <button
                              type="button"
                              onClick={() => {
                                setShowActivityModal(false);
                                setViewingPropertyDetail(getFullProperty({ name: act.prop }));
                              }}
                              className="text-[#2f5bea] font-semibold hover:underline inline-flex items-center gap-0.5 text-left"
                            >
                              <span>{act.prop}</span>
                              <ArrowUpRight className="w-3 h-3 inline" />
                            </button>
                          ) : null}
                        </p>
                        <span className="text-[10px] text-gray-400 font-medium block mt-0.5">{act.time}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (act.prop) {
                          setShowActivityModal(false);
                          setSelectedPropertyModal({
                            name: act.prop,
                            address: act.prop.includes('Mistfield') ? '102 Mistfield Way · Julian' : act.prop.includes('Hollis') ? '18 Hollis Ct · La Jolla' : 'San Diego, CA',
                            type: act.prop.includes('Cabin') ? 'Cabin' : 'House',
                            rent: act.prop.includes('Mistfield') ? '$780,000' : '$1,240,000',
                            units: 'Active',
                            img: act.prop.includes('Mistfield')
                              ? 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80'
                              : 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80'
                          });
                        }
                      }}
                      className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white flex-shrink-0"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <PortfolioMapExpandModal
          open={portfolioMapExpanded}
          onClose={() => setPortfolioMapExpanded(false)}
          activePinId={activeMapPinId}
          onPinHover={setActiveMapPinId}
          onPinSelect={handlePortfolioPinSelect}
          pins={portfolioPins ?? undefined}
          summaryLabel={portfolioMapSummary}
        />

        <BookViewingModal
          open={showBookViewingModal}
          onClose={() => setShowBookViewingModal(false)}
          form={bookViewingForm}
          onChange={(patch) => setBookViewingForm((prev) => ({ ...prev, ...patch }))}
          onSave={() => setShowBookViewingModal(false)}
        />

      </div>
    </div>
  );
}

