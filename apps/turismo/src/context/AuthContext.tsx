'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { tryCreateDpopProof } from '@rsv360/shared';
import {
  AUTH_V1,
  DEFAULT_API_URL,
  AuthV1SessionResponse,
  mapAuthV1User,
  parseAuthV1LoginResponse,
  parseAuthV1RefreshResponse,
} from '../lib/auth-v1';

async function dpopHeaders(
  base: HeadersInit,
  method: string,
  url: string,
  accessToken?: string | null,
): Promise<Headers> {
  const headers = new Headers(base);
  const proof = await tryCreateDpopProof({
    method,
    url,
    accessToken: accessToken || undefined,
  });
  if (proof) headers.set('DPoP', proof);
  return headers;
}

interface User {
  id: number;
  email: string;
  full_name: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  role?: string;
  is_active: boolean;
  permissions: string[];
  token?: string;
  created_at: string;
  last_login?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (email: string, full_name: string, password: string) => Promise<boolean>;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshToken: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/** Pre-T1 fabricated session tokens — clear on sight; never mint new ones. */
function isLegacyFabricatedToken(token: string | null | undefined): boolean {
  if (!token) return false;
  return /^(demo|admin)-(token|refresh)(-\d+)?$/.test(token);
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  // Start loading until client initAuth resolves (avoids SSR redirect races)
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  const API_BASE_URL = DEFAULT_API_URL;

  console.log('[AuthContext] AuthProvider renderizado, isLoading:', isLoading);

  const clearAuth = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('refreshToken');
    }
    setIsLoading(false);
  }, []);

  const verifyToken = useCallback(async (token: string): Promise<boolean> => {
    try {
      const url = `${API_BASE_URL}${AUTH_V1.SESSION}`;
      const headers = await dpopHeaders(
        {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        'GET',
        url,
        token,
      );
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        return false;
      }

      const data = (await response.json()) as AuthV1SessionResponse;
      return data.authenticated === true;
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      return false;
    }
  }, [API_BASE_URL]);

  const fetchUserData = useCallback(async (token: string) => {
    try {
      const timeoutPromise = new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout ao buscar dados do usuário')), 5000)
      );

      const url = `${API_BASE_URL}${AUTH_V1.SESSION}`;
      const headers = await dpopHeaders(
        {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        'GET',
        url,
        token,
      );
      const fetchPromise = fetch(url, { headers });

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (response.ok) {
        const data = (await response.json()) as AuthV1SessionResponse;
        if (data.authenticated && data.user) {
          const mapped = mapAuthV1User(data.user, token);
          setUser({
            ...mapped,
            id: typeof mapped.id === 'number' ? mapped.id : parseInt(String(mapped.id), 10) || 0,
          } as User);
          setIsLoading(false);
          console.log('[AuthContext] Dados do usuário carregados com sucesso');
          return;
        }
      }

      throw new Error('Falha ao buscar dados do usuário');
    } catch (error) {
      console.error('[AuthContext] Erro ao buscar dados do usuário:', error);
      setIsLoading(false);
      throw error;
    }
  }, [API_BASE_URL]);

  const refreshAccessToken = useCallback(async (refreshTokenValue?: string | null): Promise<void> => {
    try {
      const legacy =
        refreshTokenValue ||
        (typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null);

      const url = `${API_BASE_URL}${AUTH_V1.REFRESH}`;
      const headers = await dpopHeaders(
        { 'Content-Type': 'application/json' },
        'POST',
        url,
      );
      const response = await fetch(url, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: legacy
          ? JSON.stringify({ refresh_token: legacy })
          : JSON.stringify({}),
      });

      if (response.ok) {
        const data = parseAuthV1RefreshResponse(await response.json());
        if (!data) {
          throw new Error('Resposta de refresh inválida');
        }
        if (!data.access_token) {
          throw new Error('Resposta de refresh sem access_token');
        }
        setAccessToken(data.access_token);
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('authToken', data.access_token);
        // PR-10c-pré-b / turismo-ls-prep — refresh lives in HttpOnly cookie; clear LS legacy.
        setRefreshToken(null);
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('refreshToken');
      } else {
        throw new Error('Falha ao renovar token');
      }
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      throw error;
    }
  }, [API_BASE_URL]);

  const logout = useCallback(() => {
    const token =
      accessToken ||
      (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null);
    const storedRefresh =
      refreshToken ||
      (typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null);

    if (token && !isLegacyFabricatedToken(token)) {
      const url = `${API_BASE_URL}${AUTH_V1.LOGOUT}`;
      void dpopHeaders(
        {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        'POST',
        url,
        token,
      ).then((headers) =>
        fetch(url, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: storedRefresh
            ? JSON.stringify({ refresh_token: storedRefresh })
            : JSON.stringify({}),
        }),
      ).catch((error) => {
        console.error('[AuthContext] Erro ao revogar sessão no servidor:', error);
      });
    }

    clearAuth();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, [API_BASE_URL, accessToken, refreshToken, clearAuth]);

  // Verificar token armazenado ao inicializar
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    
    console.log('[AuthContext] useEffect executado - iniciando initAuth');
    
    // Definir isLoading como true apenas durante a verificação
    // eslint-disable-next-line react-hooks/set-state-in-effect -- bootstrap auth from localStorage on mount
    setIsLoading(true);
    
    const initAuth = async () => {
      console.log('[AuthContext] initAuth chamado');
      
      // Timeout de segurança: sempre definir isLoading como false após 2 segundos
      timeoutId = setTimeout(() => {
        if (isMounted) {
          console.log('[AuthContext] ⚠️ Timeout de segurança - definindo isLoading como false');
          setIsLoading(false);
        }
      }, 2000);
      
      try {
        // Verificar se estamos no cliente (localStorage só existe no browser)
        if (typeof window === 'undefined') {
          console.log('[AuthContext] SSR - definindo isLoading como false');
          if (isMounted) setIsLoading(false);
          return;
        }

        console.log('[AuthContext] Iniciando verificação de autenticação...');
        const storedAccessToken = localStorage.getItem('access_token');
        const storedRefreshToken = localStorage.getItem('refresh_token');
        
        console.log('[AuthContext] Tokens encontrados:', {
          hasAccessToken: !!storedAccessToken,
          hasRefreshToken: !!storedRefreshToken,
          accessToken: storedAccessToken?.substring(0, 10) + '...'
        });
        
        if (storedAccessToken) {
          if (isMounted) {
            setAccessToken(storedAccessToken);
            if (storedRefreshToken) setRefreshToken(storedRefreshToken);
          }
          
          // Reject known legacy fabricated tokens (pre-T1 bypass)
          if (
            isLegacyFabricatedToken(storedAccessToken) ||
            isLegacyFabricatedToken(storedRefreshToken)
          ) {
            console.log('[AuthContext] Legacy fabricated token detected — clearing auth');
            if (isMounted) clearAuth();
            if (timeoutId) clearTimeout(timeoutId);
            return;
          }

          // Verificar token real com timeout
          try {
            console.log('[AuthContext] Verificando token real...');
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 3000)
            );

            let tokenToUse = storedAccessToken;
            let isValid = (await Promise.race([
              verifyToken(storedAccessToken),
              timeoutPromise,
            ])) as boolean;

            if (!isValid) {
              try {
                await refreshAccessToken(storedRefreshToken);
                tokenToUse =
                  (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null) ||
                  storedAccessToken;
                isValid = true;
              } catch {
                isValid = false;
              }
            }

            console.log('[AuthContext] Token válido:', isValid);
            if (isValid && isMounted) {
              await fetchUserData(tokenToUse);
            } else if (isMounted) {
              console.log('[AuthContext] Token inválido - limpando autenticação');
              clearAuth();
            }
          } catch (error) {
            console.error('[AuthContext] Erro ao verificar token:', error);
            if (isMounted) clearAuth();
          }
        } else {
          // Não há token armazenado, apenas definir loading como false IMEDIATAMENTE
          console.log('[AuthContext] Nenhum token encontrado - definindo isLoading como false');
          if (isMounted) setIsLoading(false);
          if (timeoutId) clearTimeout(timeoutId);
          return; // Sair imediatamente
        }
      } catch (error) {
        console.error('[AuthContext] Erro ao inicializar autenticação:', error);
        if (isMounted) clearAuth();
      } finally {
        // Garantir que sempre definimos loading como false
        if (timeoutId) clearTimeout(timeoutId);
        console.log('[AuthContext] Finalizando inicialização - isLoading = false');
        if (isMounted) setIsLoading(false);
      }
    };

    // Executar imediatamente
    console.log('[AuthContext] Chamando initAuth()...');
    initAuth().catch(error => {
      console.error('[AuthContext] Erro não capturado em initAuth:', error);
      if (isMounted) setIsLoading(false);
      if (timeoutId) clearTimeout(timeoutId);
    });
    
    // Cleanup
    return () => {
      console.log('[AuthContext] Cleanup do useEffect');
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [clearAuth, fetchUserData, verifyToken, refreshAccessToken]);
  
  // FALLBACK: Garantir que isLoading seja false após 5 segundos, independente de tudo
  useEffect(() => {
    const fallbackTimeout = setTimeout(() => {
      console.log('[AuthContext] ⚠️ FALLBACK: Forçando isLoading = false após 5 segundos');
      setIsLoading(false);
    }, 5000);
    
    return () => {
      clearTimeout(fallbackTimeout);
    };
  }, []);

  // Renovação automática de token (cookie HttpOnly; legado LS só na migração)
  useEffect(() => {
    if (!accessToken) return;

    const tokenRefreshInterval = setInterval(async () => {
      try {
        await refreshAccessToken(
          typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null,
        );
      } catch (error) {
        console.error('Erro ao renovar token:', error);
        logout();
      }
    }, 25 * 60 * 1000); // Renovar 5 minutos antes da expiração (30 min - 5 min)

    return () => clearInterval(tokenRefreshInterval);
  }, [accessToken, logout, refreshAccessToken]);

  const persistPostLoginRole = (role?: string) => {
    if (typeof window !== 'undefined' && role) {
      localStorage.setItem('post_login_role', role);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    // Fail-closed: only canonical backend auth — no client-side demo/admin bypass
    const url = `${API_BASE_URL}${AUTH_V1.LOGIN}`;
    const headers = await dpopHeaders(
      { 'Content-Type': 'application/json' },
      'POST',
      url,
    );
    const response = await fetch(url, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error || err?.message || 'Credenciais inválidas');
    }

    const raw = (await response.json()) as Record<string, unknown>;
    let loginPayload = parseAuthV1LoginResponse(raw);
    // Browser Origin → backend strips refresh from JSON (cookie Set-Cookie only).
    if (!loginPayload) {
      const payload = (raw.data ?? raw) as Record<string, unknown>;
      if (payload.requires_2fa === true) {
        throw new Error('Autenticação em dois fatores necessária');
      }
      const access = payload.access_token ?? raw.access_token;
      if (access) {
        loginPayload = {
          access_token: String(access),
          refresh_token: '',
          user: payload.user as Parameters<typeof mapAuthV1User>[0] | undefined,
        };
      }
    }

    if (!loginPayload?.access_token) {
      throw new Error('Resposta de login inválida');
    }

    setAccessToken(loginPayload.access_token);
    setRefreshToken(null);
    localStorage.setItem('access_token', loginPayload.access_token);
    localStorage.setItem('authToken', loginPayload.access_token);
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('refreshToken');

    if (loginPayload.user) {
      const mapped = mapAuthV1User(loginPayload.user, loginPayload.access_token);
      setUser({
        ...mapped,
        id: typeof mapped.id === 'number' ? mapped.id : parseInt(String(mapped.id), 10) || 0,
      } as User);
      persistPostLoginRole(mapped.role);
    } else {
      await fetchUserData(loginPayload.access_token);
    }
    return true;
  };

  const register = async (email: string, full_name: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}${AUTH_V1.REGISTER}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: full_name,
          email,
          password,
          password_confirmation: password,
        }),
      });

      if (response.ok) {
        return true;
      } else {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || err?.message || 'Falha no registro');
      }
    } catch (error) {
      console.error('Erro no registro:', error);
      throw error;
    }
  };

  const updateUser = async (userData: Partial<User>): Promise<boolean> => {
    try {
      if (!accessToken) {
        throw new Error('Sessão inválida');
      }

      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        return true;
      } else {
        throw new Error('Falha ao atualizar usuário');
      }
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      throw error;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      if (!accessToken) {
        throw new Error('Sessão inválida');
      }

      const response = await fetch(`${API_BASE_URL}/api/users/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });

      if (response.ok) {
        return true;
      } else {
        throw new Error('Falha ao alterar senha');
      }
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      throw error;
    }
  };

  const hasPermission = (permission: string): boolean => {
    return user?.permissions?.includes(permission) ?? false;
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    register,
    isLoading,
    isAuthenticated: !!user,
    refreshToken: () =>
      refreshAccessToken(
        typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null,
      ),
    updateUser,
    changePassword,
    hasPermission,
  };

  console.log('[AuthContext] Renderizando Provider com value:', {
    hasUser: !!user,
    isLoading,
    isAuthenticated: !!user
  });
  
  console.log('[AuthContext] Provider sendo criado, value:', value);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  console.log('[AuthContext] useAuth chamado, context:', context === undefined ? 'undefined' : 'definido');
  
  // Durante SSR ou se não estiver no AuthProvider, retornar valores padrão
  if (context === undefined) {
    console.warn('[AuthContext] ⚠️ Contexto undefined - retornando valores padrão (isLoading: true)');
    // Retornar valores padrão em vez de lançar erro
    // Isso permite que o componente seja renderizado durante SSR
    return {
      user: null,
      login: async () => false,
      logout: () => {},
      register: async () => false,
      isLoading: true,
      isAuthenticated: false,
      refreshToken: async () => {},
      updateUser: async () => false,
      changePassword: async () => false,
      hasPermission: () => false,
    };
  }
  
  console.log('[AuthContext] useAuth retornando context com isLoading:', context.isLoading);
  return context;
} 