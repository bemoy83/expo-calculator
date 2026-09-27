'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DataImporter } from '@/components/DataImporter';
import { PackExporter } from '@/components/PackExporter';
import { Card } from '@/components/ui/Card';
import { isBuilderRoute, useUseOnlyMode } from '@/hooks/use-device';
import { AppBrand, AppSidebar, SettingsMenu } from '@/components/AppSidebar';
import { TopBar, type TopBarTab } from '@/components/TopBar';
import { ModalDialog } from '@/components/shared/ModalDialog';
import { NotificationHost } from '@/components/shared/NotificationHost';
import { Menu } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  /**
   * The page draws its own full-bleed header band and panes. Pages not yet rebuilt for the Ledger
   * redesign leave it off and sit in the old centred, padded container.
   */
  fullBleed?: boolean;
}

const MAIN_TABS: TopBarTab[] = [
  { id: 'calculators', label: 'Calculators', href: '/' },
  { id: 'quotes', label: 'Quotes', href: '/quotes/board' },
  { id: 'catalog', label: 'Catalog', href: '/materials' },
];

/** The top tab a route belongs to: a calculator open at /calculator is under Calculators, an open quote under Quotes. */
export function mainTabFor(pathname: string): string {
  const path = pathname.replace(/\/+$/, '') || '/';
  const under = (route: string) => path === route || path.startsWith(`${route}/`);
  if (['/materials', '/labor', '/functions'].some(under)) return 'catalog';
  if (under('/quotes')) return 'quotes';
  if (path === '/' || under('/calculator')) return 'calculators';
  return '';
}

export const Layout: React.FC<LayoutProps> = ({ children, fullBleed = false }) => {
  const pathname = usePathname();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPackExport, setShowPackExport] = useState(false);
  const useOnly = useUseOnlyMode();
  const hidden = useOnly && isBuilderRoute(pathname);
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

  const openPackExport = () => {
    setIsNavOpen(false);
    setShowPackExport(true);
  };

  // Use-only mode hides the Catalog.
  const tabs = useOnly ? MAIN_TABS.filter((tab) => tab.id !== 'catalog') : MAIN_TABS;

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-action-solid focus:text-on-accent focus:rounded-md focus:ring-2 focus:ring-action focus:ring-offset-2"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-30 bg-canvas">
        <TopBar
          className="hidden lg:flex"
          tabs={tabs}
          active={mainTabFor(pathname)}
          brandHref="/"
          right={<SettingsMenu placement="down" onImportData={openImportData} onExportPack={openPackExport} />}
        />
        {/* Below lg the tabs collapse into the Menu drawer. */}
        <div className="lg:hidden h-app-header flex items-center gap-3 px-4 border-b border-border">
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
        </div>
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
        onExportPack={openPackExport}
      />

      <ModalDialog
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import data"
        maxWidth="wide"
      >
        <DataImporter onClose={() => setShowImportModal(false)} />
      </ModalDialog>

      <ModalDialog
        isOpen={showPackExport}
        onClose={() => setShowPackExport(false)}
        title="Export calculator pack"
        maxWidth="wide"
      >
        <PackExporter onClose={() => setShowPackExport(false)} />
      </ModalDialog>

      <main id="main-content" className={fullBleed ? undefined : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'}>
        {hidden ? (
          <div className={fullBleed ? 'p-6' : undefined}>
            <HiddenInUseOnlyMode />
          </div>
        ) : (
          children
        )}
      </main>
      <NotificationHost />
    </div>
  );
};

// What the builder and library pages show in use-only mode (reached by an old link or bookmark).
function HiddenInUseOnlyMode() {
  return (
    <Card className="max-w-xl p-5">
      <h1 className="text-lg font-semibold text-ink">Not available in use-only mode</h1>
      <p className="mt-1 text-sm text-ink-muted">
        This browser is set to use-only mode, which hides building calculators and the Functions, Materials and
        Labor pages. To use them, switch off Use-only mode in Settings.
      </p>
      <Link
        href="/"
        className="mt-3 inline-block text-sm font-medium text-ink underline decoration-border-strong hover:decoration-accent focus:outline-none focus-visible:decoration-accent"
      >
        Go to Calculators
      </Link>
    </Card>
  );
}
