'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { DataImporter } from '@/components/DataImporter';
import { ThemeImporter } from '@/components/ThemeImporter';
import { AppBrand, AppSidebar } from '@/components/AppSidebar';
import { NotificationHost } from '@/components/shared/NotificationHost';
import { Menu, X } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const pathname = usePathname();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showThemeImporter, setShowThemeImporter] = useState(false);
  const navTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setIsNavOpen(false);
  }, [pathname]);

  const closeNav = () => {
    setIsNavOpen(false);
    navTriggerRef.current?.focus();
  };

  useEffect(() => {
    if (!isNavOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        setIsNavOpen(false);
        navTriggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isNavOpen]);

  const openImportData = () => {
    setIsNavOpen(false);
    setShowImportModal(true);
  };

  const openThemeSettings = () => {
    setIsNavOpen(false);
    setShowThemeImporter(true);
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-action-solid focus:text-on-accent focus:rounded-md focus:ring-2 focus:ring-action focus:ring-offset-2"
      >
        Skip to main content
      </a>

      <header className="lg:hidden sticky top-0 z-30 h-app-header flex items-center gap-3 px-4 bg-sunken-2 border-b border-border">
        <button
          ref={navTriggerRef}
          type="button"
          onClick={() => setIsNavOpen(true)}
          aria-label="Open navigation"
          aria-expanded={isNavOpen}
          aria-controls="app-sidebar"
          className="p-2 -ml-2 rounded-md text-ink-muted hover:text-ink hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <AppBrand />
      </header>

      {isNavOpen && (
        <div
          className="fixed inset-0 z-[45] bg-black/50 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
          onClick={closeNav}
        />
      )}

      <AppSidebar
        id="app-sidebar"
        isOpen={isNavOpen}
        onClose={closeNav}
        onImportData={openImportData}
        onOpenThemeSettings={openThemeSettings}
      />

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
          <div className="bg-surface border border-border-strong rounded-[10px] shadow-panel max-w-2xl w-full max-h-[90vh] flex flex-col my-auto">
            <div className="sticky top-0 border-b border-border px-5 py-3.5 flex items-center justify-between shrink-0 z-10">
              <h2 className="text-base font-semibold text-ink">Import Data</h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 min-h-0">
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
          <div className="bg-surface border border-border-strong rounded-[10px] shadow-panel max-w-2xl w-full max-h-[90vh] flex flex-col my-auto">
            <div className="sticky top-0 border-b border-border px-5 py-3.5 flex items-center justify-between shrink-0 z-10">
              <h2 className="text-base font-semibold text-ink">Theme Settings</h2>
              <button
                onClick={() => setShowThemeImporter(false)}
                className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 min-h-0">
              <ThemeImporter />
            </div>
          </div>
        </div>
      )}
      <div className="pl-sidebar">
        <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
      <NotificationHost />
    </div>
  );
};
