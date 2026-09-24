'use client';

import { useState } from 'react';
import { Download, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AlertBanner } from '@/components/shared/AlertBanner';
import { ModulePickerCard } from '@/components/shared/ModulePickerCard';
import { QuoteSummaryCard } from '@/components/quotes/QuoteSummaryCard';
import { SaveTemplateModal } from '@/components/quotes/SaveTemplateModal';
import { WorkspaceModulesManager } from '@/components/quotes/WorkspaceModulesManager';
import type { QuoteBuilderState } from '@/components/quotes/useQuoteBuilderState';
import { formatEditedAt } from '@/lib/quotes/quote-board';
import type { CalculationModule, ModuleTemplate, Quote } from '@/lib/types';

interface QuoteBuilderWorkspaceProps {
  quote: Quote;
  modules: CalculationModule[];
  templates: ModuleTemplate[];
  builder: QuoteBuilderState;
}

// Mockup 2a: the workspace bench (drafts, not in the total) beside the sealed quote.
export function QuoteBuilderWorkspace({
  quote,
  modules,
  templates,
  builder,
}: QuoteBuilderWorkspaceProps) {
  const [pickerSection, setPickerSection] = useState<'all' | 'templates'>('all');
  const itemCount = quote.lineItems.length;

  const openPicker = (section: 'all' | 'templates') => {
    setPickerSection(section);
    builder.setShowAddModule(true);
  };

  return (
    <>
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={builder.formData.name}
            onChange={(event) => builder.handleFormDataChange({ name: event.target.value })}
            aria-label="Quote name"
            placeholder="Untitled quote"
            className="w-full max-w-xl -mx-1.5 px-1.5 rounded-md bg-transparent border border-transparent text-2xl font-bold tracking-tight text-ink placeholder:text-ink-subtle hover:border-border focus:outline-none focus:border-action focus:ring-[3px] focus:ring-action/20"
          />
          <p className="text-xs text-ink-muted">
            {itemCount} {itemCount === 1 ? 'line item' : 'line items'} ·{' '}
            <span className="font-numeric">edited {formatEditedAt(quote.updatedAt)}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={builder.openSaveTemplateModal}
            disabled={quote.workspaceModules.length === 0}
            title={quote.workspaceModules.length === 0 ? 'Add drafts to the workspace to save them as a template' : undefined}
          >
            Save as template
          </Button>
          <Button variant="secondary" size="sm" onClick={builder.handleExport}>
            <Download className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Export JSON
          </Button>
          <Button variant="secondary" size="sm" onClick={() => builder.saveQuote()}>
            <Save className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Save quote
          </Button>
        </div>
      </div>

      <AlertBanner
        variant="warning"
        title={`Template applied with ${builder.templateWarnings.length} ${builder.templateWarnings.length === 1 ? 'warning' : 'warnings'}`}
        messages={builder.templateWarnings}
        isVisible={builder.templateWarnings.length > 0}
        onDismiss={() => builder.setTemplateWarnings([])}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-[18px] items-start pb-10">
        <WorkspaceModulesManager
          quote={quote}
          modules={modules}
          collapsedModules={builder.collapsedModules}
          onToggleCollapse={builder.toggleModuleCollapse}
          onRemoveModule={builder.removeWorkspaceModule}
          onDuplicateModule={builder.duplicateWorkspaceModule}
          onNicknameChange={builder.updateWorkspaceModuleNickname}
          onAddLineItem={builder.handleAddLineItem}
          onReorder={builder.handleReorder}
          renderFieldInput={builder.renderFieldInput}
          onAddModule={() => openPicker('all')}
          onAddFromTemplate={() => openPicker('templates')}
          picker={
            builder.showAddModule ? (
              <ModulePickerCard
                title={pickerSection === 'templates' ? 'Start from a template' : 'Add to the workspace'}
                show
                section={pickerSection}
                allCategories={builder.allCategories}
                selectedCategory={builder.selectedCategory}
                onSelectCategory={builder.setSelectedCategory}
                filteredModules={builder.filteredModules}
                filteredTemplates={builder.filteredTemplates}
                modulesCount={modules.length}
                templatesCount={templates.length}
                onAddModule={builder.handleAddModule}
                onApplyTemplate={builder.handleApplyTemplate}
                onClose={() => builder.setShowAddModule(false)}
              />
            ) : undefined
          }
        />

        <QuoteSummaryCard
          quote={quote}
          formData={builder.formData}
          onFormDataChange={builder.handleFormDataChange}
          removeLineItem={builder.removeLineItem}
          reopenLineItem={builder.reopenLineItem}
          canReopenLineItem={builder.canReopenLineItem}
          onExport={builder.handleExportPDF}
        />
      </div>

      <SaveTemplateModal
        isOpen={builder.showSaveTemplateModal}
        templateName={builder.templateName}
        templateDescription={builder.templateDescription}
        onTemplateNameChange={builder.setTemplateName}
        onTemplateDescriptionChange={builder.setTemplateDescription}
        onClose={builder.closeSaveTemplateModal}
        onSave={builder.handleSaveTemplate}
      />
    </>
  );
}
