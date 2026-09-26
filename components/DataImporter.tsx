'use client';

import { useId, useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { FIELD_LABEL, fieldClasses } from '@/components/ui/field-styles';
import { Upload, CheckCircle2, AlertCircle, Package } from 'lucide-react';
import { validateImportedData, importData, type ImportResult } from '@/lib/utils/data-import';
import type { ExportedData } from '@/lib/utils/data-export';
import { calculatorsNotInPack, comparePackDates, isCalculatorPack } from '@/lib/calculator/pack';
import { formatPackDate } from '@/lib/calculator/format';
import { useCalculatorsStore } from '@/lib/stores/calculators-store';
import { useDeviceStore } from '@/lib/stores/device-store';

interface DataImporterProps {
  onClose: () => void;
}

export function DataImporter({ onClose }: DataImporterProps) {
  const pasteId = useId();
  const [jsonText, setJsonText] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('merge');
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [pendingData, setPendingData] = useState<ExportedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [pendingPack, setPendingPack] = useState<ExportedData | null>(null);
  const [packLoaded, setPackLoaded] = useState(false);
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
        handleValidData(json);
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

  // A calculator pack always replaces, after its own confirmation; other files follow the mode.
  const handleValidData = (data: ExportedData) => {
    if (isCalculatorPack(data)) {
      setPendingPack(data);
      return;
    }
    setPendingData(data);
    if (importMode === 'replace') {
      setShowReplaceConfirm(true);
    } else {
      executeImport(data);
    }
  };

  const loadPack = (data: ExportedData, turnOnUseOnly: boolean) => {
    const result = importData(data, { mode: 'replace' });
    setImportResult(result);
    setPendingPack(null);
    if (result.success) {
      setJsonText('');
      setPackLoaded(true);
      if (turnOnUseOnly) useDeviceStore.getState().setUseOnly(true);
    }
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
      handleValidData(json);
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
      // Auto-close after 3 seconds, unless there are warnings to read
      if (!result.warnings) {
        setTimeout(() => {
          onClose();
        }, 3000);
      }
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

  if (pendingPack) {
    return <PackConfirm pack={pendingPack} onCancel={() => setPendingPack(null)} onLoad={loadPack} />;
  }

  if (showReplaceConfirm) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-danger-bg border border-danger-border rounded-lg">
          <AlertCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-danger mb-1">Replace all data?</h3>
            <p className="text-sm text-ink-body">
              This deletes your calculators, materials, categories, labor, and functions, then imports the ones in the file. Calculators, labor, or functions are kept if the file doesn&apos;t include them. Quotes are kept; lines sent from a calculator that isn&apos;t in the file keep their price but can no longer be edited. This can&apos;t be undone.
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={handleCancelReplace}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirmReplace}>
            Replace all data
          </Button>
        </div>
      </div>
    );
  }

  if (importResult?.success) {
    return (
      <div className="space-y-4">
        <div role="status" className="flex items-start gap-3 p-4 bg-committed-bg border border-committed-border rounded-lg">
          <CheckCircle2 className="h-5 w-5 text-committed shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-committed mb-2">
              {packLoaded ? 'Calculator pack loaded' : 'Import complete'}
            </h3>
            <div className="text-sm text-ink-body space-y-1">
              <p>• {importResult.calculatorsAdded} calculator{importResult.calculatorsAdded !== 1 ? 's' : ''} imported</p>
              <p>• {importResult.materialsAdded} material{importResult.materialsAdded !== 1 ? 's' : ''} imported</p>
              {importResult.laborAdded > 0 && (
                <p>• {importResult.laborAdded} labor item{importResult.laborAdded !== 1 ? 's' : ''} imported</p>
              )}
              <p>• {importResult.categoriesAdded} categor{importResult.categoriesAdded !== 1 ? 'ies' : 'y'} imported</p>
              {importResult.functionsAdded > 0 && (
                <p>• {importResult.functionsAdded} function{importResult.functionsAdded !== 1 ? 's' : ''} imported</p>
              )}
            </div>
          </div>
        </div>
        {importResult.warnings && <ImportWarnings warnings={importResult.warnings} />}
        {packLoaded && <UseOnlyNote />}
        <div className="flex justify-end">
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-ink-muted mb-4">
          Import calculators, functions, materials, labor, and categories from an exported JSON file. A calculator pack always replaces the calculators, functions, materials and labor on this device, and asks first. Files exported before calculators have their modules and templates turned into calculators. Quotes aren&apos;t part of an export and are never changed by an import.
        </p>

        <div className="space-y-4">
          {/* Import Mode Selection */}
          <fieldset>
            <legend className={FIELD_LABEL}>Import mode</legend>
            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="merge"
                  checked={importMode === 'merge'}
                  onChange={(e) => setImportMode(e.target.value as 'replace' | 'merge')}
                  className="w-4 h-4 mt-0.5 accent-action focus:ring-action"
                />
                <div>
                  <span className="text-sm font-medium text-ink">Merge with existing</span>
                  <p className="text-xs text-ink-muted">Add imported data to existing data, skipping anything whose name already exists</p>
                </div>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={(e) => setImportMode(e.target.value as 'replace' | 'merge')}
                  className="w-4 h-4 mt-0.5 accent-action focus:ring-action"
                />
                <div>
                  <span className="text-sm font-medium text-ink">Replace all data</span>
                  <p className="text-xs text-ink-muted">Delete your calculators, materials, labor, categories, and functions, then import the file&apos;s. Quotes are kept.</p>
                </div>
              </label>
            </div>
          </fieldset>

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
              Upload JSON file
            </Button>
          </div>

          {/* JSON Paste */}
          <div className="space-y-2">
            <label htmlFor={pasteId} className={FIELD_LABEL}>
              Or paste JSON
            </label>
            <textarea
              id={pasteId}
              className={fieldClasses(false, 'p-3 font-mono text-[13px]')}
              placeholder="Paste exported JSON data here..."
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

        {error && (
          <div role="alert" className="mt-3 p-3 bg-danger-bg border border-danger-border text-danger rounded-md text-sm">
            {error}
          </div>
        )}

        {importResult && !importResult.success && importResult.errors && (
          <div role="alert" className="mt-3 p-3 bg-danger-bg border border-danger-border text-danger rounded-md text-sm">
            <p className="font-semibold mb-2">Import completed with errors:</p>
            <ul className="list-disc list-inside space-y-1">
              {importResult.errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
            {(importResult.calculatorsAdded > 0 || importResult.materialsAdded > 0 || importResult.laborAdded > 0 || importResult.categoriesAdded > 0 || importResult.functionsAdded > 0) && (
              <p className="mt-2 text-xs">
                Partial import: {importResult.calculatorsAdded} calculators, {importResult.materialsAdded} materials, {importResult.laborAdded} labor items, {importResult.categoriesAdded} categories, {importResult.functionsAdded} functions imported.
              </p>
            )}
          </div>
        )}

        {importResult && !importResult.success && importResult.warnings && (
          <div className="mt-3">
            <ImportWarnings warnings={importResult.warnings} />
          </div>
        )}
      </div>
    </div>
  );
}

function ImportWarnings({ warnings }: { warnings: string[] }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-draft-bg border border-draft-border rounded-lg">
      <AlertCircle className="h-5 w-5 text-draft shrink-0 mt-0.5" />
      <ul className="flex-1 text-sm text-ink space-y-1">
        {warnings.map((warning, idx) => (
          <li key={idx}>{warning}</li>
        ))}
      </ul>
    </div>
  );
}

function UseOnlyNote() {
  const useOnly = useDeviceStore((state) => state.useOnly);
  return (
    <p className="text-sm text-ink-muted">
      {useOnly
        ? 'Use-only mode is on in this browser: Calculators and Quotes are shown, building and the catalog pages are hidden. Switch it off in Settings if needed.'
        : 'Use-only mode is off in this browser. It can be switched on in Settings.'}
    </p>
  );
}

// Confirms loading a calculator pack: what it holds, how it compares with the pack already
// loaded, which calculators it removes, and whether to turn on use-only mode.
function PackConfirm({
  pack,
  onCancel,
  onLoad,
}: {
  pack: ExportedData;
  onCancel: () => void;
  onLoad: (pack: ExportedData, turnOnUseOnly: boolean) => void;
}) {
  const loadedPack = useDeviceStore((state) => state.loadedPack);
  const alreadyUseOnly = useDeviceStore((state) => state.useOnly);
  const current = useCalculatorsStore((state) => state.calculators);
  const [turnOnUseOnly, setTurnOnUseOnly] = useState(true);
  const useOnlyId = useId();

  const calculators = pack.calculators ?? [];
  const removed = calculatorsNotInPack(current, pack);
  const comparison = comparePackDates(pack.exportedAt, loadedPack);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <Package className="h-5 w-5 text-ink-muted shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-ink">Calculator pack from {formatPackDate(pack.exportedAt)}</h3>
          <p className="mt-1 text-sm text-ink-body">
            {calculators.length} calculator{calculators.length !== 1 ? 's' : ''}
            {calculators.length > 0 && `: ${calculators.map((calculator) => calculator.name).join(', ')}`}
          </p>
        </div>
      </div>

      {loadedPack && comparison === 'older' && (
        <div role="alert" className="flex items-start gap-3 p-3 bg-draft-bg border border-draft-border rounded-lg">
          <AlertCircle className="h-5 w-5 text-draft shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-ink">
            This pack is older than the one this device has (from {formatPackDate(loadedPack.exportedAt)}). Loading it
            goes back to the older calculators and prices.
          </p>
        </div>
      )}
      {loadedPack && comparison === 'same' && (
        <p className="text-sm text-ink-muted">This device already has this pack. Loading it again puts it back as it was exported.</p>
      )}
      {loadedPack && comparison === 'newer' && (
        <p className="text-sm text-ink-muted">Replaces the pack from {formatPackDate(loadedPack.exportedAt)}.</p>
      )}

      <div className="text-sm text-ink-body space-y-2">
        <p>
          Loading it replaces the calculators, functions, materials and labor on this device with the pack&apos;s.
          Quotes are kept.
        </p>
        {removed.length > 0 && (
          <p>
            Not in the pack, so removed from this device: {removed.map((calculator) => calculator.name).join(', ')}.
            Quote lines sent from them keep their price but can no longer be edited.
          </p>
        )}
      </div>

      {!alreadyUseOnly && (
        <div className="flex items-start gap-2">
          <input
            id={useOnlyId}
            type="checkbox"
            checked={turnOnUseOnly}
            onChange={(event) => setTurnOnUseOnly(event.target.checked)}
            aria-describedby={`${useOnlyId}-hint`}
            className="h-4 w-4 mt-0.5 rounded-sm accent-action-solid cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
          />
          <div>
            <label htmlFor={useOnlyId} className="text-sm font-medium text-ink cursor-pointer">
              Turn on use-only mode
            </label>
            <p id={`${useOnlyId}-hint`} className="text-xs text-ink-muted">
              For staff devices: shows Calculators and Quotes, and hides building calculators and the Functions,
              Materials and Labor pages in this browser. It&apos;s a convenience, not a lock: anyone can switch it
              off in Settings.
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onLoad(pack, !alreadyUseOnly && turnOnUseOnly)}>Load pack</Button>
      </div>
    </div>
  );
}
