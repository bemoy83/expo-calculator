'use client';

import { useState } from 'react';
import { useThemeImporter } from '@/hooks/use-theme-importer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Upload, X, CheckCircle2 } from 'lucide-react';
import type { MaterialThemeBuilderJSON } from '@/lib/themes/types';

export function ThemeImporter() {
  const [themeName, setThemeName] = useState('');
  const [jsonText, setJsonText] = useState('');
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
        const json = JSON.parse(event.target?.result as string) as MaterialThemeBuilderJSON;
        const name = themeName.trim() || `Theme from ${file.name.replace('.json', '')}`;
        importTheme(json, name);
        setThemeName('');
        // Reset file input
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
  
  const handleJsonPaste = () => {
    try {
      const json = JSON.parse(jsonText) as MaterialThemeBuilderJSON;
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
            <Input
              placeholder="Enter theme name (optional)"
              value={themeName}
              onChange={(e) => setThemeName(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <label className="flex-1">
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button type="button" className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Upload JSON File
              </Button>
            </label>
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
          {/* Default Theme Option - Always Available */}
          <div
            className={`flex items-center justify-between p-3 border rounded-md transition-smooth ${
              isDefaultTheme
                ? 'border-md-primary bg-md-primary-container/20'
                : 'border-md-outline bg-md-surface-container hover:border-md-primary/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`font-medium ${isDefaultTheme ? 'text-md-primary' : 'text-md-on-surface'}`}>
                Default Theme
              </span>
              {isDefaultTheme && (
                <CheckCircle2 className="h-4 w-4 text-md-primary" />
              )}
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
              className={`flex items-center justify-between p-3 border rounded-md transition-smooth ${
                activeTheme?.name === theme.name
                  ? 'border-md-primary bg-md-primary-container/20'
                  : 'border-md-outline bg-md-surface-container hover:border-md-primary/50'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className={`font-medium truncate ${
                  activeTheme?.name === theme.name ? 'text-md-primary' : 'text-md-on-surface'
                }`}>
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

