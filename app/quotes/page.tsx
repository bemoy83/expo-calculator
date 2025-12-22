'use client';

import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { useQuotesStore } from '@/lib/stores/quotes-store';
import { useModulesStore } from '@/lib/stores/modules-store';
import { useMaterialsStore } from '@/lib/stores/materials-store';
import { QuoteModuleInstance, FieldType } from '@/lib/types';
import { Plus, X, Download, Send, Trash2, Save, Package, Calculator, LayoutDashboard } from 'lucide-react';

export default function QuotesPage() {
  const modules = useModulesStore((state) => state.modules);
  const materials = useMaterialsStore((state) => state.materials);
  const currentQuote = useQuotesStore((state) => state.currentQuote);
  const createQuote = useQuotesStore((state) => state.createQuote);
  const updateCurrentQuote = useQuotesStore((state) => state.updateCurrentQuote);
  const addWorkspaceModule = useQuotesStore((state) => state.addWorkspaceModule);
  const removeWorkspaceModule = useQuotesStore((state) => state.removeWorkspaceModule);
  const updateWorkspaceModuleFieldValue = useQuotesStore((state) => state.updateWorkspaceModuleFieldValue);
  const addLineItem = useQuotesStore((state) => state.addLineItem);
  const removeLineItem = useQuotesStore((state) => state.removeLineItem);
  const setTaxRate = useQuotesStore((state) => state.setTaxRate);
  const setMarkupPercent = useQuotesStore((state) => state.setMarkupPercent);
  const saveQuote = useQuotesStore((state) => state.saveQuote);

  const [quoteName, setQuoteName] = useState('New Quote');
  const [showAddModule, setShowAddModule] = useState(false);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!currentQuote) {
      createQuote('New Quote');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentQuote) {
      setQuoteName(currentQuote.name);
    }
  }, [currentQuote?.id]); // Only update when quote ID changes

  const handleQuoteNameChange = (name: string) => {
    setQuoteName(name);
    if (currentQuote) {
      updateCurrentQuote({ name });
    }
  };

  const handleAddModule = (moduleId: string) => {
    addWorkspaceModule(moduleId);
    setShowAddModule(false);
  };

  // Helper to format label with unit
  const formatLabel = (label: string, unit?: string) => {
    return unit ? `${label} (${unit})` : label;
  };

  const renderFieldInput = (
    instance: QuoteModuleInstance,
    field: { id: string; label: string; type: FieldType; variableName: string; options?: string[]; required?: boolean; materialCategory?: string; unit?: string }
  ) => {
    const value = instance.fieldValues[field.variableName];
    const module = modules.find((m) => m.id === instance.moduleId);

    switch (field.type) {
      case 'number':
        return (
          <Input
            label={formatLabel(field.label, field.unit)}
            type="number"
            value={value?.toString() || ''}
            onChange={(e) =>
              updateWorkspaceModuleFieldValue(instance.id, field.variableName, Number(e.target.value) || 0)
            }
            required={field.required}
          />
        );
      case 'boolean':
        return (
          <Checkbox
            label={formatLabel(field.label, field.unit)}
            checked={Boolean(value)}
            onChange={(e) =>
              updateWorkspaceModuleFieldValue(instance.id, field.variableName, e.target.checked)
            }
          />
        );
      case 'dropdown':
        return (
          <Select
            label={formatLabel(field.label, field.unit)}
            value={value?.toString() || ''}
            onChange={(e) =>
              updateWorkspaceModuleFieldValue(instance.id, field.variableName, e.target.value)
            }
            options={[
              { value: '', label: 'Select...' },
              ...(field.options || []).map((opt) => ({ value: opt, label: opt })),
            ]}
          />
        );
      case 'material':
        // Material picker: show materials with display name, price, and unit
        // Filter by materialCategory if specified on the field
        // materialCategory allows module authors to limit material choices to a specific category
        // (e.g., only "Lumber" materials for a framing module)
        const materialCategory = field.materialCategory;
        let availableMaterials = materials;
        
        if (materialCategory && materialCategory.trim()) {
          availableMaterials = materials.filter((mat) => mat.category === materialCategory);
        }
        
        // Sort materials alphabetically
        const sortedMaterials = availableMaterials.sort((a, b) => a.name.localeCompare(b.name));
        
        return (
          <div>
            <Select
              label={formatLabel(field.label, field.unit)}
              value={value?.toString() || ''}
              onChange={(e) =>
                updateWorkspaceModuleFieldValue(instance.id, field.variableName, e.target.value)
              }
              options={[
                { value: '', label: 'Select a material...' },
                ...sortedMaterials.map((mat) => ({
                  value: mat.variableName,
                  label: `${mat.name} - $${mat.price.toFixed(2)}/${mat.unit}`,
                })),
              ]}
            />
            {materialCategory && sortedMaterials.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                No materials available in category &quot;{materialCategory}&quot;. Please add materials or adjust the field&apos;s category.
              </p>
            )}
          </div>
        );
      case 'text':
        return (
          <Input
            label={formatLabel(field.label, field.unit)}
            value={value?.toString() || ''}
            onChange={(e) =>
              updateWorkspaceModuleFieldValue(instance.id, field.variableName, e.target.value)
            }
            required={field.required}
          />
        );
      default:
        return null;
    }
  };

  const handleExport = () => {
    if (!currentQuote) return;

    const module = useModulesStore.getState();
    const quoteData = {
      quote: {
        name: currentQuote.name,
        createdAt: currentQuote.createdAt,
        lineItems: currentQuote.lineItems.map((item) => ({
          moduleName: item.moduleName,
          fields: Object.entries(item.fieldValues).map(([key, value]) => {
            const mod = module.getModule(item.moduleId);
            const field = mod?.fields.find((f) => f.variableName === key);
            return {
              label: field?.label || key,
              value: value,
            };
          }),
          cost: item.cost,
        })),
        subtotal: currentQuote.subtotal,
        markupPercent: currentQuote.markupPercent || 0,
        markupAmount: currentQuote.markupAmount || 0,
        taxRate: currentQuote.taxRate * 100,
        taxAmount: currentQuote.taxAmount,
        total: currentQuote.total,
      },
    };

    const blob = new Blob([JSON.stringify(quoteData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentQuote.name.replace(/\s+/g, '_')}_quote.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (!currentQuote) return;

    const module = useModulesStore.getState();
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quote: ${currentQuote.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          h1 { color: #1a1a1a; border-bottom: 2px solid #333; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .total-row { font-weight: bold; background-color: #f9f9f9; }
          .right-align { text-align: right; }
        </style>
      </head>
      <body>
        <h1>${currentQuote.name}</h1>
        <p><strong>Date:</strong> ${new Date(currentQuote.createdAt).toLocaleDateString()}</p>
        <table>
          <thead>
            <tr>
              <th>Module</th>
              <th>Details</th>
              <th class="right-align">Cost</th>
            </tr>
          </thead>
          <tbody>
    `;

    currentQuote.lineItems.forEach((item) => {
      html += `
        <tr>
          <td>${item.moduleName}</td>
          <td>${item.fieldSummary}</td>
          <td class="right-align">$${item.cost.toFixed(2)}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" class="right-align"><strong>Subtotal:</strong></td>
              <td class="right-align">$${currentQuote.subtotal.toFixed(2)}</td>
            </tr>
    `;
    
    if (currentQuote.markupPercent > 0) {
      html += `
            <tr>
              <td colspan="2" class="right-align"><strong>Markup (${currentQuote.markupPercent.toFixed(1)}%):</strong></td>
              <td class="right-align">$${(currentQuote.markupAmount || 0).toFixed(2)}</td>
            </tr>
      `;
    }
    
    html += `
            <tr>
              <td colspan="2" class="right-align"><strong>Tax (${(currentQuote.taxRate * 100).toFixed(1)}%):</strong></td>
              <td class="right-align">$${currentQuote.taxAmount.toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td colspan="2" class="right-align"><strong>Total:</strong></td>
              <td class="right-align"><strong>$${currentQuote.total.toFixed(2)}</strong></td>
            </tr>
          </tfoot>
        </table>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (!currentQuote) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Calculator className="h-8 w-8 text-muted-foreground animate-pulse" />
            </div>
            <p className="text-muted-foreground">Loading quote builder...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">Quote Builder</h1>
          <p className="text-lg text-muted-foreground">Build comprehensive construction cost estimates</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => saveQuote()} className="rounded-full">
            <Save className="h-4 w-4 mr-2" />
            Save Quote
          </Button>
          <Button variant="secondary" onClick={handleExport} className="rounded-full">
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          <Button variant="secondary" onClick={handleExportPDF} className="rounded-full">
            <Download className="h-4 w-4 mr-2" />
            Print/PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-24">
        <div className="lg:col-span-2 space-y-5">
          <Card className="shadow-lg">
            <div className="space-y-5">
              <Input
                label="Quote Name"
                value={quoteName}
                onChange={(e) => handleQuoteNameChange(e.target.value)}
              />
              
              <div className="flex items-start sm:items-center justify-between gap-4 pt-5 border-t border-border">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-card-foreground mb-1">Module Workspace</h3>
                  <p className="text-sm text-muted-foreground">Configure modules and add them to your quote</p>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => setShowAddModule(!showAddModule)}
                  className="rounded-full shrink-0"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Module
                </Button>
              </div>

              {showAddModule && (
                <div className="mt-4 p-5 rounded-lg">
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-label-foreground mb-3">
                      Select Module to Add
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {modules.map((module) => (
                        <button
                          key={module.id}
                          onClick={() => handleAddModule(module.id)}
                          className="font-medium rounded-full transition-smooth focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background inline-flex items-center justify-center active:scale-[0.98] bg-accent text-accent-foreground focus:ring-accent shadow-sm hover:shadow-md hover-overlay px-4 py-2 text-base w-full"
                        >
                          <Plus className="h-4 w-4 mr-2 shrink-0" />
                          <span className="truncate">{module.name}</span>
                        </button>
                      ))}
                    </div>
                    {modules.length === 0 && (
                      <div className="text-center py-8">
                        <LayoutDashboard className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <p className="text-sm text-muted-foreground">No modules available.</p>
                        <p className="text-xs text-muted-foreground mt-1">Create modules first to add them to quotes.</p>
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowAddModule(false)} className="rounded-full">
                    Cancel
                  </Button>
                </div>
              )}

              {currentQuote.workspaceModules.length === 0 ? (
                <div className="text-center py-20">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted shadow-sm mb-5">
                    <Package className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h4 className="text-lg font-bold text-foreground mb-2 tracking-tight">No modules in workspace</h4>
                  <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
                    Click "Add Module" to get started, then configure and add them to your quote.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 mt-5">
                  {currentQuote.workspaceModules.map((instance) => {
                    const module = modules.find((m) => m.id === instance.moduleId);
                    if (!module) return null;

                    return (
                      <div key={instance.id} className="bg-card border border-border rounded-xl p-6 shadow-lg transition-smooth group overlay-white">
                        <div className="mb-5">
                          <h4 className="text-base font-semibold text-card-foreground mb-1.5">{module.name}</h4>
                          {module.description && (
                            <p className="text-sm text-muted-foreground">{module.description}</p>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                          {module.fields.map((field) => (
                            <div key={field.id}>
                              {renderFieldInput(instance, field)}
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-5 border-t border-border">
                          <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Module Cost</span>
                          <span className="text-2xl font-bold text-success tabular-nums tracking-tight">
                            ${instance.calculatedCost.toFixed(2)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-5 pt-5 border-t border-border">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              addLineItem(instance.id);
                              setAddedItems(new Set([...addedItems, instance.id]));
                              setTimeout(() => {
                                setAddedItems(new Set());
                              }, 2000);
                            }}
                            className="rounded-full flex-1 sm:flex-initial"
                          >
                            <Plus className="h-4 w-4 mr-1.5" />
                            {addedItems.has(instance.id) ? 'Added!' : 'Add to Quote'}
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => removeWorkspaceModule(instance.id)}
                            className="rounded-full"
                          >
                            <Trash2 className="h-4 w-4 mr-1.5" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-16 z-40 shadow-xl">
            <h3 className="text-lg font-bold text-card-foreground mb-5 tracking-tight">Quote Summary</h3>
            
            <div className="space-y-5">
              {/* Financial Breakdown */}
              <div className="space-y-3">
                {/* Subtotal Row */}
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm text-label-foreground shrink-0">Subtotal</label>
                  <div className="w-20 shrink-0 text-right">
                    <span className="font-semibold text-card-foreground tabular-nums text-sm">
                      ${currentQuote.subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Markup % Input */}
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm text-label-foreground shrink-0">Markup (%)</label>
                  <div className="w-20 shrink-0">
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={Math.round(currentQuote.markupPercent ?? 0).toString()}
                      onChange={(e) => {
                        const percent = Math.round(Number(e.target.value) || 0);
                        setMarkupPercent(Math.max(0, percent));
                      }}
                      className="w-full text-right"
                    />
                  </div>
                </div>

                {/* Markup Amount Display (only if markup > 0) */}
                {(currentQuote.markupPercent ?? 0) > 0 && (
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm text-label-foreground shrink-0">Markup</label>
                    <div className="w-20 shrink-0 text-right">
                      <span className="font-semibold text-card-foreground tabular-nums text-sm">
                        ${(currentQuote.markupAmount ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Tax Rate % Input */}
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm text-label-foreground shrink-0">Tax Rate (%)</label>
                  <div className="w-20 shrink-0">
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={Math.round(currentQuote.taxRate * 100).toString()}
                      onChange={(e) => {
                        const rate = Math.round(Number(e.target.value) || 0) / 100;
                        setTaxRate(Math.max(0, Math.min(1, rate)));
                      }}
                      className="w-full text-right"
                    />
                  </div>
                </div>

                {/* Tax Amount Display */}
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm text-label-foreground shrink-0">Tax</label>
                  <div className="w-20 shrink-0 text-right">
                    <span className="font-semibold text-card-foreground tabular-nums text-sm">
                      ${currentQuote.taxAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="pt-4 border-t border-border">
                <div className="flex justify-between items-baseline p-4 -mx-2">
                  <span className="text-base font-bold text-card-foreground">Total</span>
                  <span className="text-3xl font-bold text-accent tabular-nums tracking-tight">
                    ${currentQuote.total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Line Items */}
              <div className="pt-5 border-t border-border">
                <h4 className="text-sm font-semibold text-card-foreground mb-3">Line Items</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                  {currentQuote.lineItems.map((item) => (
                    <div
                      key={item.id}
                      className="group flex items-start justify-between gap-3 p-3 bg-muted/30 hover:bg-muted/50 rounded-lg transition-smooth hover:shadow-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-card-foreground text-sm mb-0.5 truncate">
                          {item.moduleName}
                        </div>
                        <div className="text-muted-foreground text-xs truncate">
                          {item.fieldSummary}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold text-card-foreground text-sm tabular-nums">
                          ${item.cost.toFixed(2)}
                        </span>
                        <button
                          onClick={() => removeLineItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-destructive/10 rounded-md text-destructive"
                          title="Remove item"
                          aria-label={`Remove line item: ${item.moduleName}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {currentQuote.lineItems.length === 0 && (
                    <div className="text-center py-8">
                      <Calculator className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                      <p className="text-xs text-muted-foreground">
                        No items in quote yet.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Configure modules and click "Add to Quote"
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-5 border-t border-border">
                <Button
                  variant="primary"
                  className="w-full rounded-full"
                  onClick={() => {
                    alert('Send Quote functionality would integrate with your email/CRM system.');
                  }}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Quote
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
