// Serviço de API centralizado para Onion RSV 360
// Conecta com todos os microsserviços do backend
// FASE 0 — refresh alinhado a POST /api/v1/auth/refresh (cookie-first).

import {
  AUTH_REFRESH_PATH,
  buildAuthRefreshBody,
  buildAuthRefreshFetchInit,
  isNonEmptyRefreshToken,
  notifySessionExpired,
} from '../lib/auth-refresh-request';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

function clearLocalAuthTokens(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('refreshToken');
}

function logAuthRefreshFailure(kind: 'http' | 'network', detail?: string): void {
  // Structured log — never include token/PII values.
  console.error(
    JSON.stringify({
      event: 'auth_refresh_failed',
      kind,
      path: AUTH_REFRESH_PATH,
      detail: detail || undefined,
    }),
  );
}

// Configuração base do cliente fetch
const createApiClient = (baseURL: string) => {
  return {
    async request<T>(
      endpoint: string,
      options: RequestInit = {}
    ): Promise<T> {
      const url = `${baseURL}${endpoint}`;
      const token = localStorage.getItem('access_token');
      
      const config: RequestInit = {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...(options.headers as Record<string, string> | undefined),
        },
        credentials: options.credentials ?? 'include',
      };

      try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
          if (response.status === 401) {
            // Cookie-first refresh; legacy LS string only when present and non-empty.
            const legacyRefresh = localStorage.getItem('refresh_token');
            try {
              const refreshResponse = await fetch(
                `${API_BASE_URL}${AUTH_REFRESH_PATH}`,
                buildAuthRefreshFetchInit(legacyRefresh),
              );

              if (refreshResponse.ok) {
                const payload = await refreshResponse.json();
                const access_token =
                  payload?.access_token ||
                  payload?.data?.access_token ||
                  null;
                if (typeof access_token === 'string' && access_token.length > 0) {
                  localStorage.setItem('access_token', access_token);
                  // Refresh lives in HttpOnly cookie; do not persist rotated refresh in LS.
                  localStorage.removeItem('refresh_token');
                  localStorage.removeItem('refreshToken');

                  config.headers = {
                    ...config.headers,
                    Authorization: `Bearer ${access_token}`,
                  };
                  const retryResponse = await fetch(url, config);
                  if (!retryResponse.ok) {
                    throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
                  }
                  return await retryResponse.json();
                }
              }

              logAuthRefreshFailure('http', `status=${refreshResponse.status}`);
              clearLocalAuthTokens();
              notifySessionExpired();
              throw new Error('Sessão expirada. Faça login novamente.');
            } catch (refreshError) {
              if (
                refreshError instanceof Error &&
                refreshError.message === 'Sessão expirada. Faça login novamente.'
              ) {
                throw refreshError;
              }
              logAuthRefreshFailure(
                'network',
                refreshError instanceof Error ? refreshError.name : 'unknown',
              );
              clearLocalAuthTokens();
              notifySessionExpired();
              throw new Error(
                'Não foi possível renovar a sessão. Verifique sua conexão e faça login novamente.',
              );
            }
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('API Error:', error);
        throw error;
      }
    },

    get<T>(endpoint: string): Promise<T> {
      return this.request<T>(endpoint, { method: 'GET' });
    },

    post<T>(endpoint: string, data?: unknown): Promise<T> {
      return this.request<T>(endpoint, {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      });
    },

    put<T>(endpoint: string, data?: unknown): Promise<T> {
      return this.request<T>(endpoint, {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      });
    },

    delete<T>(endpoint: string): Promise<T> {
      return this.request<T>(endpoint, { method: 'DELETE' });
    },

    patch<T>(endpoint: string, data?: unknown): Promise<T> {
      return this.request<T>(endpoint, {
        method: 'PATCH',
        body: data ? JSON.stringify(data) : undefined,
      });
    },
  };
};

// Clientes para cada microsserviço
export const coreApi = createApiClient(`${API_BASE_URL}`);
export const travelApi = createApiClient(`${API_BASE_URL.replace('5000', '5001')}`);
export const attractionsApi = createApiClient(`${API_BASE_URL.replace('5000', '5002')}`);
export const parksApi = createApiClient(`${API_BASE_URL.replace('5000', '5003')}`);
export const ticketsApi = createApiClient(`${API_BASE_URL.replace('5000', '5004')}`);
export const loyaltyApi = createApiClient(`${API_BASE_URL.replace('5000', '5005')}`);
export const rewardsApi = createApiClient(`${API_BASE_URL.replace('5000', '5006')}`);
export const couponsApi = createApiClient(`${API_BASE_URL.replace('5000', '5007')}`);
export const giftcardsApi = createApiClient(`${API_BASE_URL.replace('5000', '5008')}`);
export const financeApi = createApiClient(`${API_BASE_URL.replace('5000', '5009')}`);
export const salesApi = createApiClient(`${API_BASE_URL.replace('5000', '5010')}`);
export const ecommerceApi = createApiClient(`${API_BASE_URL.replace('5000', '5011')}`);
export const marketingApi = createApiClient(`${API_BASE_URL.replace('5000', '5012')}`);
export const analyticsApi = createApiClient(`${API_BASE_URL.replace('5000', '5013')}`);
export const seoApi = createApiClient(`${API_BASE_URL.replace('5000', '5014')}`);
export const multilingualApi = createApiClient(`${API_BASE_URL.replace('5000', '5015')}`);
export const subscriptionsApi = createApiClient(`${API_BASE_URL.replace('5000', '5016')}`);
export const inventoryApi = createApiClient(`${API_BASE_URL.replace('5000', '5017')}`);
export const documentsApi = createApiClient(`${API_BASE_URL.replace('5000', '5018')}`);
export const visaApi = createApiClient(`${API_BASE_URL.replace('5000', '5019')}`);
export const insuranceApi = createApiClient(`${API_BASE_URL.replace('5000', '5020')}`);
export const photosApi = createApiClient(`${API_BASE_URL.replace('5000', '5021')}`);
export const videosApi = createApiClient(`${API_BASE_URL.replace('5000', '5022')}`);
export const reviewsApi = createApiClient(`${API_BASE_URL.replace('5000', '5023')}`);
export const chatbotsApi = createApiClient(`${API_BASE_URL.replace('5000', '5024')}`);
export const notificationsApi = createApiClient(`${API_BASE_URL.replace('5000', '5025')}`);

// Serviços específicos por domínio
export const authService = {
  login: (email: string, password: string) =>
    coreApi.post('/api/core/token', { email, password }),

  /** FASE 0 — POST /api/v1/auth/refresh; body only when legacy string present. */
  refresh: (refreshToken?: unknown) =>
    coreApi.post(
      AUTH_REFRESH_PATH,
      buildAuthRefreshBody(
        isNonEmptyRefreshToken(refreshToken) ? refreshToken : undefined,
      ),
    ),
  
  verify: () => coreApi.post('/api/core/verify'),
  
  register: (userData: unknown) =>
    coreApi.post('/api/users/', userData),
  
  getCurrentUser: () => coreApi.get('/api/users/me'),
  
  updateUser: (userData: unknown) =>
    coreApi.put('/api/users/me', userData),
  
  changePassword: (currentPassword: string, newPassword: string) =>
    coreApi.post('/api/users/me/change-password', { current_password: currentPassword, new_password: newPassword }),
};

export const loyaltyService = {
  getTiers: () => loyaltyApi.get('/loyalty/tiers/'),
  getUserLoyalty: (userId: number) => loyaltyApi.get(`/loyalty/users/${userId}/`),
  getCampaigns: () => loyaltyApi.get('/loyalty/campaigns/'),
  getStats: () => loyaltyApi.get('/loyalty/stats/'),
  createCampaign: (campaignData: unknown) => loyaltyApi.post('/loyalty/campaigns/', campaignData),
  updateTier: (tierId: number, tierData: unknown) => loyaltyApi.put(`/loyalty/tiers/${tierId}`, tierData),
};

export const groupsService = {
  getGroups: () => coreApi.get('/groups/'),
  getGroup: (groupId: number) => coreApi.get(`/groups/${groupId}/`),
  createGroup: (groupData: unknown) => coreApi.post('/groups/', groupData),
  updateGroup: (groupId: number, groupData: unknown) => coreApi.put(`/groups/${groupId}`, groupData),
  deleteGroup: (groupId: number) => coreApi.delete(`/groups/${groupId}`),
  getGroupMembers: (groupId: number) => coreApi.get(`/groups/${groupId}/members/`),
  addMember: (groupId: number, memberData: unknown) => coreApi.post(`/groups/${groupId}/members/`, memberData),
  getGroupActivities: (groupId: number) => coreApi.get(`/groups/${groupId}/activities/`),
};

export const documentsService = {
  getDocuments: (params?: Record<string, string>) => documentsApi.get(`/documents/?${new URLSearchParams(params).toString()}`),
  getDocument: (docId: number) => documentsApi.get(`/documents/${docId}/`),
  uploadDocument: (file: File, metadata: Record<string, string>) => {
    const formData = new FormData();
    formData.append('file', file);
    Object.keys(metadata).forEach(key => {
      formData.append(key, metadata[key]);
    });
    return documentsApi.post('/documents/upload/', formData);
  },
  updateDocument: (docId: number, docData: unknown) => documentsApi.put(`/documents/${docId}`, docData),
  deleteDocument: (docId: number) => documentsApi.delete(`/documents/${docId}`),
  getCategories: () => documentsApi.get('/documents/categories/'),
  searchDocuments: (query: string) => documentsApi.get(`/documents/search/?q=${query}`),
};

export const visaService = {
  getApplications: (params?: Record<string, string>) => visaApi.get(`/visa/applications/?${new URLSearchParams(params).toString()}`),
  getApplication: (appId: number) => visaApi.get(`/visa/applications/${appId}/`),
  createApplication: (appData: unknown) => visaApi.post('/visa/applications/', appData),
  updateApplication: (appId: number, appData: unknown) => visaApi.put(`/visa/applications/${appId}`, appData),
  getVisaTypes: () => visaApi.get('/visa/types/'),
  getStats: () => visaApi.get('/visa/stats/'),
  uploadDocument: (appId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return visaApi.post(`/visa/applications/${appId}/documents/`, formData);
  },
};

export const insuranceService = {
  getPolicies: (params?: Record<string, string>) => insuranceApi.get(`/insurance/policies/?${new URLSearchParams(params).toString()}`),
  getPolicy: (policyId: number) => insuranceApi.get(`/insurance/policies/${policyId}/`),
  createPolicy: (policyData: unknown) => insuranceApi.post('/insurance/policies/', policyData),
  updatePolicy: (policyId: number, policyData: unknown) => insuranceApi.put(`/insurance/policies/${policyId}`, policyData),
  getClaims: (params?: Record<string, string>) => insuranceApi.get(`/insurance/claims/?${new URLSearchParams(params).toString()}`),
  getClaim: (claimId: number) => insuranceApi.get(`/insurance/claims/${claimId}/`),
  createClaim: (claimData: unknown) => insuranceApi.post('/insurance/claims/', claimData),
  updateClaim: (claimId: number, claimData: unknown) => insuranceApi.put(`/insurance/claims/${claimId}`, claimData),
  getInsuranceTypes: () => insuranceApi.get('/insurance/types/'),
  getStats: () => insuranceApi.get('/insurance/stats/'),
};

export const travelService = {
  getBookings: (params?: Record<string, string>) => travelApi.get(`/travel/bookings/?${new URLSearchParams(params).toString()}`),
  getBooking: (bookingId: number) => travelApi.get(`/travel/bookings/${bookingId}/`),
  createBooking: (bookingData: unknown) => travelApi.post('/travel/bookings/', bookingData),
  updateBooking: (bookingId: number, bookingData: unknown) => travelApi.put(`/travel/bookings/${bookingId}`, bookingData),
  cancelBooking: (bookingId: number) => travelApi.delete(`/travel/bookings/${bookingId}`),
  getDestinations: () => travelApi.get('/travel/destinations/'),
  getHotels: (params?: Record<string, string>) => travelApi.get(`/travel/hotels/?${new URLSearchParams(params).toString()}`),
  getFlights: (params?: Record<string, string>) => travelApi.get(`/travel/flights/?${new URLSearchParams(params).toString()}`),
};

export const attractionsService = {
  getAttractions: (params?: Record<string, string>) => attractionsApi.get(`/attractions/?${new URLSearchParams(params).toString()}`),
  getAttraction: (attractionId: number) => attractionsApi.get(`/attractions/${attractionId}/`),
  createAttraction: (attractionData: unknown) => attractionsApi.post('/attractions/', attractionData),
  updateAttraction: (attractionId: number, attractionData: unknown) => attractionsApi.put(`/attractions/${attractionId}`, attractionData),
  deleteAttraction: (attractionId: number) => attractionsApi.delete(`/attractions/${attractionId}`),
  getCategories: () => attractionsApi.get('/attractions/categories/'),
  searchAttractions: (query: string) => attractionsApi.get(`/attractions/search/?q=${query}`),
};

export const ticketsService = {
  getTickets: (params?: Record<string, string>) => ticketsApi.get(`/tickets/?${new URLSearchParams(params).toString()}`),
  getTicket: (ticketId: number) => ticketsApi.get(`/tickets/${ticketId}/`),
  createTicket: (ticketData: unknown) => ticketsApi.post('/tickets/', ticketData),
  updateTicket: (ticketId: number, ticketData: unknown) => ticketsApi.put(`/tickets/${ticketId}`, ticketData),
  deleteTicket: (ticketId: number) => ticketsApi.delete(`/tickets/${ticketId}`),
  getTicketTypes: () => ticketsApi.get('/tickets/types/'),
  validateTicket: (ticketCode: string) => ticketsApi.post('/tickets/validate/', { code: ticketCode }),
};

export const financeService = {
  getTransactions: (params?: Record<string, string>) => financeApi.get(`/finance/transactions/?${new URLSearchParams(params).toString()}`),
  getTransaction: (transactionId: number) => financeApi.get(`/finance/transactions/${transactionId}/`),
  createTransaction: (transactionData: unknown) => financeApi.post('/finance/transactions/', transactionData),
  getReports: (params?: Record<string, string>) => financeApi.get(`/finance/reports/?${new URLSearchParams(params).toString()}`),
  getStats: () => financeApi.get('/finance/stats/'),
  exportData: (format: string, params?: Record<string, string>) => financeApi.get(`/finance/export/${format}/?${new URLSearchParams(params).toString()}`),
};

export const marketingService = {
  getCampaigns: (params?: Record<string, string>) => marketingApi.get(`/marketing/campaigns/?${new URLSearchParams(params).toString()}`),
  getCampaign: (campaignId: number) => marketingApi.get(`/marketing/campaigns/${campaignId}/`),
  createCampaign: (campaignData: unknown) => marketingApi.post('/marketing/campaigns/', campaignData),
  updateCampaign: (campaignId: number, campaignData: unknown) => marketingApi.put(`/marketing/campaigns/${campaignId}`, campaignData),
  deleteCampaign: (campaignId: number) => marketingApi.delete(`/marketing/campaigns/${campaignId}`),
  getStats: () => marketingApi.get('/marketing/stats/'),
  sendEmail: (emailData: unknown) => marketingApi.post('/marketing/email/', emailData),
};

export const analyticsService = {
  getDashboardData: () => analyticsApi.get('/analytics/dashboard/'),
  getReports: (params?: Record<string, string>) => analyticsApi.get(`/analytics/reports/?${new URLSearchParams(params).toString()}`),
  getMetrics: (metricType: string, params?: Record<string, string>) => analyticsApi.get(`/analytics/metrics/${metricType}/?${new URLSearchParams(params).toString()}`),
  exportReport: (reportId: number, format: string) => analyticsApi.get(`/analytics/reports/${reportId}/export/${format}/`),
  createCustomReport: (reportData: unknown) => analyticsApi.post('/analytics/reports/custom/', reportData),
};

// Hook personalizado para usar os serviços
export const useApiService = () => {
  return {
    auth: authService,
    loyalty: loyaltyService,
    groups: groupsService,
    documents: documentsService,
    visa: visaService,
    insurance: insuranceService,
    travel: travelService,
    attractions: attractionsService,
    tickets: ticketsService,
    finance: financeService,
    marketing: marketingService,
    analytics: analyticsService,
  };
};

// Utilitários para tratamento de erros
export const handleApiError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('401')) {
    notifySessionExpired();
  } else if (message.includes('403')) {
    console.error('Acesso negado:', error);
  } else if (message.includes('500')) {
    console.error('Erro interno do servidor:', error);
  } else {
    console.error('Erro da API:', error);
  }

  return {
    success: false,
    error: message,
  };
};

// Interceptor global para tratamento de erros
export const setupApiInterceptors = () => {
  // Interceptar erros de rede
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message) {
      handleApiError(event.reason);
    }
  });
};

// Inicializar interceptors
if (typeof window !== 'undefined') {
  setupApiInterceptors();
} 