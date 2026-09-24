'use client';

import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { CheckCircle2, Download, FileText, Palette, Settings, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeImporter } from '@/hooks/use-theme-importer';
import { exportAllData, downloadDataAsJSON } from '@/lib/utils/data-export';
import { useFunctionsStore } from '@/lib/stores/functions-store';
import { useLaborStore } from '@/lib/stores/labor-store';
import { useMaterialsStore } from '@/lib/stores/materials-store';
import { useModulesStore } from '@/lib/stores/modules-store';
import { useQuotesStore } from '@/lib/stores/quotes-store';
import { getBoardQuotes } from '@/lib/quotes/quote-board';
import { useTemplatesStore } from '@/lib/stores/templates-store';

interface NavItem {
  name: string;
  href: string;
  count: number;
  /** Other routes that mark this item active, besides `href` and its subpaths. */
  alsoActiveOn?: string[];
}

interface AppSidebarProps {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  onImportData: () => void;
  onOpenThemeSettings: () => void;
}

export function AppBrand() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 min-w-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
    >
      <span
        className="flex items-center justify-center w-[26px] h-[26px] rounded-md bg-ink shrink-0"
        aria-hidden="true"
      >
        <FileText className="h-3.5 w-3.5 text-canvas" />
      </span>
      <span className="text-sm font-bold tracking-tight text-ink truncate">Cost Estimator</span>
    </Link>
  );
}

export function AppSidebar({ id, isOpen, onClose, onImportData, onOpenThemeSettings }: AppSidebarProps) {
  const pathname = usePathname();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  // Counts come from localStorage-persisted stores, so render them only after mount
  // to keep the prerendered HTML and the first client render identical.
  const [mounted, setMounted] = useState(false);

  // Same count as the board: saved quotes plus the open one if it isn't an untouched new quote.
  const quotesCount = useQuotesStore((state) => getBoardQuotes(state.quotes, state.currentQuote).length);
  const templatesCount = useTemplatesStore((state) => state.templates.length);
  const modulesCount = useModulesStore((state) => state.modules.length);
  const functionsCount = useFunctionsStore((state) => state.functions.length);
  const materialsCount = useMaterialsStore((state) => state.materials.length);
  const laborCount = useLaborStore((state) => state.labor.length);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  const primaryItems: NavItem[] = [
    // The quotes board is the home page; the builder at /quotes belongs to it too.
    { name: 'Quotes', href: '/', count: quotesCount, alsoActiveOn: ['/quotes'] },
    { name: 'Templates', href: '/templates', count: templatesCount },
  ];

  const catalogItems: NavItem[] = [
    { name: 'Modules', href: '/modules', count: modulesCount },
    { name: 'Functions', href: '/functions', count: functionsCount },
    { name: 'Materials', href: '/materials', count: materialsCount },
    { name: 'Labor', href: '/labor', count: laborCount },
  ];

  const matchesRoute = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
  const isActive = (item: NavItem) =>
    matchesRoute(item.href) || (item.alsoActiveOn ?? []).some(matchesRoute);

  return (
    <div
      id={id}
      className={cn(
        'fixed inset-y-0 left-0 z-50 lg:z-[45] w-64 lg:w-sidebar flex flex-col',
        'bg-sunken-2 border-r border-border',
        // Visible immediately on open (so focus can move in), hidden only after the slide-out on close.
        isOpen
          ? 'translate-x-0 visible [transition:transform_200ms_ease-out]'
          : '-translate-x-full invisible [transition:transform_200ms_ease-out,visibility_0s_linear_200ms]',
        'lg:translate-x-0 lg:visible'
      )}
    >
      <div className="flex items-center justify-between gap-2 px-[18px] pt-4 pb-[18px]">
        <AppBrand />
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          // transition-colors, not transition-smooth (`all`): transitioning the inherited
          // visibility would leave this hidden, and unfocusable, at the moment the drawer opens.
          className="lg:hidden p-2 -mr-2 rounded-md text-ink-muted hover:text-ink hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav aria-label="Main navigation" className="flex-1 min-h-0 overflow-y-auto px-3">
        <NavList items={primaryItems} isActive={isActive} showCounts={mounted} itemHeight="h-9" />
        <p className="px-2.5 pt-[22px] pb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          Catalog
        </p>
        <NavList items={catalogItems} isActive={isActive} showCounts={mounted} itemHeight="h-[34px]" />
      </nav>

      <div className="px-3 pt-3 pb-4 space-y-3 border-t border-border">
        <SettingsMenu onImportData={onImportData} onOpenThemeSettings={onOpenThemeSettings} />
        <ColorModeSwitch mounted={mounted} />
      </div>
    </div>
  );
}

function NavList({
  items,
  isActive,
  showCounts,
  itemHeight,
}: {
  items: NavItem[];
  isActive: (item: NavItem) => boolean;
  showCounts: boolean;
  itemHeight: string;
}) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const active = isActive(item);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center justify-between gap-2 px-2.5 rounded-md text-[13px] transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-action',
                itemHeight,
                active
                  ? 'bg-action-solid text-on-accent font-semibold'
                  : 'text-ink-body font-medium hover:text-ink hover:bg-surface-hover'
              )}
            >
              <span className="truncate">{item.name}</span>
              {showCounts && (
                <span
                  className={cn(
                    'text-[11px] font-numeric',
                    active ? 'text-action-border font-medium' : 'text-ink-faint'
                  )}
                >
                  {item.count}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ColorModeSwitch({ mounted }: { mounted: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const activeMode = mounted ? resolvedTheme : undefined;

  return (
    <div role="group" aria-label="Color mode" className="flex gap-1 p-1 rounded-full bg-border">
      {(['light', 'dark'] as const).map((mode) => {
        const active = activeMode === mode;
        return (
          <button
            key={mode}
            type="button"
            aria-pressed={active}
            onClick={() => setTheme(mode)}
            className={cn(
              'flex-1 py-1.5 rounded-full text-[11px] transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-action',
              active
                ? 'bg-surface text-ink font-semibold shadow-card'
                : 'text-ink-muted font-medium hover:text-ink'
            )}
          >
            {mode === 'light' ? 'Light' : 'Dark'}
          </button>
        );
      })}
    </div>
  );
}

function SettingsMenu({
  onImportData,
  onOpenThemeSettings,
}: {
  onImportData: () => void;
  onOpenThemeSettings: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // preventDefault marks Escape as handled so the mobile drawer's document-level
  // listener (see Layout) leaves the drawer open and only this menu closes.
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  };

  return (
    <div className="relative" ref={menuRef} onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls="app-settings-menu"
        className="w-full flex items-center gap-2 h-[34px] px-2.5 rounded-md text-[13px] font-medium text-ink-body hover:text-ink hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-action transition-colors"
      >
        <Settings className="h-4 w-4" aria-hidden="true" />
        Settings
      </button>

      {isOpen && (
        <SettingsMenuPanel
          id="app-settings-menu"
          onClose={() => setIsOpen(false)}
          onImportData={onImportData}
          onOpenThemeSettings={onOpenThemeSettings}
        />
      )}
    </div>
  );
}

function SettingsMenuPanel({
  id,
  onClose,
  onImportData,
  onOpenThemeSettings,
}: {
  id: string;
  onClose: () => void;
  onImportData: () => void;
  onOpenThemeSettings: () => void;
}) {
  const { storedThemes, activeTheme, loadTheme, isDefaultTheme } = useThemeImporter();

  const handleThemeSelect = (themeName: string | null) => {
    loadTheme(themeName);
    onClose();
  };

  const handleExport = () => {
    downloadDataAsJSON(exportAllData());
    onClose();
  };

  return (
    <div
      id={id}
      className="absolute bottom-full left-0 mb-2 w-64 bg-surface border border-border-strong rounded-[10px] shadow-panel z-50 overflow-hidden"
    >
      <div className="p-2 max-h-[70vh] overflow-y-auto">
        <div className="px-2.5 pt-2 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          Theme
        </div>

        <button
          type="button"
          onClick={() => handleThemeSelect(null)}
          className={cn(
            'w-full flex items-center justify-between h-[34px] px-2.5 rounded-md text-[13px] transition-colors mb-0.5',
            isDefaultTheme
              ? 'bg-action-bg text-action font-medium'
              : 'text-ink-body hover:text-ink hover:bg-surface-hover'
          )}
        >
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="font-medium">Default Theme</span>
          </div>
          {isDefaultTheme && <CheckCircle2 className="h-4 w-4 shrink-0" />}
        </button>

        {storedThemes.map((storedTheme) => (
          <button
            key={storedTheme.name}
            type="button"
            onClick={() => handleThemeSelect(storedTheme.name)}
            className={cn(
              'w-full flex items-center justify-between h-[34px] px-2.5 rounded-md text-[13px] transition-colors mb-0.5',
              activeTheme?.name === storedTheme.name
                ? 'bg-action-bg text-action font-medium'
                : 'text-ink-body hover:text-ink hover:bg-surface-hover'
            )}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Palette className="h-4 w-4 shrink-0" />
              <span className="font-medium truncate">{storedTheme.name}</span>
              <span className="text-xs text-ink-faint shrink-0">({storedTheme.source})</span>
            </div>
            {activeTheme?.name === storedTheme.name && <CheckCircle2 className="h-4 w-4 shrink-0" />}
          </button>
        ))}

        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenThemeSettings();
          }}
          className="w-full flex items-center gap-2 h-[34px] px-2.5 rounded-md text-[13px] text-ink-body hover:text-ink hover:bg-surface-hover transition-colors mb-1"
        >
          <Upload className="h-4 w-4" />
          Import Theme
        </button>

        <div className="mt-1 pt-1 border-t border-border">
          <div className="px-2.5 pt-2 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Data
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="w-full flex items-center gap-2 h-[34px] px-2.5 rounded-md text-[13px] text-ink-body hover:text-ink hover:bg-surface-hover transition-colors"
          >
            <Download className="h-4 w-4" />
            Export Data
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onImportData();
            }}
            className="w-full flex items-center gap-2 h-[34px] px-2.5 rounded-md text-[13px] text-ink-body hover:text-ink hover:bg-surface-hover transition-colors"
          >
            <Upload className="h-4 w-4" />
            Import Data
          </button>
        </div>
      </div>
    </div>
  );
}
