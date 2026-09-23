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
import { useTemplatesStore } from '@/lib/stores/templates-store';

interface NavItem {
  name: string;
  href: string;
  count: number;
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
      className="flex items-center gap-2.5 min-w-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-md-primary"
    >
      <span
        className="flex items-center justify-center w-8 h-8 rounded-lg bg-md-primary/10 shrink-0"
        aria-hidden="true"
      >
        <FileText className="h-4 w-4 text-md-primary" />
      </span>
      <span className="text-base font-bold text-md-on-surface truncate">Cost Estimator</span>
    </Link>
  );
}

export function AppSidebar({ id, isOpen, onClose, onImportData, onOpenThemeSettings }: AppSidebarProps) {
  const pathname = usePathname();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  // Counts come from localStorage-persisted stores, so render them only after mount
  // to keep the prerendered HTML and the first client render identical.
  const [mounted, setMounted] = useState(false);

  const quotesCount = useQuotesStore((state) => state.quotes.length);
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
    { name: 'Quotes', href: '/quotes', count: quotesCount },
    { name: 'Templates', href: '/templates', count: templatesCount },
  ];

  const catalogItems: NavItem[] = [
    { name: 'Modules', href: '/modules', count: modulesCount },
    { name: 'Functions', href: '/functions', count: functionsCount },
    { name: 'Materials', href: '/materials', count: materialsCount },
    { name: 'Labor', href: '/labor', count: laborCount },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div
      id={id}
      className={cn(
        'fixed inset-y-0 left-0 z-50 lg:z-[45] w-64 lg:w-sidebar flex flex-col',
        'bg-md-surface-container border-r border-md-outline',
        // Visible immediately on open (so focus can move in), hidden only after the slide-out on close.
        isOpen
          ? 'translate-x-0 visible [transition:transform_200ms_ease-out]'
          : '-translate-x-full invisible [transition:transform_200ms_ease-out,visibility_0s_linear_200ms]',
        'lg:translate-x-0 lg:visible'
      )}
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-5">
        <AppBrand />
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          // transition-colors, not transition-smooth (`all`): transitioning the inherited
          // visibility would leave this hidden, and unfocusable, at the moment the drawer opens.
          className="lg:hidden p-2 -mr-2 rounded-full text-md-on-surface-variant hover:text-md-on-surface hover-overlay transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav aria-label="Main navigation" className="flex-1 min-h-0 overflow-y-auto px-3">
        <NavList items={primaryItems} isActive={isActive} showCounts={mounted} />
        <p className="px-3 pt-6 pb-2 text-[11px] font-semibold uppercase tracking-wider text-md-on-surface-variant">
          Catalog
        </p>
        <NavList items={catalogItems} isActive={isActive} showCounts={mounted} />
      </nav>

      <div className="px-3 pt-3 pb-4 space-y-3 border-t border-md-outline">
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
}: {
  items: NavItem[];
  isActive: (href: string) => boolean;
  showCounts: boolean;
}) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center justify-between gap-2 h-9 px-3 rounded-lg text-sm font-medium transition-smooth',
                active
                  ? 'bg-md-primary text-md-on-primary'
                  : 'text-md-on-surface-variant hover:text-md-on-surface hover-overlay'
              )}
            >
              <span className="truncate">{item.name}</span>
              {showCounts && (
                <span
                  className={cn(
                    'text-xs font-mono tabular-nums',
                    active ? 'text-md-on-primary/80' : 'text-md-on-surface-variant'
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
    <div role="group" aria-label="Color mode" className="flex gap-1 p-1 rounded-full bg-md-surface-container-high">
      {(['light', 'dark'] as const).map((mode) => {
        const active = activeMode === mode;
        return (
          <button
            key={mode}
            type="button"
            aria-pressed={active}
            onClick={() => setTheme(mode)}
            className={cn(
              'flex-1 py-1.5 rounded-full text-xs font-medium transition-smooth',
              active
                ? 'bg-md-surface text-md-on-surface elevation-1'
                : 'text-md-on-surface-variant hover:text-md-on-surface'
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
        className="w-full flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium text-md-on-surface-variant hover:text-md-on-surface hover-overlay transition-smooth"
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
      className="absolute bottom-full left-0 mb-2 w-64 bg-md-surface-container border border-md-outline rounded-xl shadow-lg elevation-8 z-50 overflow-hidden"
    >
      <div className="p-2 max-h-[70vh] overflow-y-auto">
        <div className="px-3 py-2 text-xs font-semibold text-md-on-surface-variant uppercase tracking-wide border-b border-md-outline mb-1">
          Theme
        </div>

        <button
          type="button"
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

        {storedThemes.map((storedTheme) => (
          <button
            key={storedTheme.name}
            type="button"
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
              <span className="text-xs text-md-on-surface-variant shrink-0">({storedTheme.source})</span>
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
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-md-on-surface hover:bg-md-surface-variant transition-smooth mb-2"
        >
          <Upload className="h-4 w-4" />
          Import Theme
        </button>

        <div className="mt-2 pt-2 border-t border-md-outline">
          <div className="px-3 py-2 text-xs font-semibold text-md-on-surface-variant uppercase tracking-wide border-b border-md-outline mb-1">
            Data
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-md-on-surface hover:bg-md-surface-variant transition-smooth"
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
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-md-on-surface hover:bg-md-surface-variant transition-smooth"
          >
            <Upload className="h-4 w-4" />
            Import Data
          </button>
        </div>
      </div>
    </div>
  );
}
