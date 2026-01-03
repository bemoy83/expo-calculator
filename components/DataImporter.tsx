'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Upload, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { validateImportedData, importData, type ImportResult } from '@/lib/utils/data-import';
import type { ExportedData } from '@/lib/utils/data-export';

interface DataImporterProps {
  onClose: () => void;
}

export function DataImporter({ onClose }: DataImporterProps) {
  const [jsonText, setJsonText] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('merge');
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [pendingData, setPendingData] = useState<ExportedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!validateImportedData(json)) {
          setError('Invalid data format. Please ensure it\'s a valid export file.');
          return;
        }
        setError(null);
        setPendingData(json);
        if (importMode === 'replace') {
          setShowReplaceConfirm(true);
        } else {
          executeImport(json);
        }
        e.target.value = '';
      } catch (err) {
        console.error('Failed to parse JSON:', err);
        setError('Invalid JSON file. Please ensure it\'s a valid export file.');
      }
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsText(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleJsonPaste = () => {
    try {
      const json = JSON.parse(jsonText);
      if (!validateImportedData(json)) {
        setError('Invalid data format. Please ensure it\'s a valid export file.');
        return;
      }
      setError(null);
      setPendingData(json);
      if (importMode === 'replace') {
        setShowReplaceConfirm(true);
      } else {
        executeImport(json);
      }
    } catch (err) {
      console.error('Failed to parse JSON:', err);
      setError('Invalid JSON. Please ensure it\'s a valid export file.');
    }
  };

  const executeImport = (data: ExportedData) => {
    const result = importData(data, { mode: importMode });
    setImportResult(result);
    
    if (result.success) {
      // Clear form on success
      setJsonText('');
      setPendingData(null);
      // Auto-close after 3 seconds
      setTimeout(() => {
        onClose();
      }, 3000);
    }
  };

  const handleConfirmReplace = () => {
    if (pendingData) {
      executeImport(pendingData);
      setShowReplaceConfirm(false);
    }
  };

  const handleCancelReplace = () => {
    setShowReplaceConfirm(false);
    setPendingData(null);
  };

  if (showReplaceConfirm) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-md-error-container/20 border border-md-error/30 rounded-lg">
          <AlertCircle className="h-5 w-5 text-md-error shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-md-error mb-1">Replace All Data?</h4>
            <p className="text-sm text-md-on-error-container">
              This will delete all existing modules, materials, categories, and functions, then import the new data. This action cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={handleCancelReplace} className="rounded-full">
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirmReplace} className="rounded-full">
            Replace All Data
          </Button>
        </div>
      </div>
    );
  }

  if (importResult?.success) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-success/10 border border-success/30 rounded-lg">
          <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-success mb-2">Import Successful</h4>
            <div className="text-sm text-success space-y-1">
              <p>• {importResult.modulesAdded} module{importResult.modulesAdded !== 1 ? 's' : ''} imported</p>
              <p>• {importResult.materialsAdded} material{importResult.materialsAdded !== 1 ? 's' : ''} imported</p>
              <p>• {importResult.categoriesAdded} categor{importResult.categoriesAdded !== 1 ? 'ies' : 'y'} imported</p>
              {importResult.functionsAdded > 0 && (
                <p>• {importResult.functionsAdded} function{importResult.functionsAdded !== 1 ? 's' : ''} imported</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={onClose} className="rounded-full">
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2 text-md-on-surface">Import Data</h3>
        <p className="text-sm text-md-on-surface-variant mb-4">
          Import modules, materials, categories, and functions from an exported JSON file. Note: Templates are not imported as they reference module IDs that change during import.
        </p>

        <div className="space-y-4">
          {/* Import Mode Selection */}
          <div>
            <label className="block text-sm font-medium text-md-on-surface mb-2">
              Import Mode
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="merge"
                  checked={importMode === 'merge'}
                  onChange={(e) => setImportMode(e.target.value as 'replace' | 'merge')}
                  className="w-4 h-4 text-md-primary focus:ring-md-primary"
                />
                <div>
                  <span className="text-sm font-medium text-md-on-surface">Merge with existing</span>
                  <p className="text-xs text-md-on-surface-variant">Add imported data to existing data (skip duplicates)</p>
                </div>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={(e) => setImportMode(e.target.value as 'replace' | 'merge')}
                  className="w-4 h-4 text-md-primary focus:ring-md-primary"
                />
                <div>
                  <span className="text-sm font-medium text-md-on-surface">Replace all data</span>
                  <p className="text-xs text-md-on-surface-variant">Delete all existing data and import new data</p>
                </div>
              </label>
            </div>
          </div>

          {/* File Upload */}
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

          {/* JSON Paste */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-md-on-surface mb-1.5">
              Or Paste JSON
            </label>
            <textarea
              className="w-full p-3 border border-md-outline rounded-md font-mono text-sm bg-md-surface-container-low text-md-on-surface focus:outline-none focus:ring-2 focus:ring-md-primary focus:border-md-primary"
              placeholder="Paste exported JSON data here..."
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={8}
            />
            <Button
              onClick={handleJsonPaste}
              disabled={!jsonText.trim()}
              className="w-full rounded-full"
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

        {importResult && !importResult.success && importResult.errors && (
          <div className="mt-3 p-3 bg-md-error-container text-md-on-error-container rounded-md text-sm">
            <p className="font-semibold mb-2">Import completed with errors:</p>
            <ul className="list-disc list-inside space-y-1">
              {importResult.errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
            {(importResult.modulesAdded > 0 || importResult.materialsAdded > 0 || importResult.categoriesAdded > 0 || importResult.functionsAdded > 0) && (
              <p className="mt-2 text-xs">
                Partial import: {importResult.modulesAdded} modules, {importResult.materialsAdded} materials, {importResult.categoriesAdded} categories{importResult.functionsAdded > 0 ? `, ${importResult.functionsAdded} functions` : ''} imported.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

