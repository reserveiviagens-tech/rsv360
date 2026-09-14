"use client";

import { useState, useEffect } from 'react';

// Tipos para os dados de analytics
export interface AnalyticsOverview {
  totalBookings: number;
  totalRevenue: number;
  activeUsers: number;
  conversionRate: number;
}

export interface AnalyticsTrends {
  bookings: Array<{ month: string; value: number; date?: string }>;
  revenue: Array<{ month: string; value: number; date?: string }>;
}

export interface AnalyticsContent {
  popularHotels: Array<{ name: string; bookings: number }>;
  popularAttractions: Array<{ name: string; visits: number }>;
}

export interface AnalyticsUsers {
  newUsers: number;
  returningUsers: number;
  userGrowth: number;
}

export interface AnalyticsPerformance {
  pageLoadTime: number;
  bounceRate: number;
  avgSessionDuration: number;
}

export interface AnalyticsData {
  overview: AnalyticsOverview;
  trends: AnalyticsTrends;
  content: AnalyticsContent;
  users: AnalyticsUsers;
  performance: AnalyticsPerformance;
}

export interface ReportParams {
  period: 'day' | 'week' | 'month' | 'year';
  metrics: string[];
  filters?: Record<string, any>;
}

export interface GeneratedReport {
  id: string;
  title: string;
  data: Record<string, any>;
  generatedAt: string;
}

export interface ExportParams {
  period: 'day' | 'week' | 'month' | 'year';
  metrics: string[];
}

// Hook principal para gerenciar dados de analytics
export function useAnalytics() {
  const [overview, setOverview] = useState<AnalyticsOverview>({
    totalBookings: 0,
    totalRevenue: 0,
    activeUsers: 0,
    conversionRate: 0
  });
  const [trends, setTrends] = useState<AnalyticsTrends>({
    bookings: [],
    revenue: []
  });
  const [content, setContent] = useState<AnalyticsContent>({
    popularHotels: [],
    popularAttractions: []
  });
  const [users, setUsers] = useState<AnalyticsUsers>({
    newUsers: 0,
    returningUsers: 0,
    userGrowth: 0
  });
  const [performance, setPerformance] = useState<AnalyticsPerformance>({
    pageLoadTime: 0,
    bounceRate: 0,
    avgSessionDuration: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<GeneratedReport | null>(null);

  // URL base das APIs
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
  const ADMIN_TOKEN = 'Bearer admin-token-123';

  // Função para fazer requisições com tratamento de erro
  const fetchData = async (url: string, options: RequestInit = {}) => {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': ADMIN_TOKEN,
          ...options.headers,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (err: any) {
      console.error('Erro na requisição:', err);
      setError(err.message || 'Erro desconhecido na requisição');
      throw err;
    }
  };

  // Carregar todos os dados de analytics
  const loadAnalyticsData = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchData(`${API_BASE_URL}/api/analytics/overview`);

      if (data.overview) setOverview(data.overview);
      if (data.trends) setTrends(data.trends);
      if (data.content) setContent(data.content);
      if (data.users) setUsers(data.users);
      if (data.performance) setPerformance(data.performance);
    } catch (err) {
      console.error('Erro ao carregar analytics:', err);
      setError('Erro ao carregar analytics');
    } finally {
      setLoading(false);
    }
  };

  // Atualizar dados em tempo real
  const refreshData = async () => {
    await loadAnalyticsData();
  };

  // Gerar relatório personalizado
  const generateReport = async (params: ReportParams): Promise<GeneratedReport> => {
    try {
      const data = await fetchData(`${API_BASE_URL}/api/analytics/report`, {
        method: 'POST',
        body: JSON.stringify(params),
      });
      return data.report;
    } catch (err) {
      console.error('Erro ao gerar relatório:', err);
      throw err;
    }
  };

  // Exportar dados
  const exportData = async (format: 'csv' | 'xlsx', params: ExportParams): Promise<Blob> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': ADMIN_TOKEN,
        },
        body: JSON.stringify({ format, ...params }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.blob();
    } catch (err: any) {
      console.error('Erro ao exportar dados:', err);
      throw err;
    }
  };

  // Filtrar dados por período
  const getFilteredData = (period: string) => {
    // Simular filtragem por período
    return {
      overview,
      trends,
      content,
      users,
      performance
    };
  };

  // Calcular métricas derivadas
  const getDerivedMetrics = () => {
    return {
      averageBookingValue: overview.totalRevenue / overview.totalBookings || 0,
      bookingsPerUser: overview.totalBookings / overview.activeUsers || 0,
      revenueGrowth: trends.revenue.length > 1 ?
        ((trends.revenue[trends.revenue.length - 1]?.value || 0) - (trends.revenue[trends.revenue.length - 2]?.value || 0)) / (trends.revenue[trends.revenue.length - 2]?.value || 1) * 100 : 0
    };
  };

  // Carregar dados na inicialização
  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const data = {
    overview: {
      totalContent: content.popularHotels.length + content.popularAttractions.length,
      totalUsers: users.newUsers + users.returningUsers,
      activeUsers: overview.activeUsers,
      uptime: Math.round(performance.avgSessionDuration / 60),
    },
    content: {
      trends: trends.bookings,
      byType: content.popularHotels.map((h) => ({ name: h.name, value: h.bookings })),
    },
    users: {
      trends: trends.revenue,
      byRole: [
        { name: 'Novos', value: users.newUsers },
        { name: 'Retorno', value: users.returningUsers },
      ],
    },
    performance: {
      apiCalls: overview.totalBookings,
      responseTime: Math.round(performance.pageLoadTime),
      errorRate: performance.bounceRate / 100,
    },
  };

  const health = {
    healthScore: Math.max(0, 100 - Math.round(performance.bounceRate)),
    status: performance.bounceRate < 50 ? ('healthy' as const) : ('degraded' as const),
    message: error ?? 'Sistema operacional',
    uptime: `${Math.round(performance.avgSessionDuration)}s`,
  };

  const loadFullReport = async () => {
    const generated = await generateReport({ period: 'month', metrics: ['overview', 'trends'] });
    setReport(generated);
    return generated;
  };

  return {
    // Estados
    overview,
    trends,
    content,
    users,
    performance,
    data,
    health,
    report,
    loading,
    error,

    // Funções
    refreshData,
    generateReport,
    exportData,
    getFilteredData,
    getDerivedMetrics,
    loadFullReport,
  };
}
