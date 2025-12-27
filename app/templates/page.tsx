'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTemplatesStore } from '@/lib/stores/templates-store';
import { useModulesStore } from '@/lib/stores/modules-store';
import { Trash2, FileText, Copy, CheckCircle2, Plus } from 'lucide-react';

export default function TemplatesPage() {
  // ⚠️ ALL HOOKS MUST BE CALLED UNCONDITIONALLY ⚠️
  // Call all hooks before any conditional returns to ensure hooks order stability
  const templates = useTemplatesStore((state) => state.templates);
  const deleteTemplate = useTemplatesStore((state) => state.deleteTemplate);
  const addTemplate = useTemplatesStore((state) => state.addTemplate);
  const getTemplate = useTemplatesStore((state) => state.getTemplate);
  const getModule = useModulesStore((state) => state.getModule);
  const router = useRouter();

  // ⭐ Prevent hydration mismatch
  const [hydrated, setHydrated] = useState(false);
  // Success toast state
  const [duplicateSuccessMessage, setDuplicateSuccessMessage] = useState<string | null>(null);

  useEffect(() => setHydrated(true), []);

  // Prevent hydration mismatch - return null until client mount
  // This must be AFTER all hooks are called
  if (!hydrated) return null;

  // Helper to generate unique template name
  const generateUniqueTemplateName = (baseName: string): string => {
    const existingNames = templates.map(t => t.name.toLowerCase());
    
    // Check if base name is unique
    if (!existingNames.includes(baseName.toLowerCase())) {
      return baseName;
    }
    
    // Try " (Copy)"
    let candidate = `${baseName} (Copy)`;
    if (!existingNames.includes(candidate.toLowerCase())) {
      return candidate;
    }
    
    // Try " (Copy 2)", " (Copy 3)", etc.
    let counter = 2;
    do {
      candidate = `${baseName} (Copy ${counter})`;
      counter++;
    } while (existingNames.includes(candidate.toLowerCase()));
    
    return candidate;
  };

  const handleDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete template "${name}"?`)) {
      deleteTemplate(id);
    }
  };

  const handleCreateTemplate = () => {
    const store = useTemplatesStore.getState();
    
    const newTemplate = store.addTemplate({
      name: 'New Template',
      description: undefined,
      moduleInstances: [],
      categories: [],
    });

    router.push(`/templates/editor?id=${newTemplate.id}`);
  };

  const handleDuplicate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const template = getTemplate(id);
    if (!template) return;

    // Generate unique name
    const uniqueName = generateUniqueTemplateName(template.name);

    // Create duplicate and get the new template immediately
    const store = useTemplatesStore.getState();
    const newTemplate = store.addTemplate({
      name: uniqueName,
      description: template.description,
      moduleInstances: template.moduleInstances,
      categories: template.categories,
    });

    // Show success message
    setDuplicateSuccessMessage(uniqueName);
    setTimeout(() => setDuplicateSuccessMessage(null), 3000);

    // Navigate to new template editor immediately
    router.push(`/templates/editor?id=${newTemplate.id}`);
  };

  const handleCardClick = (id: string) => {
    router.push(`/templates/editor?id=${id}`);
  };

  return (
    <Layout>
      {/* Duplicate Success Toast */}
      {duplicateSuccessMessage && (
        <div className="fixed bottom-24 right-4 z-50">
          <Card className="bg-success/10 border-success/30">
            <div className="flex items-center gap-2 p-3">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              <p className="text-sm text-success">
                Template &apos;{duplicateSuccessMessage}&apos; created successfully
              </p>
            </div>
          </Card>
        </div>
      )}

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-md-on-surface mb-2 tracking-tight">
            Templates
          </h1>
          <p className="text-lg text-md-on-surface-variant">
            Manage reusable module combinations and field links
          </p>
        </div>
        <Button onClick={handleCreateTemplate} className="rounded-full">
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <div className="text-center py-24">
            <div
              className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-md-surface-variant elevation-4 mb-6"
              aria-hidden="true"
            >
              <FileText className="h-12 w-12 text-md-on-surface-variant" />
            </div>
            <h3 className="text-xl font-bold text-md-on-surface mb-3 tracking-tight">
              No Templates Yet
            </h3>
            <p className="text-base text-md-on-surface-variant mb-8 max-w-md mx-auto leading-relaxed">
              Create templates from your Quote Builder workspace to save module combinations and field links for reuse.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => {
            const moduleNames: string[] = [];
            const moduleCount = template.moduleInstances.length;

            template.moduleInstances.forEach((instance) => {
              const moduleDef = getModule(instance.moduleId);
              if (moduleDef) moduleNames.push(moduleDef.name);
            });

            const visibleModules = moduleNames.slice(0, 6);
            const remainingCount = moduleNames.length - 6;

            return (
              <div
                key={template.id}
                className="hover:border-accent/30 transition-smooth cursor-pointer group relative"
                onClick={() => handleCardClick(template.id)}
              >
                <Card className="h-full hover:border-accent/30">
                  <button
                    type="button"
                    onClick={(e) => handleDuplicate(template.id, e)}
                    className="absolute top-4 right-12 p-2 text-md-on-surface-variant hover:text-md-primary hover:bg-md-primary/10 rounded-lg transition-smooth active:scale-95 z-10"
                    aria-label="Duplicate template"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(template.id, template.name, e)}
                    className="absolute top-4 right-4 p-2 text-md-on-surface-variant hover:text-destructive hover:bg-md-error/10 rounded-lg transition-smooth active:scale-95 z-10"
                    aria-label="Delete template"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <h3 className="text-lg font-bold text-md-on-surface mb-3 group-hover:text-md-primary transition-smooth tracking-tight pr-20">
                    {template.name}
                  </h3>

                  {template.description && (
                    <p className="text-sm text-md-on-surface-variant mb-4 line-clamp-2">
                      {template.description}
                    </p>
                  )}

                  {template.categories?.length > 0 && (
                    <div className="mb-4">
                      {template.categories.map((category) => (
                        <span
                          key={category}
                          className="px-3 py-1 bg-md-primary/10 text-md-primary text-xs font-medium rounded-full mr-2 mb-2 inline-block"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mb-5">
                    <p className="text-xs text-md-on-surface-variant uppercase tracking-wide mb-2">
                      Modules
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {visibleModules.map((name) => (
                        <span
                          key={name}
                          className="px-2.5 py-1 bg-md-surface-variant text-md-on-surface-variant rounded-full text-xs"
                        >
                          {name}
                        </span>
                      ))}
                      {remainingCount > 0 && (
                        <span className="px-2.5 py-1 bg-md-surface-variant text-md-on-surface-variant rounded-full text-xs">
                          + {remainingCount} more
                        </span>
                      )}
                      {moduleNames.length === 0 && (
                        <span className="px-2.5 py-1 bg-md-error/10 text-destructive rounded-full text-xs">
                          No modules found
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-md-on-surface-variant">
                    {moduleCount} {moduleCount === 1 ? 'module' : 'modules'}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
