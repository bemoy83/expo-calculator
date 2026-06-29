import type {
  CalculationModule,
  FieldLink,
  ModuleTemplate,
  Quote,
  QuoteModuleInstance,
} from '../types';

export function createTemplateDataFromQuote(input: {
  quote: Quote;
  getModule: (id: string) => CalculationModule | undefined;
  name: string;
  description?: string;
}): Omit<ModuleTemplate, 'id' | 'createdAt' | 'updatedAt'> | null {
  if (input.quote.workspaceModules.length === 0) return null;

  const moduleInstances = input.quote.workspaceModules.map((instance) => ({
    id: instance.id,
    moduleId: instance.moduleId,
    fieldValues: { ...instance.fieldValues },
    fieldLinks: instance.fieldLinks && Object.keys(instance.fieldLinks).length > 0
      ? { ...instance.fieldLinks }
      : undefined,
  }));

  const categories = Array.from(new Set(
    input.quote.workspaceModules
      .map((instance) => input.getModule(instance.moduleId)?.category)
      .filter(Boolean) as string[]
  ));

  return {
    name: input.name,
    description: input.description,
    moduleInstances,
    categories,
    createdFromQuoteId: input.quote.id,
  };
}

export function resolveTemplateLinkTargetIndex(
  template: ModuleTemplate,
  link: FieldLink
): { targetIndex?: number; warning?: string } {
  if (link.moduleInstanceId.startsWith('__index_')) {
    const indexStr = link.moduleInstanceId.replace('__index_', '').replace('__', '');
    const parsedIndex = parseInt(indexStr, 10);
    if (isNaN(parsedIndex)) {
      return { warning: 'invalid index format' };
    }
    return { targetIndex: parsedIndex };
  }

  const targetTemplateIndex = template.moduleInstances.findIndex(
    (instance) => instance.id === link.moduleInstanceId
  );
  if (targetTemplateIndex === -1) {
    return { warning: 'target instance not found in template' };
  }

  return { targetIndex: targetTemplateIndex };
}

export function getRestorableTemplateLinks(input: {
  template: ModuleTemplate;
  workspaceModules: QuoteModuleInstance[];
  instanceMap: Map<number, string>;
  getModule: (id: string) => CalculationModule | undefined;
  canLink: (
    sourceInstanceId: string,
    fieldName: string,
    targetInstanceId: string,
    targetFieldName: string
  ) => { valid: boolean; error?: string };
}): {
  links: Array<{
    sourceInstanceId: string;
    fieldName: string;
    targetInstanceId: string;
    targetFieldName: string;
  }>;
  warnings: string[];
} {
  const links: Array<{
    sourceInstanceId: string;
    fieldName: string;
    targetInstanceId: string;
    targetFieldName: string;
  }> = [];
  const warnings: string[] = [];

  input.template.moduleInstances.forEach((templateInstance, sourceIndex) => {
    const sourceInstanceId = input.instanceMap.get(sourceIndex);
    if (!sourceInstanceId || !templateInstance.fieldLinks) return;

    const sourceInstance = input.workspaceModules.find((instance) => instance.id === sourceInstanceId);
    if (!sourceInstance) return;

    Object.entries(templateInstance.fieldLinks).forEach(([fieldName, link]) => {
      const { targetIndex, warning } = resolveTemplateLinkTargetIndex(input.template, link);
      if (warning) {
        warnings.push(`Link from "${fieldName}" could not be restored: ${warning}`);
        return;
      }

      if (targetIndex === undefined || targetIndex < 0 || targetIndex >= input.template.moduleInstances.length) {
        warnings.push(`Link from "${fieldName}" could not be restored: invalid target index`);
        return;
      }

      const targetInstanceId = input.instanceMap.get(targetIndex);
      if (!targetInstanceId) {
        warnings.push(`Link from "${fieldName}" could not be restored: target module was not added`);
        return;
      }

      const sourceModule = input.getModule(templateInstance.moduleId);
      if (!sourceModule) return;

      const sourceField = sourceModule.fields.find((field) => field.variableName === fieldName);
      if (!sourceField) return;

      const targetInstance = input.workspaceModules.find((instance) => instance.id === targetInstanceId);
      if (!targetInstance) return;

      const targetModule = input.getModule(targetInstance.moduleId);
      if (!targetModule) return;

      const targetField = targetModule.fields.find((field) => field.variableName === link.fieldVariableName);
      if (!targetField) {
        warnings.push(`Link from "${fieldName}" could not be restored: target field "${link.fieldVariableName}" not found`);
        return;
      }

      const canLink = input.canLink(sourceInstanceId, fieldName, targetInstanceId, link.fieldVariableName);
      if (!canLink.valid) {
        warnings.push(`Link from "${fieldName}" could not be restored: ${canLink.error || 'incompatible types'}`);
        return;
      }

      links.push({
        sourceInstanceId,
        fieldName,
        targetInstanceId,
        targetFieldName: link.fieldVariableName,
      });
    });
  });

  return { links, warnings };
}
