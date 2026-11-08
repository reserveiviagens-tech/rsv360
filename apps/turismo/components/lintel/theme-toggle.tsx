'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

export type ThemeToggleProps = {
  /** Sincroniza layout legado que usa `isDarkMode` no dashboard. */
  onResolvedThemeChange?: (isDark: boolean) => void;
};

export function ThemeToggle({ onResolvedThemeChange }: ThemeToggleProps = {}) {
  const [theme, setTheme] = useState<Theme>('system');
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) {
      setTheme(stored);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleChange);
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === 'system' ? systemTheme === 'dark' : theme === 'dark';
    root.classList.toggle('dark', isDark);
    localStorage.setItem('theme', theme);
    onResolvedThemeChange?.(isDark);
  }, [theme, systemTheme, onResolvedThemeChange]);

  const toggleTheme = () => {
    setTheme((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'system';
      return 'light';
    });
  };

  if (!mounted) return null;

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all hover:scale-110 active:scale-95"
      aria-label={`Alternar tema: atual ${theme}`}
      title="Alternar tema"
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 text-slate-600" />
      ) : theme === 'dark' ? (
        <Sun className="w-5 h-5 text-slate-600" />
      ) : (
        <Monitor className="w-5 h-5 text-slate-600" />
      )}
      <span className="sr-only">
        {theme === 'light' ? 'Modo escuro' : theme === 'dark' ? 'Modo sistema' : 'Modo claro'}
      </span>
    </button>
  );
}

export default ThemeToggle;
