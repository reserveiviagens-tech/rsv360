'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Home,
  Sliders,
  Building,
  FileDown,
  Route,
  Layers,
  Menu,
  X,
  Bell,
  Settings,
  LogOut,
  Percent,
  Calculator,
  DollarSign,
  FileSpreadsheet,
  Gift,
  CircleDot,
} from 'lucide-react';
import { AuctionStats } from './AuctionStats';
import { ActiveAuctionsList } from './ActiveAuctionsList';
import { RevenueChart } from './RevenueChart';
import { OccupancyChart, AuctionPerformanceChart, BidDistributionChart } from './OccupancyChart';
import { useProprietorDashboard } from '@/hooks/useProprietorDashboard';
import { useRevenueData } from '@/hooks/useRevenueData';

export function AuctionDashboard() {
  const [showSidebar, setShowSidebar] = useState(false);
  const [revenuePeriod, setRevenuePeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const { stats, auctions, loading, error } = useProprietorDashboard();
  const { revenueData, occupancyData, performanceData, loading: chartsLoading } = useRevenueData(revenuePeriod);

  const sidebarItems = [
    { icon: CircleDot, label: 'Menu Radial', href: '/dashboard/radial' },
    { icon: Home, label: 'Proprietário', href: '/dashboard/proprietario', active: true },
    { icon: Sliders, label: 'Controles', href: '/dashboard/slider' },
    { icon: Building, label: 'Hotéis', href: '/dashboard/hotels' },
    { icon: FileDown, label: 'Documentos', href: '/dashboard/documents' },
    { icon: Route, label: 'Rotas', href: '/dashboard/routes' },
    { icon: Layers, label: 'Apartamentos', href: '/dashboard/flats' },
    { icon: DollarSign, label: 'Financeiro', href: '/dashboard/financeiro' },
    { icon: FileSpreadsheet, label: 'Contábil', href: '/dashboard/contabil' },
    { icon: Percent, label: 'Config. de Divisão', href: '/dashboard/split-config' },
    { icon: Calculator, label: 'Tributação', href: '/dashboard/tributacao' },
    { icon: Gift, label: 'Incentivos', href: '/dashboard/incentivos' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                title="Abrir menu"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="ml-4 lg:ml-0">
                <h1 className="text-2xl font-bold text-gray-900">Painel do Proprietário</h1>
                <p className="text-sm text-gray-500">Gestão de Leilões e Propriedades</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-500 relative" title="Notificações">
                <Bell className="w-6 h-6" />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400"></span>
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md" title="Configurações">
                <Settings className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md" title="Sair">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Azul */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0066CC] shadow-lg transform ${showSidebar ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-0 transition-transform duration-300 ease-in-out`}>
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between h-16 px-6 border-b border-blue-700">
              <h2 className="text-lg font-semibold text-white">Menu Principal</h2>
              <button
                onClick={() => setShowSidebar(false)}
                className="lg:hidden p-1 rounded-md text-white hover:bg-blue-700"
                title="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-2">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      item.active
                        ? 'bg-blue-700 text-white'
                        : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 lg:ml-64">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {error && (
              <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium">Aviso: Não foi possível conectar ao backend</h3>
                    <div className="mt-2 text-sm">
                      <p>Erro: {error}</p>
                      <p className="mt-1">Exibindo dados de exemplo. Verifique se o backend está rodando em <code className="bg-yellow-100 px-1 rounded">{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}</code></p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cards de Estatísticas */}
            <AuctionStats stats={stats || undefined} loading={loading} />

            {/* Gráficos */}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RevenueChart
                data={revenueData}
                loading={chartsLoading}
                period={revenuePeriod}
                onPeriodChange={setRevenuePeriod}
              />
              <OccupancyChart data={occupancyData} loading={chartsLoading} />
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AuctionPerformanceChart data={performanceData || undefined} loading={chartsLoading} />
              <BidDistributionChart loading={chartsLoading} />
            </div>

            {/* Lista de Leilões Ativos */}
            <div className="mt-8">
              <ActiveAuctionsList auctions={auctions as any} loading={loading} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
