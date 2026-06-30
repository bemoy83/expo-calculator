import { calculateQuoteTotals } from '../calculations/money';
import { filterQuoteBuilderCatalog } from '../../components/quotes/quote-builder/catalog-filter';
import {
  buildQuoteExportData,
  buildQuotePrintHtml,
  getQuoteExportFileName,
} from '../quotes/export';
import { buildQuoteLineItem } from '../quotes/line-item-builder';
import { buildLineItemSummaries } from '../quotes/line-item-summary';
import { getDefaultQuoteFieldValues } from '../quotes/workspace-actions';
import { getInitialFieldValue, resolveFieldValuesWithDefaults } from '../field-defaults';
import { applyTemplateToQuoteWorkspace } from '../quotes/template-application';
import { getRestorableTemplateLinks } from '../quotes/template-helpers';
import {
  addQuoteWorkspaceModule,
  getDefaultQuoteFieldValues,
  linkQuoteWorkspaceField,
  recalculateQuoteWorkspace,
  removeQuoteWorkspaceModule,
  reorderQuoteWorkspaceModules,
  unlinkQuoteWorkspaceField,
  updateQuoteWorkspaceFieldValue,
} from '../quotes/workspace-actions';
import { recalculateWorkspaceModuleInstances } from '../quotes/workspace-recalculation';
import type { CalculationModule, ModuleTemplate, Quote, QuoteLineItem } from '../types';
import { canLinkFields, resolveFieldLinksWithMetadata } from '../utils/field-linking';
import { quoteInstances, quoteModules, templateLabor, templateMaterials } from './fixtures';
import { assert, assertCheck } from './test-helpers';

console.log('\n=== Quote Totals Regression ===');
const lineItems: QuoteLineItem[] = [
  {
    id: 'li-1',
    moduleId: 'm-1',
    moduleName: 'Module 1',
    fieldValues: {},
    fieldSummary: '',
    cost: 10.005,
    createdAt: '',
  },
  {
    id: 'li-2',
    moduleId: 'm-2',
    moduleName: 'Module 2',
    fieldValues: {},
    fieldSummary: '',
    cost: 20.005,
    createdAt: '',
  },
];
const totals = calculateQuoteTotals({ lineItems, markupPercent: 10, taxRate: 0.25 });
assert.deepEqual(totals, {
  subtotal: 30.01,
  markupAmount: 3,
  taxAmount: 8.25,
  total: 41.26,
});
console.log(`✓ totals = ${JSON.stringify(totals)}`);

console.log('\n=== Quote Utility Regression ===');
const computedLinkValidation = canLinkFields(
  quoteInstances,
  quoteModules,
  'target-instance',
  'linked_width',
  'source-instance',
  'out.area'
);
assertCheck('validates computed-output field links', computedLinkValidation.valid, computedLinkValidation.error);

const unitMismatchLinkValidation = canLinkFields(
  quoteInstances,
  quoteModules,
  'target-instance',
  'weight',
  'source-instance',
  'out.area'
);
assertCheck(
  'rejects unit-mismatched computed-output links',
  !unitMismatchLinkValidation.valid && !!unitMismatchLinkValidation.error?.includes('length'),
  unitMismatchLinkValidation.error
);

const resolvedQuoteLinks = resolveFieldLinksWithMetadata(quoteInstances);
assertCheck(
  'resolves computed-output links',
  resolvedQuoteLinks.resolvedValues['target-instance'].linked_width === 6 &&
    resolvedQuoteLinks.brokenLinks.length === 0
);

const brokenResolution = resolveFieldLinksWithMetadata([
  {
    ...quoteInstances[1],
    fieldLinks: {
      linked_width: {
        moduleInstanceId: 'missing-instance',
        fieldVariableName: 'width',
      },
    },
  },
]);
assertCheck(
  'reports broken links without throwing',
  brokenResolution.resolvedValues['target-instance'].linked_width === 0 &&
    brokenResolution.brokenLinks.length === 1
);

const recalculatedWorkspace = recalculateWorkspaceModuleInstances({
  workspaceModules: quoteInstances,
  modules: quoteModules,
  materials: [],
  labor: [],
  functions: [],
});
assertCheck(
  'recalculates workspace modules with linked computed outputs',
  recalculatedWorkspace.workspaceModules.find((instance) => instance.id === 'target-instance')?.calculatedCost === 7
);

const lineItemResult = buildQuoteLineItem({
  instance: quoteInstances[0],
  moduleDef: quoteModules[0],
  resolvedFieldValues: { width: 2 },
  materials: [],
  labor: [],
  functions: [],
});
assertCheck(
  'builds quote line item summaries',
  !!lineItemResult.lineItem &&
    lineItemResult.lineItem.primarySummary === 'Area: 6 m' &&
    lineItemResult.lineItem.secondarySummary === 'Width: 2 m'
);

const floatSummary = buildLineItemSummaries({
  moduleDef: {
    ...quoteModules[0],
    computedOutputs: [
      {
        id: 'lumber-count',
        label: 'lumber Count',
        variableName: 'lumber_count',
        expression: 'width * 3',
        unitCategory: 'length',
        unitSymbol: 'm',
        showInQuote: true,
      },
    ],
  },
  resolvedFieldValues: {},
  fieldValuesWithComputed: { 'out.lumber_count': 30.800000000000004 },
  materials: [],
});
assertCheck(
  'formats computed output without float artifacts',
  floatSummary.primarySummary === 'lumber Count: 30.8 m'
);

const textDefaultField = {
  id: 'notes',
  label: 'Notes',
  type: 'text' as const,
  variableName: 'notes',
  defaultValue: 'Standard note',
};
assertCheck(
  'starts text fields empty while keeping configured defaults',
  getInitialFieldValue(textDefaultField) === '' &&
    getDefaultQuoteFieldValues([textDefaultField]).notes === ''
);
assertCheck(
  'resolves empty text fields to configured defaults for calculations',
  resolveFieldValuesWithDefaults([textDefaultField], { notes: '' }).notes === 'Standard note'
);

const templateForLinks: ModuleTemplate = {
  id: 'template',
  name: 'Template',
  moduleInstances: [
    {
      id: 'old-source',
      moduleId: 'source-module',
    },
    {
      id: 'old-target',
      moduleId: 'target-module',
      fieldLinks: {
        linked_width: {
          moduleInstanceId: 'old-source',
          fieldVariableName: 'width',
        },
      },
    },
  ],
  categories: [],
  createdAt: '',
  updatedAt: '',
};
const restorableTemplateLinks = getRestorableTemplateLinks({
  template: templateForLinks,
  workspaceModules: [
    { ...quoteInstances[0], id: 'new-source' },
    { ...quoteInstances[1], id: 'new-target', fieldLinks: undefined },
  ],
  instanceMap: new Map([
    [0, 'new-source'],
    [1, 'new-target'],
  ]),
  getModule: (id) => quoteModules.find((module) => module.id === id),
  canLink: (sourceInstanceId, fieldName, targetInstanceId, targetFieldName) =>
    canLinkFields(
      [
        { ...quoteInstances[0], id: 'new-source' },
        { ...quoteInstances[1], id: 'new-target', fieldLinks: undefined },
      ],
      quoteModules,
      sourceInstanceId,
      fieldName,
      targetInstanceId,
      targetFieldName
    ),
});
assertCheck(
  'maps ID-based template links to new instances',
  restorableTemplateLinks.links.length === 1 &&
    restorableTemplateLinks.links[0].sourceInstanceId === 'new-target' &&
    restorableTemplateLinks.links[0].targetInstanceId === 'new-source'
);

console.log('\n=== Quote Workspace Action Regression ===');
const quoteWorkspaceContext = {
  modules: quoteModules,
  materials: templateMaterials,
  labor: templateLabor,
  functions: [],
};
const allFieldTypesModule: CalculationModule = {
  id: 'all-field-types',
  name: 'All Field Types',
  fields: [
    { id: 'num', label: 'Number', type: 'number', variableName: 'number_value' },
    { id: 'bool', label: 'Boolean', type: 'boolean', variableName: 'enabled' },
    { id: 'drop', label: 'Dropdown', type: 'dropdown', variableName: 'choice' },
    { id: 'text', label: 'Text', type: 'text', variableName: 'note' },
    { id: 'mat', label: 'Material', type: 'material', variableName: 'material' },
    { id: 'labor', label: 'Labor', type: 'labor', variableName: 'labor' },
  ],
  formula: '0',
  createdAt: '',
  updatedAt: '',
};
assert.deepEqual(getDefaultQuoteFieldValues(allFieldTypesModule.fields), {
  number_value: 0,
  enabled: false,
  choice: '',
  note: '',
  material: '',
  labor: '',
});
assertCheck('creates quote workspace defaults for all field types', true);

const addedQuoteWorkspace = addQuoteWorkspaceModule([], quoteWorkspaceContext, 'source-module');
assertCheck(
  'adds quote workspace modules with defaults and recalculates',
  addedQuoteWorkspace.length === 1 &&
    addedQuoteWorkspace[0].fieldValues.width === 0 &&
    addedQuoteWorkspace[0].fieldValues['out.area'] === 0 &&
    addedQuoteWorkspace[0].calculatedCost === 0
);

const updatedQuoteWorkspace = updateQuoteWorkspaceFieldValue(
  addedQuoteWorkspace,
  quoteWorkspaceContext,
  addedQuoteWorkspace[0].id,
  'width',
  5
);
assertCheck(
  'updates quote workspace fields and recalculates',
  updatedQuoteWorkspace[0].fieldValues.width === 5 &&
    updatedQuoteWorkspace[0].fieldValues['out.area'] === 15 &&
    updatedQuoteWorkspace[0].calculatedCost === 10
);

const quoteWorkspaceWithTarget = addQuoteWorkspaceModule(
  updatedQuoteWorkspace,
  quoteWorkspaceContext,
  'target-module'
);
const linkedQuoteWorkspace = linkQuoteWorkspaceField(
  quoteWorkspaceWithTarget,
  quoteWorkspaceContext,
  quoteWorkspaceWithTarget[1].id,
  'linked_width',
  quoteWorkspaceWithTarget[0].id,
  'out.area'
);
assertCheck(
  'links quote workspace fields and recalculates',
  linkedQuoteWorkspace.valid &&
    linkedQuoteWorkspace.workspaceModules[1].fieldLinks?.linked_width.fieldVariableName === 'out.area' &&
    linkedQuoteWorkspace.workspaceModules[1].calculatedCost === 16
);

const invalidQuoteWorkspaceLink = linkQuoteWorkspaceField(
  linkedQuoteWorkspace.workspaceModules,
  quoteWorkspaceContext,
  linkedQuoteWorkspace.workspaceModules[1].id,
  'weight',
  linkedQuoteWorkspace.workspaceModules[0].id,
  'out.area'
);
assertCheck(
  'rejects invalid quote workspace links without changing modules',
  !invalidQuoteWorkspaceLink.valid &&
    !!invalidQuoteWorkspaceLink.error?.includes('length') &&
    invalidQuoteWorkspaceLink.workspaceModules === linkedQuoteWorkspace.workspaceModules
);

const unlinkedQuoteWorkspace = unlinkQuoteWorkspaceField(
  linkedQuoteWorkspace.workspaceModules,
  quoteWorkspaceContext,
  linkedQuoteWorkspace.workspaceModules[1].id,
  'linked_width'
);
assertCheck(
  'unlinks quote workspace fields and recalculates',
  !unlinkedQuoteWorkspace[1].fieldLinks?.linked_width &&
    unlinkedQuoteWorkspace[1].calculatedCost === 1
);

const removedQuoteWorkspace = removeQuoteWorkspaceModule(
  linkedQuoteWorkspace.workspaceModules,
  quoteWorkspaceContext,
  linkedQuoteWorkspace.workspaceModules[0].id
);
assertCheck(
  'removes quote workspace modules and cleans broken links',
  removedQuoteWorkspace.length === 1 &&
    !removedQuoteWorkspace[0].fieldLinks?.linked_width &&
    removedQuoteWorkspace[0].calculatedCost === 1
);

const reorderedQuoteWorkspace = reorderQuoteWorkspaceModules(
  [linkedQuoteWorkspace.workspaceModules[1], linkedQuoteWorkspace.workspaceModules[0]],
  quoteWorkspaceContext
);
assertCheck(
  'reorders quote workspace modules and preserves recalculated values',
  reorderedQuoteWorkspace[0].moduleId === 'target-module' &&
    reorderedQuoteWorkspace[0].calculatedCost === 16 &&
    reorderedQuoteWorkspace[1].calculatedCost === 10
);

const directlyRecalculatedQuoteWorkspace = recalculateQuoteWorkspace(
  linkedQuoteWorkspace.workspaceModules,
  quoteWorkspaceContext
);
assertCheck(
  'recalculates quote workspaces directly',
  directlyRecalculatedQuoteWorkspace[1].calculatedCost === 16
);

const templateApplication = applyTemplateToQuoteWorkspace({
  template: {
    id: 'apply-template',
    name: 'Apply Template',
    moduleInstances: [
      {
        id: 'template-source',
        moduleId: 'source-module',
      },
      {
        id: 'template-target',
        moduleId: 'target-module',
        fieldLinks: {
          linked_width: {
            moduleInstanceId: '__index_0__',
            fieldVariableName: 'width',
          },
        },
      },
      {
        id: 'missing-template-module',
        moduleId: 'missing-module',
      },
    ],
    categories: [],
    createdAt: '',
    updatedAt: '',
  },
  workspaceModules: [],
  modules: quoteModules,
  materials: templateMaterials,
  labor: templateLabor,
  functions: [],
  getModule: (id) => quoteModules.find((module) => module.id === id),
});
assertCheck(
  'applies quote templates with legacy links and missing-module warnings',
  templateApplication.appliedModules === 2 &&
    templateApplication.workspaceModules.length === 2 &&
    templateApplication.workspaceModules[1].fieldLinks?.linked_width.moduleInstanceId ===
      templateApplication.workspaceModules[0].id &&
    templateApplication.warnings.includes('Module "missing-module" no longer exists')
);

console.log('\n=== Quote UI Helper Regression ===');
const exportQuote: Quote = {
  id: 'quote-export',
  name: 'Export Quote',
  workspaceModules: [],
  lineItems: [
    {
      id: 'line-item',
      moduleId: 'source-module',
      moduleName: 'Source',
      fieldValues: { width: 2, unknown_field: 'kept' },
      fieldSummary: 'Width: 2 m',
      cost: 10.005,
      createdAt: '',
    },
  ],
  subtotal: 10.005,
  markupPercent: 10,
  markupAmount: 1.005,
  taxRate: 0.25,
  taxAmount: 2.75,
  total: 13.76,
  createdAt: '2026-01-02T00:00:00.000Z',
  updatedAt: '',
};
const exportData = buildQuoteExportData({
  quote: exportQuote,
  getModule: (id) => quoteModules.find((module) => module.id === id),
});
assertCheck(
  'builds quote JSON export payload',
  exportData.quote.name === 'Export Quote' &&
    exportData.quote.lineItems[0].fields[0].label === 'Width' &&
    exportData.quote.lineItems[0].fields[1].label === 'unknown_field' &&
    exportData.quote.lineItems[0].cost === 10.01 &&
    exportData.quote.taxRate === 25 &&
    exportData.quote.total === 13.76
);

const quotePrintHtml = buildQuotePrintHtml({
  quote: exportQuote,
  formatCurrency: (amount) => `$${amount.toFixed(2)}`,
});
assertCheck(
  'builds quote print HTML with totals and optional markup',
  quotePrintHtml.includes('<title>Quote: Export Quote</title>') &&
    quotePrintHtml.includes('<td>Source</td>') &&
    quotePrintHtml.includes('Width: 2 m') &&
    quotePrintHtml.includes('Markup (10.00%)') &&
    quotePrintHtml.includes('Tax (25.00%)') &&
    quotePrintHtml.includes('<strong>$13.76</strong>')
);
assertCheck(
  'builds quote JSON export file names',
  getQuoteExportFileName('My Quote Name') === 'My_Quote_Name_quote.json'
);

const quoteCatalog = filterQuoteBuilderCatalog({
  modules: [
    { ...quoteModules[0], category: 'source-category' },
    { ...quoteModules[1], category: 'target-category' },
  ],
  templates: [
    {
      id: 'template-source',
      name: 'Template Source',
      moduleInstances: [],
      categories: ['source-category'],
      createdAt: '',
      updatedAt: '',
    },
  ],
  selectedCategory: 'source-category',
});
assertCheck(
  'filters quote builder catalog by category',
  quoteCatalog.allCategories.join(',') === 'source-category,target-category' &&
    quoteCatalog.filteredModules.length === 1 &&
    quoteCatalog.filteredModules[0].id === 'source-module' &&
    quoteCatalog.filteredTemplates.length === 1
);
