'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X, ArrowRight, Building, Home, Users, MessageCircle } from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'page' | 'property' | 'contact';
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  page?: string;
}

const SEARCH_RESULTS: SearchResult[] = [
  { id: 'overview', type: 'page', title: 'Overview', subtitle: 'Página inicial', icon: <Building className="w-4 h-4" />, page: '/overview' },
  { id: 'rentals', type: 'page', title: 'Locações', subtitle: 'Gestão de locações', icon: <Home className="w-4 h-4" />, page: '/rentals' },
  { id: 'sales', type: 'page', title: 'Vendas', subtitle: 'Portfólio de vendas', icon: <Home className="w-4 h-4" />, page: '/sales' },
  { id: 'deals', type: 'page', title: 'Negócios', subtitle: 'Pipeline de negócios', icon: <Building className="w-4 h-4" />, page: '/deals' },
  { id: 'leads', type: 'page', title: 'Leads', subtitle: 'Caixa de leads', icon: <MessageCircle className="w-4 h-4" />, page: '/leads' },
  { id: 'contacts', type: 'page', title: 'Contatos', subtitle: 'Diretório de contatos', icon: <Users className="w-4 h-4" />, page: '/contacts' },
];

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredResults = query
    ? SEARCH_RESULTS.filter(r =>
        r.title.toLowerCase().includes(query.toLowerCase()) ||
        r.subtitle.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, filteredResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      const result = filteredResults[highlightedIndex];
      if (result) {
        window.location.href = result.page || `/${result.type}s`;
        setOpen(false);
      }
    }
  }, [highlightedIndex, filteredResults]);

  useEffect(() => {
    if (open && filteredResults.length > 0) {
      setHighlightedIndex(0);
    }
  }, [filteredResults, open]);

  return (
    <div className="relative">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
        style={{ pointerEvents: 'none' }}
      />
      <Input
        ref={inputRef}
        placeholder="Buscar..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        onClick={() => setOpen(true)}
        className={`pl-10 ${open ? 'border-blue-400 dark:border-blue-500' : 'border-slate-200 dark:border-slate-600'}`}
      />
      {query && (
        <button
          onClick={() => {
            setQuery('');
            setOpen(false);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <X className="w-3 h-3 text-slate-400" />
        </button>
      )}
      {open && query && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#121722] border border-slate-200 dark:border-slate-600 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-5">
          <div className="py-2">
            {filteredResults.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-500">Nenhum resultado</div>
            ) : (
              filteredResults.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => {
                    window.location.href = result.page || `/${result.type}s`;
                    setOpen(false);
                    setQuery('');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all ${
                    index === highlightedIndex
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    {result.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {result.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {result.subtitle}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

