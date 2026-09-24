'use client';

import { useId, useState, useRef } from 'react';
import { useThemeImporter } from '@/hooks/use-theme-importer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FIELD_LABEL, fieldClasses } from '@/components/ui/field-styles';
import { Upload, X, CheckCircle2 } from 'lucide-react';
import type { MaterialThemeBuilderJSON } from '@/lib/themes/types';

export function ThemeImporter() {
  const pasteId = useId();
  const [themeName, setThemeName] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
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
    setParseError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string) as MaterialThemeBuilderJSON;
        const name = themeName.trim() || `Theme from ${file.name.replace('.json', '')}`;
        importTheme(json, name);
        setThemeName('');
        // Reset file input
        e.target.value = '';
      } catch (err) {
        console.error('Failed to parse JSON:', err);
        setParseError('Invalid JSON file. Please ensure it\'s a valid Material Theme Builder JSON export.');
      }
    };
    reader.onerror = () => {
      setParseError('Failed to read file');
    };
    reader.readAsText(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleJsonPaste = () => {
    setParseError(null);
    try {
      const json = JSON.parse(jsonText) as MaterialThemeBuilderJSON;
      const name = themeName.trim() || 'Imported Theme';
      importTheme(json, name);
      setJsonText('');
      setThemeName('');
    } catch (err) {
      console.error('Failed to parse JSON:', err);
      setParseError('Invalid JSON. Please ensure it\'s a valid Material Theme Builder JSON export.');
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-1 text-ink">Import a theme</h3>
        <p className="text-sm text-ink-muted mb-4">
          Import themes exported from Material Theme Builder as JSON files.
        </p>
        
        <div className="space-y-3">
          <div>
            <Input
              label="Theme name (optional)"
              placeholder="e.g. Brand blue"
              value={themeName}
              onChange={(e) => setThemeName(e.target.value)}
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
              Upload JSON file
            </Button>
          </div>
          
          <div className="space-y-2">
            <label htmlFor={pasteId} className={FIELD_LABEL}>
              Or paste JSON
            </label>
            <textarea
              id={pasteId}
              className={fieldClasses(false, 'p-3 font-mono text-[13px]')}
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
              Import from text
            </Button>
          </div>
        </div>
        
        {(parseError || error) && (
          <div role="alert" className="mt-3 p-3 bg-danger-bg border border-danger-border text-danger rounded-md text-sm">
            {parseError || error}
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-sm font-semibold mb-3 text-ink">Available themes</h3>
        <div className="space-y-2">
          {/* Default Theme Option - Always Available */}
          <div
            className={`flex items-center justify-between p-3 border rounded-md transition-smooth ${
              isDefaultTheme
                ? 'border-action-border bg-action-bg'
                : 'border-border bg-surface hover:border-border-strong'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${isDefaultTheme ? 'text-action' : 'text-ink'}`}>
                Default theme
              </span>
              {isDefaultTheme && (
                <CheckCircle2 className="h-4 w-4 text-action" aria-label="Active" />
              )}
            </div>
            {!isDefaultTheme && (
              <Button size="sm" onClick={() => loadTheme(null)}>
                Use default
              </Button>
            )}
          </div>
          
          {/* Custom Themes */}
          {storedThemes.map((theme) => (
            <div
              key={theme.name}
              className={`flex items-center justify-between p-3 border rounded-md transition-smooth ${
                activeTheme?.name === theme.name
                  ? 'border-action-border bg-action-bg'
                  : 'border-border bg-surface hover:border-border-strong'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className={`text-sm font-medium truncate ${
                  activeTheme?.name === theme.name ? 'text-action' : 'text-ink'
                }`}>
                  {theme.name}
                </span>
                {activeTheme?.name === theme.name && (
                  <CheckCircle2 className="h-4 w-4 text-action shrink-0" aria-label="Active" />
                )}
                <span className="text-xs text-ink-muted shrink-0">
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
            <p className="text-sm text-ink-muted text-center py-4">
              No custom themes imported yet. Import a theme from Material Theme Builder to get started.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

