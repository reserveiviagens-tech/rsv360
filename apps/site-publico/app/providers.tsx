'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastWrapper } from '@/components/providers/toast-wrapper';
import { AuthProvider } from '@/components/auth-provider';
import { Toaster } from '@/components/ui/sonner';
import { PwaRegister } from '@/components/pwa-register';
import { WebVitalsReporter } from '@/components/performance/WebVitalsReporter';
import { ScrollToTop } from '@/components/scroll-to-top';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 3,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastWrapper>
        <AuthProvider>
          <ThemeProvider>
            <ScrollToTop />
            {children}
            <WebVitalsReporter />
            <PwaRegister />
            <Toaster richColors closeButton position="top-center" />
          </ThemeProvider>
        </AuthProvider>
      </ToastWrapper>
    </QueryClientProvider>
  );
}
