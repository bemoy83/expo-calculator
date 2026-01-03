'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import { exportAllData, downloadDataAsJSON } from '@/lib/utils/data-export';
import { DataImporter } from '@/components/DataImporter';
import { useThemeImporter } from '@/hooks/use-theme-importer';
import { CheckCircle2, Palette, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { ThemeImporter } from '@/components/ThemeImporter';
import { 
  LayoutDashboard, 
  Package, 
  Calculator, 
  FileText,
  Home,
  Menu,
  X,
  Download,
  Upload,
  FunctionSquare
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Materials', href: '/materials', icon: Package },
  { name: 'Functions', href: '/functions', icon: FunctionSquare },
  { name: 'Modules', href: '/modules', icon: LayoutDashboard },
  { name: 'Templates', href: '/templates', icon: FileText },
  { name: 'Quote Builder', href: '/quotes', icon: Calculator },
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showThemeImporter, setShowThemeImporter] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const {
    storedThemes,
    activeTheme,
    loadTheme,
    defaultThemeName,
    isDefaultTheme,
  } = useThemeImporter();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Close menu when Escape is pressed
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMenuOpen]);

  const handleExport = () => {
    const data = exportAllData();
    downloadDataAsJSON(data);
    setIsMenuOpen(false);
  };

  const handleThemeSelect = (themeName: string | null) => {
    loadTheme(themeName);
    setIsMenuOpen(false);
  };

  const handleThemeToggle = () => {
    const isDark = (resolvedTheme ?? theme ?? 'dark') === 'dark';
    setTheme(isDark ? 'light' : 'dark');
  };

  // Use safe defaults to prevent hydration mismatch
  // resolvedTheme can be undefined on server but have a value on client
  const isDark = (resolvedTheme ?? theme ?? 'dark') === 'dark';

  return (
    <div className="min-h-screen bg-md-surface text-md-on-surface">
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-md-primary focus:text-md-on-primary focus:rounded focus:ring-2 focus:ring-md-primary focus:ring-offset-2"
      >
        Skip to main content
      </a>
      <nav className="bg-md-surface-container border-b border-md-outline sticky top-0 z-50 backdrop-blur-md bg-md-surface-container/98" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-md-primary/10" aria-hidden="true">
                <FileText className="h-5 w-5 text-md-primary" />
              </div>
              <h1 className="text-xl font-bold text-md-on-surface">
                Cost Estimator
              </h1>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-smooth relative',
                        isActive
                          ? 'bg-md-primary text-md-on-primary elevation-1'
                          : 'text-md-on-surface-variant hover:text-md-on-surface hover-overlay'
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
              <div className="h-6 w-px bg-md-outline" />
              {/* Hamburger Menu */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2.5 rounded-full border border-md-outline bg-md-surface-variant/30 hover:border-md-primary hover:text-md-primary text-md-on-surface-variant transition-smooth elevation-1 hover:elevation-2 active:scale-95 hover-overlay relative"
                  aria-label="Menu"
                  aria-expanded={isMenuOpen}
                  aria-haspopup="true"
                  title="Menu"
                >
                  {isMenuOpen ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Menu className="h-4 w-4" />
                  )}
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-md-surface-container border border-md-outline rounded-xl shadow-lg elevation-8 z-50 overflow-hidden">
                    <div className="p-2">
                      {/* Theme Section */}
                      <div className="px-3 py-2 text-xs font-semibold text-md-on-surface-variant uppercase tracking-wide border-b border-md-outline mb-1">
                        Theme
                      </div>
                      
                      {/* Theme Toggle */}
                      <button
                        onClick={handleThemeToggle}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-md-on-surface hover:bg-md-surface-variant transition-smooth mb-1"
                      >
                        {isDark ? (
                          <>
                            <Sun className="h-4 w-4" />
                            Switch to Light Mode
                          </>
                        ) : (
                          <>
                            <Moon className="h-4 w-4" />
                            Switch to Dark Mode
                          </>
                        )}
                      </button>

                      {/* Default Theme */}
                      <button
                        onClick={() => handleThemeSelect(null)}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-smooth mb-1',
                          isDefaultTheme
                            ? 'bg-md-primary-container text-md-on-primary-container'
                            : 'text-md-on-surface hover:bg-md-surface-variant'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Palette className="h-4 w-4" />
                          <span className="font-medium">Default Theme</span>
                        </div>
                        {isDefaultTheme && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                      </button>

                      {/* Custom Themes */}
                      {storedThemes.map((storedTheme) => (
                        <button
                          key={storedTheme.name}
                          onClick={() => handleThemeSelect(storedTheme.name)}
                          className={cn(
                            'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-smooth mb-1',
                            activeTheme?.name === storedTheme.name
                              ? 'bg-md-primary-container text-md-on-primary-container'
                              : 'text-md-on-surface hover:bg-md-surface-variant'
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Palette className="h-4 w-4 shrink-0" />
                            <span className="font-medium truncate">{storedTheme.name}</span>
                            <span className="text-xs text-md-on-surface-variant shrink-0">
                              ({storedTheme.source})
                            </span>
                          </div>
                          {activeTheme?.name === storedTheme.name && (
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                          )}
                        </button>
                      ))}

                      {/* Import Theme Button */}
                      <button
                        onClick={() => {
                          setShowThemeImporter(true);
                          setIsMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-md-on-surface hover:bg-md-surface-variant transition-smooth mb-2"
                      >
                        <Upload className="h-4 w-4" />
                        Import Theme
                      </button>

                      {/* Data Section */}
                      <div className="mt-2 pt-2 border-t border-md-outline">
                        <div className="px-3 py-2 text-xs font-semibold text-md-on-surface-variant uppercase tracking-wide border-b border-md-outline mb-1">
                          Data
                        </div>
                        <button
                          onClick={handleExport}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-md-on-surface hover:bg-md-surface-variant transition-smooth"
                        >
                          <Download className="h-4 w-4" />
                          Export Data
                        </button>
                        <button
                          onClick={() => {
                            setShowImportModal(true);
                            setIsMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-md-on-surface hover:bg-md-surface-variant transition-smooth"
                        >
                          <Upload className="h-4 w-4" />
                          Import Data
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Import Data Modal */}
      {showImportModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowImportModal(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowImportModal(false);
            }
          }}
          tabIndex={-1}
        >
          <div className="bg-md-surface-container border border-md-outline rounded-xl elevation-24 max-w-2xl w-full max-h-[90vh] flex flex-col my-auto">
            <div className="sticky top-0 border-b border-md-outline px-6 py-4 flex items-center justify-between shrink-0 z-10">
              <h2 className="text-xl font-bold text-md-on-surface">Import Data</h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-2 rounded-full hover:bg-md-surface-variant text-md-on-surface-variant hover:text-md-on-surface transition-smooth"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              <DataImporter onClose={() => setShowImportModal(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Theme Importer Modal */}
      {showThemeImporter && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowThemeImporter(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowThemeImporter(false);
            }
          }}
          tabIndex={-1}
        >
          <div className="bg-md-surface-container border border-md-outline rounded-xl elevation-24 max-w-2xl w-full max-h-[90vh] flex flex-col my-auto">
            <div className="sticky top-0 border-b border-md-outline px-6 py-4 flex items-center justify-between shrink-0 z-10">
              <h2 className="text-xl font-bold text-md-on-surface">Theme Settings</h2>
              <button
                onClick={() => setShowThemeImporter(false)}
                className="p-2 rounded-full hover:bg-md-surface-variant text-md-on-surface-variant hover:text-md-on-surface transition-smooth"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              <ThemeImporter />
            </div>
          </div>
        </div>
      )}
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

