'use client';

import { useState, useEffect, useRef } from 'react';
import { useThemeImporter } from '@/hooks/use-theme-importer';
import { Palette, CheckCircle2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

/**
 * Theme Selector Component
 * 
 * Provides quick theme switching via dropdown menu
 * Shows available themes and allows switching between them
 */
export function ThemeSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {
    storedThemes,
    activeTheme,
    loadTheme,
    defaultThemeName,
    isDefaultTheme,
  } = useThemeImporter();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown when Escape is pressed
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleThemeSelect = (themeName: string | null) => {
    loadTheme(themeName);
    setIsOpen(false);
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2.5 rounded-full border border-md-outline bg-md-surface-variant/30 hover:border-md-primary hover:text-md-primary text-md-on-surface-variant transition-smooth elevation-1 hover:elevation-2 active:scale-95 hover-overlay relative"
          aria-label="Select theme"
          aria-expanded={isOpen}
          aria-haspopup="true"
          title="Select theme"
        >
          <Palette className="h-4 w-4" />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-md-surface-container border border-md-outline rounded-xl shadow-lg elevation-8 z-50 overflow-hidden">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-md-on-surface-variant uppercase tracking-wide border-b border-md-outline mb-1">
                Themes
              </div>
              
              {/* Default Theme */}
              <button
                onClick={() => handleThemeSelect(null)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-smooth',
                  isDefaultTheme
                    ? 'bg-md-primary-container text-md-on-primary-container'
                    : 'text-md-on-surface hover:bg-md-surface-variant'
                )}
              >
                <span className="font-medium">Default Theme</span>
                {isDefaultTheme && <CheckCircle2 className="h-4 w-4" />}
              </button>

              {/* Custom Themes */}
              {storedThemes.map((theme) => (
                <button
                  key={theme.name}
                  onClick={() => handleThemeSelect(theme.name)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-smooth',
                    activeTheme?.name === theme.name
                      ? 'bg-md-primary-container text-md-on-primary-container'
                      : 'text-md-on-surface hover:bg-md-surface-variant'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-medium truncate">{theme.name}</span>
                    <span className="text-xs text-md-on-surface-variant shrink-0">
                      ({theme.source})
                    </span>
                  </div>
                  {activeTheme?.name === theme.name && (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  )}
                </button>
              ))}

              {/* Import Button */}
              <div className="mt-2 pt-2 border-t border-md-outline">
                <button
                  onClick={() => {
                    setShowImporter(true);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-md-on-surface hover:bg-md-surface-variant transition-smooth"
                >
                  <Upload className="h-4 w-4" />
                  Import Theme
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Full Theme Importer Modal */}
      {showImporter && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            // Close modal when clicking backdrop
            if (e.target === e.currentTarget) {
              setShowImporter(false);
            }
          }}
          onKeyDown={(e) => {
            // Close modal on Escape key
            if (e.key === 'Escape') {
              setShowImporter(false);
            }
          }}
          tabIndex={-1}
        >
          <div className="bg-md-surface-container border border-md-outline rounded-xl elevation-24 max-w-2xl w-full max-h-[90vh] flex flex-col my-auto">
          <div className="sticky top-0 border-b border-md-outline px-6 py-4 flex items-center justify-between shrink-0 z-10">
              <h2 className="text-xl font-bold text-md-on-surface">Theme Settings</h2>
              <button
                onClick={() => setShowImporter(false)}
                className="p-2 rounded-full hover:bg-md-surface-variant text-md-on-surface-variant hover:text-md-on-surface transition-smooth"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              <ThemeImporterContent onClose={() => setShowImporter(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Theme Importer Content Component
 * Extracted from ThemeImporter for use in modal
 */
function ThemeImporterContent({ onClose }: { onClose: () => void }) {
  const [themeName, setThemeName] = useState('');
  const [jsonText, setJsonText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    importTheme,
    error,
    storedThemes,
    loadTheme,
    removeTheme,
    activeTheme,
    defaultThemeName,
    isDefaultTheme,
  } = useThemeImporter();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const name = themeName.trim() || `Theme from ${file.name.replace('.json', '')}`;
        importTheme(json, name);
        setThemeName('');
        e.target.value = '';
      } catch (err) {
        console.error('Failed to parse JSON:', err);
        alert('Invalid JSON file. Please ensure it\'s a valid Material Theme Builder JSON export.');
      }
    };
    reader.onerror = () => {
      alert('Failed to read file');
    };
    reader.readAsText(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleJsonPaste = () => {
    try {
      const json = JSON.parse(jsonText);
      const name = themeName.trim() || 'Imported Theme';
      importTheme(json, name);
      setJsonText('');
      setThemeName('');
    } catch (err) {
      console.error('Failed to parse JSON:', err);
      alert('Invalid JSON. Please ensure it\'s a valid Material Theme Builder JSON export.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2 text-md-on-surface">Import Theme</h3>
        <p className="text-sm text-md-on-surface-variant mb-4">
          Import themes exported from Material Theme Builder as JSON files.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-md-on-surface mb-1.5">
              Theme Name
            </label>
            <input
              type="text"
              placeholder="Enter theme name (optional)"
              value={themeName}
              onChange={(e) => setThemeName(e.target.value)}
              className="w-full px-4 py-2.5 bg-md-surface-container-low rounded-full border border-md-outline/50 text-md-on-surface placeholder-md-on-surface-variant focus:outline-none focus:ring-2 focus:ring-md-primary/50 focus:border-md-primary transition-smooth"
            />
          </div>

          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button type="button" className="w-full" onClick={handleUploadClick}>
              <Upload className="h-4 w-4 mr-2" />
              Upload JSON File
            </Button>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-md-on-surface mb-1.5">
              Or Paste JSON
            </label>
            <textarea
              className="w-full p-3 border border-md-outline rounded-md font-mono text-sm bg-md-surface-container-low text-md-on-surface focus:outline-none focus:ring-2 focus:ring-md-primary focus:border-md-primary"
              placeholder="Paste Material Theme Builder JSON here..."
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={8}
            />
            <Button
              onClick={handleJsonPaste}
              disabled={!jsonText.trim()}
              className="w-full"
            >
              Import from Text
            </Button>
          </div>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-md-error-container text-md-on-error-container rounded-md text-sm">
            {error}
          </div>
        )}
      </div>

      <div>
        <h4 className="font-semibold mb-3 text-md-on-surface">Available Themes</h4>
        <div className="space-y-2">
          {/* Default Theme */}
          <div
            className={cn(
              'flex items-center justify-between p-3 border rounded-md transition-smooth',
              isDefaultTheme
                ? 'border-md-primary bg-md-primary-container/20'
                : 'border-md-outline bg-md-surface-container hover:border-md-primary/50'
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn('font-medium', isDefaultTheme ? 'text-md-primary' : 'text-md-on-surface')}>
                Default Theme
              </span>
              {isDefaultTheme && <CheckCircle2 className="h-4 w-4 text-md-primary" />}
            </div>
            {!isDefaultTheme && (
              <Button size="sm" onClick={() => loadTheme(null)}>
                Use Default
              </Button>
            )}
          </div>

          {/* Custom Themes */}
          {storedThemes.map((theme) => (
            <div
              key={theme.name}
              className={cn(
                'flex items-center justify-between p-3 border rounded-md transition-smooth',
                activeTheme?.name === theme.name
                  ? 'border-md-primary bg-md-primary-container/20'
                  : 'border-md-outline bg-md-surface-container hover:border-md-primary/50'
              )}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className={cn('font-medium truncate', activeTheme?.name === theme.name ? 'text-md-primary' : 'text-md-on-surface')}>
                  {theme.name}
                </span>
                {activeTheme?.name === theme.name && (
                  <CheckCircle2 className="h-4 w-4 text-md-primary shrink-0" />
                )}
                <span className="text-xs text-md-on-surface-variant shrink-0">
                  ({theme.source})
                </span>
              </div>
              <div className="flex gap-2 shrink-0">
                {activeTheme?.name !== theme.name && (
                  <Button size="sm" onClick={() => loadTheme(theme.name)}>
                    Load
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => removeTheme(theme.name)}
                  className="flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Remove
                </Button>
              </div>
            </div>
          ))}

          {storedThemes.length === 0 && (
            <p className="text-sm text-md-on-surface-variant text-center py-4">
              No custom themes imported yet. Import a theme from Material Theme Builder to get started.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

