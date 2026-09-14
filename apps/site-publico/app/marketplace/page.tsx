'use client'

import React, { useState, useEffect } from 'react'
import { ShoppingBag, Search, Filter, MapPin, Star, Calendar, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'

interface Listing {
  id: number
  title: string
  description?: string
  property_id: number
  accommodation_id?: number
  base_price: number
  commission_rate: number
  status: string
  ranking_score: number
  total_views: number
  total_bookings: number
  property_name?: string
  accommodation_name?: string
  enterprise_name?: string
  images?: string[]
  amenities?: string[]
}

export default function MarketplacePage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    sortBy: 'ranking_score',
  })

  useEffect(() => {
    loadListings()
  }, [filters])

  const loadListings = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/api/v1/marketplace/listings/active`)
      const data = await response.json()
      setListings(Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []))
    } catch (error) {
      console.error('Falha ao carregar listagens do marketplace:', error)
      setListings([])
    } finally {
      setLoading(false)
    }
  }

  const filteredListings = listings.filter(listing => {
    if (searchTerm && !listing.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    if (filters.minPrice && listing.base_price < parseFloat(filters.minPrice)) {
      return false
    }
    if (filters.maxPrice && listing.base_price > parseFloat(filters.maxPrice)) {
      return false
    }
    return true
  })

  const sortedListings = [...filteredListings].sort((a, b) => {
    switch (filters.sortBy) {
      case 'price_low':
        return a.base_price - b.base_price
      case 'price_high':
        return b.base_price - a.base_price
      case 'ranking_score':
      default:
        return b.ranking_score - a.ranking_score
    }
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-blue-600" />
            Marketplace Multi-Hotéis
          </h1>
          <p className="text-gray-600 mt-2">
            Encontre os melhores hotéis e acomodações com preços especiais
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Buscar hotéis, destinos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Preço mín."
                value={filters.minPrice}
                onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                className="w-32"
              />
              <Input
                type="number"
                placeholder="Preço máx."
                value={filters.maxPrice}
                onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                className="w-32"
              />
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                className="px-4 py-2 border rounded-md"
              >
                <option value="ranking_score">Melhor Avaliação</option>
                <option value="price_low">Menor Preço</option>
                <option value="price_high">Maior Preço</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Listings */}
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary inline-block"></div>
            <p className="mt-4 text-gray-600">Carregando listagens...</p>
          </div>
        ) : sortedListings.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Nenhuma listagem encontrada</p>
            <p className="text-gray-500 text-sm mt-2">
              {searchTerm || filters.minPrice || filters.maxPrice
                ? 'Tente ajustar os filtros de busca'
                : 'Aguarde novas listagens'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedListings.map((listing) => (
              <Card key={listing.id} className="hover:shadow-lg transition-shadow">
                <div className="relative h-48 bg-gray-200 rounded-t-lg overflow-hidden">
                  {listing.images && listing.images.length > 0 ? (
                    <img
                      src={listing.images[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <ShoppingBag className="w-16 h-16" />
                    </div>
                  )}
                  <Badge className="absolute top-2 right-2">
                    Nota: {listing.ranking_score.toFixed(1)}
                  </Badge>
                </div>
                <CardHeader>
                  <CardTitle className="text-lg">{listing.title}</CardTitle>
                  {listing.property_name && (
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {listing.property_name}
                      {listing.accommodation_name && ` - ${listing.accommodation_name}`}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  {listing.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {listing.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-2xl font-bold text-primary">
                        R$ {listing.base_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-gray-500">por noite</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-semibold">
                          {(listing.ranking_score / 20).toFixed(1)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {listing.total_bookings} reservas
                      </p>
                    </div>
                  </div>
                  {listing.amenities && listing.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {listing.amenities.slice(0, 3).map((amenity, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Link href={`/marketplace/${listing.id}`}>
                    <Button className="w-full">
                      Ver Detalhes e Reservar
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
