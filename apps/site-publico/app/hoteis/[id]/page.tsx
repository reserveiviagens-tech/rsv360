'use client';

// ===================================================================
// PÁGINA PÚBLICA - DETALHES DO EMPREENDIMENTO
// ===================================================================

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Building2, MapPin, Phone, Mail, Globe, Star, Calendar, Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import type { Enterprise, Property, Accommodation } from '@/types/accommodations';
import { getCrossSellItems, COTACAO_ITEM } from '@/lib/cross-sell-matrix';
import { getContextualSubtitle } from '@/lib/cross-sell-context-messages';
import { MobileCrossSellCard } from '@/components/home/mobile-cross-sell-card';
import { getHomeSideRailsFallback } from '@/lib/home-side-rails';
import { HotelBookingWidget } from '@/components/hotel/HotelBookingWidget';
import { HotelMapPin } from '@/components/hotel/HotelMapPin';
import { getCoordinatesByHotelName } from '@/lib/caldas-novas-coordinates';
import ChatAgent from '@/components/chat-agent';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export default function EnterpriseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  
  const [enterprise, setEnterprise] = useState<Enterprise | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (id) {
      loadEnterprise();
      loadProperties();
    }
  }, [id]);

  const loadEnterprise = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/enterprises/${id}`);
      const data = await response.json();
      if (data.success && data.data) {
        setEnterprise(data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar empreendimento:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProperties = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/enterprises/${id}/properties`);
      const data = await response.json();
      if (data.success && data.data) {
        setProperties(Array.isArray(data.data) ? data.data : [data.data]);
      }
    } catch (error) {
      console.error('Erro ao carregar propriedades:', error);
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      hotel: 'Hotel',
      pousada: 'Pousada',
      resort: 'Resort',
      flat: 'Flat',
      chacara: 'Chácara',
      hostel: 'Hostel',
      apartment_hotel: 'Apart Hotel',
      resort_apartment: 'Apartamento de Resort',
      resort_house: 'Casa de Resort',
      hotel_house: 'Casa de Hotel',
      airbnb: 'Airbnb',
      other: 'Outro'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!enterprise) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Empreendimento não encontrado</p>
          <Link href="/hoteis" className="text-blue-600 hover:underline">
            Voltar para lista
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section com Imagens */}
      <div className="relative h-96 bg-gray-900">
        {enterprise.images && enterprise.images.length > 0 ? (
          <>
            <img
              src={enterprise.images[selectedImage]}
              alt={enterprise.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-40"></div>
            {enterprise.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                {enterprise.images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-2 h-2 rounded-full ${
                      index === selectedImage ? 'bg-white' : 'bg-white bg-opacity-50'
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="w-24 h-24 text-gray-400" />
          </div>
        )}
        
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 text-white">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-blue-600 rounded-full text-sm font-medium">
                  {getTypeLabel(enterprise.enterpriseType)}
                </span>
                {enterprise.isFeatured && (
                  <span className="px-3 py-1 bg-yellow-400 text-yellow-900 rounded-full text-sm font-medium flex items-center gap-1">
                    <Star className="w-4 h-4" />
                    Destaque
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{enterprise.name}</h1>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                <span className="text-lg">
                  {enterprise.address.city}, {enterprise.address.state}
                </span>
              </div>
            </div>
            <div className="shrink-0 w-full lg:w-[320px]">
              <HotelBookingWidget
                enterpriseId={String(enterprise.id)}
                enterpriseName={enterprise.name}
                pricePerNight={properties[0]?.basePricePerNight ?? undefined}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Conteúdo Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Descrição */}
            {enterprise.description && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Sobre</h2>
                <p className="text-gray-700 leading-relaxed">{enterprise.description}</p>
              </div>
            )}

            {/* Amenidades */}
            {enterprise.amenities && enterprise.amenities.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Amenidades</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {enterprise.amenities.map((amenity, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-gray-700">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Propriedades e Acomodações */}
            {properties.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Acomodações Disponíveis</h2>
                <div className="space-y-4">
                  {properties.map(property => (
                    <div key={property.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <h3 className="font-semibold text-gray-900 mb-2">{property.name}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>{property.maxGuests} hóspedes</span>
                        </div>
                        <div>
                          <span>{property.bedrooms} quartos</span>
                        </div>
                        <div>
                          <span>{property.bathrooms} banheiros</span>
                        </div>
                        {property.basePricePerNight && (
                          <div className="font-semibold text-blue-600">
                            R$ {property.basePricePerNight.toFixed(2)}/noite
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cross-sell: após galeria/descrição — 2 cards (Parques + Atrações) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {getCrossSellItems('hotel-detail', getHomeSideRailsFallback(), { limit: 3 })
                .filter((i) => i.id === 'water-parks' || i.id === 'attractions')
                .map((item) => (
                  <MobileCrossSellCard
                    key={item.id}
                    item={item}
                    variant="full"
                    randomImage
                    contextualSubtitle={getContextualSubtitle('hotel-detail', item.id, item.subtitle)}
                  />
                ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Informações de Contato */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações de Contato</h3>
              <div className="space-y-3">
                {enterprise.contact?.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <a href={`tel:${enterprise.contact.phone}`} className="text-gray-700 hover:text-blue-600">
                      {enterprise.contact.phone}
                    </a>
                  </div>
                )}
                {enterprise.contact?.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <a href={`mailto:${enterprise.contact.email}`} className="text-gray-700 hover:text-blue-600">
                      {enterprise.contact.email}
                    </a>
                  </div>
                )}
                {enterprise.contact?.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-gray-400" />
                    <a
                      href={enterprise.contact.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-700 hover:text-blue-600"
                    >
                      Website
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Configurações */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900">Check-in</div>
                    <div className="text-gray-600">{enterprise.checkInTime || '15:00'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900">Check-out</div>
                    <div className="text-gray-600">{enterprise.checkOutTime || '11:00'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900">Política de Cancelamento</div>
                    <div className="text-gray-600 capitalize">
                      {enterprise.cancellationPolicy || 'Moderada'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Endereço Completo */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Localização</h3>
              <div className="space-y-2 text-sm text-gray-700">
                {enterprise.address.street && (
                  <div>
                    {enterprise.address.street}
                    {enterprise.address.number && `, ${enterprise.address.number}`}
                    {enterprise.address.complement && ` - ${enterprise.address.complement}`}
                  </div>
                )}
                {enterprise.address.neighborhood && (
                  <div>{enterprise.address.neighborhood}</div>
                )}
                <div>
                  {enterprise.address.city}, {enterprise.address.state}
                  {enterprise.address.zipCode && ` - ${enterprise.address.zipCode}`}
                </div>
                {enterprise.address.country && (
                  <div>{enterprise.address.country}</div>
                )}
              </div>
            </div>

            {/* Mapa com pin do hotel */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Mapa</h3>
              <HotelMapPin
                lat={getCoordinatesByHotelName(String(enterprise.id)).lat}
                lng={getCoordinatesByHotelName(String(enterprise.id)).lng}
                title={enterprise.name}
              />
            </div>

            {/* Botão de Reserva */}
            <div className="mb-4">
              <MobileCrossSellCard
                item={COTACAO_ITEM}
                variant="compact"
                ctaText="Completar pacote"
                contextualSubtitle={getContextualSubtitle('hotel-detail', 'monte-suas-ferias', COTACAO_ITEM.subtitle)}
              />
            </div>
            <button
              onClick={() => router.push(`/reservar?enterprise=${enterprise.id}`)}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg"
            >
              Fazer Reserva
            </button>
          </div>
        </div>
      </div>

      <ChatAgent />
    </div>
  );
}
