import type { AppProps } from 'next/app';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AuthProvider } from '../src/context/AuthContext';
import { QueryProvider } from '../src/lib/query-client';
import { InstrutorHelpWidget } from '../components/agentes/InstrutorHelpWidget';
import AppSidebar from '../components/AppSidebar';
import '../styles/globals.css';

const CRM_PARTNER_ROUTES = ['/overview', '/rentals', '/deals', '/leads', '/contacts'] as const;

function shouldHideSidebar(pathname: string): boolean {
  if (pathname === '/login' || pathname === '/register') return true;
  // Host chrome uses AnfitriaoHostNav — avoid double shell.
  if (pathname === '/anfitriao' || pathname.startsWith('/anfitriao/')) return true;
  // CRM parceiro (shell Lintel) — sem sidebar global RSV.
  if (CRM_PARTNER_ROUTES.includes(pathname as (typeof CRM_PARTNER_ROUTES)[number])) return true;
  return false;
}

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const pathname = router.pathname || '';
  const hideSidebar = shouldHideSidebar(pathname);
  const hideHelpWidget = hideSidebar;

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleSidebarStateChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        collapsed?: boolean;
        open?: boolean;
        mobile?: boolean;
      };
      if (detail.collapsed !== undefined) setSidebarCollapsed(detail.collapsed);
      if (detail.open !== undefined) setSidebarOpen(detail.open);
      if (detail.mobile !== undefined) setIsMobile(detail.mobile);
    };

    window.addEventListener('sidebarStateChange', handleSidebarStateChange);
    return () => window.removeEventListener('sidebarStateChange', handleSidebarStateChange);
  }, []);

  const getMainContentMargin = () => {
    if (hideSidebar) return 'ml-0';
    if (isMobile) return 'ml-0';
    if (!sidebarOpen) return 'ml-0';
    if (sidebarCollapsed) return 'ml-16';
    return 'ml-64 md:ml-72';
  };

  return (
    <QueryProvider>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          {!hideSidebar && <AppSidebar />}
          <main
            className={`min-h-screen transition-all duration-300 ease-in-out ${getMainContentMargin()}`}
          >
            <Component {...pageProps} />
          </main>
          {!hideHelpWidget ? <InstrutorHelpWidget /> : null}
        </div>
      </AuthProvider>
    </QueryProvider>
  );
}