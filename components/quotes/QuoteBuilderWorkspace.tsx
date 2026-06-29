'use client';

import { Download, Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AlertBanner } from '@/components/shared/AlertBanner';
import { EditorActionBar } from '@/components/shared/EditorActionBar';
import { ModulePickerCard } from '@/components/shared/ModulePickerCard';
import { NotificationToast } from '@/components/shared/NotificationToast';
import { PageHeader } from '@/components/shared/PageHeader';
import { QuoteDetailsCard } from '@/components/quotes/QuoteDetailsCard';
import { QuoteSummaryCard } from '@/components/quotes/QuoteSummaryCard';
import { SaveTemplateModal } from '@/components/quotes/SaveTemplateModal';
import { WorkspaceModulesManager } from '@/components/quotes/WorkspaceModulesManager';
import type { QuoteBuilderState } from '@/components/quotes/useQuoteBuilderState';
import type { CalculationModule, ModuleTemplate, Quote } from '@/lib/types';

interface QuoteBuilderWorkspaceProps {
  quote: Quote;
  modules: CalculationModule[];
  templates: ModuleTemplate[];
  builder: QuoteBuilderState;
}

export function QuoteBuilderWorkspace({
  quote,
  modules,
  templates,
  builder,
}: QuoteBuilderWorkspaceProps) {
  return (
    <>
      <PageHeader
        title="Quote Builder"
        subtitle="Build comprehensive construction cost estimates"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => builder.saveQuote()} className="rounded-full">
              <Save className="h-4 w-4 mr-2" />
              Save Quote
            </Button>
            <Button variant="secondary" onClick={builder.handleExport} className="rounded-full">
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
            <Button variant="secondary" onClick={builder.handleExportPDF} className="rounded-full">
              <Download className="h-4 w-4 mr-2" />
              Print/PDF
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 pb-24">
        <div className="lg:col-span-3 space-y-5">
          <QuoteDetailsCard
            formData={builder.formData}
            errors={builder.errors}
            onFormDataChange={builder.handleFormDataChange}
          />

          <AlertBanner
            variant="warning"
            title={`Template applied with ${builder.templateWarnings.length} warning(s):`}
            messages={builder.templateWarnings}
            isVisible={builder.templateWarnings.length > 0}
            onDismiss={() => builder.setTemplateWarnings([])}
          />

          {builder.showAddModule && (
            <ModulePickerCard
              show={builder.showAddModule}
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
          )}

          {!builder.showAddModule && quote.workspaceModules.length === 0 && (
            <Card>
              <div className="text-center py-6">
                <p className="text-sm text-md-on-surface-variant mb-3">
                  Add calculation modules to build your quote. Your workspace is where you configure modules before adding them to the quote.
                </p>
                <Button size="sm" onClick={() => builder.setShowAddModule(true)} className="rounded-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Module
                </Button>
              </div>
            </Card>
          )}

          {!builder.showAddModule && quote.workspaceModules.length > 0 && (
            <Card>
              <Button
                onClick={() => builder.setShowAddModule(true)}
                className="rounded-full w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Module
              </Button>
            </Card>
          )}

          {quote.workspaceModules.length > 0 && (
            <WorkspaceModulesManager
              modules={modules}
              workspaceModules={quote.workspaceModules}
              collapsedModules={builder.collapsedModules}
              onToggleCollapse={builder.toggleModuleCollapse}
              onRemoveModule={builder.removeWorkspaceModule}
              onAddLineItem={builder.handleAddLineItem}
              addedItems={builder.addedItems}
              onReorder={builder.handleReorder}
              renderFieldInput={builder.renderFieldInput}
            />
          )}
        </div>

        <div className="lg:col-span-2">
          <QuoteSummaryCard
            quote={quote}
            setMarkupPercent={builder.setMarkupPercent}
            setTaxRate={builder.setTaxRate}
            removeLineItem={builder.removeLineItem}
          />
        </div>
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

      <NotificationToast
        message={`Template '${builder.templateSaveSuccess}' saved successfully`}
        variant="success"
        isVisible={!!builder.templateSaveSuccess}
        onDismiss={() => builder.setTemplateSaveSuccess(null)}
        autoHideDuration={3000}
      />

      <EditorActionBar justifyContent="end">
        <Button
          onClick={builder.openSaveTemplateModal}
          className="rounded-full"
          disabled={quote.workspaceModules.length === 0}
          variant="secondary"
        >
          <Save className="h-4 w-4 mr-2" />
          Save as Template
        </Button>
        <Button
          onClick={() => builder.setShowAddModule(true)}
          className="rounded-full"
          disabled={builder.showAddModule}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Module
        </Button>
      </EditorActionBar>
    </>
  );
}
