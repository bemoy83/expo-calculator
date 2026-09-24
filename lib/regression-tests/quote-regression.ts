import { calculateQuoteTotals } from '../calculations/money';
import { filterQuoteBuilderCatalog } from '../../components/quotes/quote-builder/catalog-filter';
import {
  buildQuoteExportData,
  buildQuotePrintHtml,
  getQuoteExportFileName,
} from '../quotes/export';
import { buildQuoteLineItem } from '../quotes/line-item-builder';
import { buildLineItemSummaries } from '../quotes/line-item-summary';
import { getInitialFieldValue, resolveFieldValuesWithDefaults } from '../field-defaults';
import { applyTemplateToQuoteWorkspace } from '../quotes/template-application';
import { getRestorableTemplateLinks } from '../quotes/template-helpers';
import { formatInstanceName } from '../quotes/nickname';
import { getDraftStatus } from '../quotes/draft-status';
import {
  estimateTemplateCost,
  filterQuotesByName,
  formatEditedAt,
  getBoardQuotes,
  getQuoteDraftSummary,
  isPristineQuote,
  stashQuote,
} from '../quotes/quote-board';
import {
  addQuoteWorkspaceModule,
  commitQuoteWorkspaceModule,
  createWorkspaceInstanceFromLineItem,
  duplicateQuoteWorkspaceModule,
  freezeLinksToQuoteWorkspaceModule,
  getDefaultQuoteFieldValues,
  linkQuoteWorkspaceField,
  recalculateQuoteWorkspace,
  removeQuoteWorkspaceModule,
  reopenQuoteLineItem,
  reorderQuoteWorkspaceModules,
  setQuoteWorkspaceModuleNickname,
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
  'removes quote workspace modules, keeping linked values in dependent drafts',
  removedQuoteWorkspace.length === 1 &&
    !removedQuoteWorkspace[0].fieldLinks?.linked_width &&
    removedQuoteWorkspace[0].fieldValues.linked_width === 15 &&
    removedQuoteWorkspace[0].calculatedCost === 16
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
        fieldValues: { width: 9 },
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
    templateApplication.workspaceModules[0].fieldValues.width === 0 &&
    templateApplication.workspaceModules[1].fieldLinks?.linked_width.moduleInstanceId ===
      templateApplication.workspaceModules[0].id &&
    templateApplication.warnings.includes('Module "missing-module" no longer exists')
);

console.log('\n=== Quote Reopen & Nickname Regression ===');
const nicknamedWorkspace = setQuoteWorkspaceModuleNickname(
  quoteWorkspaceWithTarget,
  quoteWorkspaceWithTarget[0].id,
  '  North wall  '
);
assertCheck(
  'sets a nickname on one workspace instance only',
  nicknamedWorkspace[0].nickname === '  North wall  ' && nicknamedWorkspace[1].nickname === undefined
);
assertCheck(
  'clears a workspace nickname set to an empty string',
  setQuoteWorkspaceModuleNickname(nicknamedWorkspace, nicknamedWorkspace[0].id, '')[0].nickname === undefined
);

const nicknamedLineItem = buildQuoteLineItem({
  instance: nicknamedWorkspace[0],
  moduleDef: quoteModules[0],
  resolvedFieldValues: nicknamedWorkspace[0].fieldValues,
  materials: templateMaterials,
  labor: templateLabor,
  functions: [],
}).lineItem;
assertCheck(
  'carries a trimmed nickname onto the committed line item',
  nicknamedLineItem?.nickname === 'North wall' && nicknamedLineItem.cost === 10
);
const blankNicknameLineItem = buildQuoteLineItem({
  instance: { ...nicknamedWorkspace[0], nickname: '   ' },
  moduleDef: quoteModules[0],
  resolvedFieldValues: nicknamedWorkspace[0].fieldValues,
  materials: templateMaterials,
  labor: templateLabor,
  functions: [],
}).lineItem;
assertCheck(
  'omits whitespace-only nicknames from line items',
  !!blankNicknameLineItem && !('nickname' in blankNicknameLineItem)
);

const reopenedWorkspace = reopenQuoteLineItem([], quoteWorkspaceContext, nicknamedLineItem!);
assertCheck(
  'reopens a line item as a recalculated workspace draft with its nickname',
  reopenedWorkspace?.length === 1 &&
    reopenedWorkspace[0].id !== nicknamedLineItem!.id &&
    reopenedWorkspace[0].moduleId === 'source-module' &&
    reopenedWorkspace[0].fieldValues.width === 5 &&
    reopenedWorkspace[0].fieldValues['out.area'] === 15 &&
    reopenedWorkspace[0].calculatedCost === 10 &&
    reopenedWorkspace[0].nickname === 'North wall'
);

const staleLineItem: QuoteLineItem = {
  id: 'stale-line-item',
  moduleId: 'target-module',
  moduleName: 'Target',
  fieldValues: { linked_width: 4, removed_field: 7, 'out.old_output': 99 },
  fieldSummary: '',
  cost: 5,
  createdAt: '',
};
const restoredInstance = createWorkspaceInstanceFromLineItem(staleLineItem, quoteModules[1]);
assert.deepEqual(restoredInstance.fieldValues, { linked_width: 4, weight: 0 });
assertCheck(
  'restores only current module fields when reopening (defaults for new, drops removed)',
  restoredInstance.nickname === undefined && !restoredInstance.fieldLinks
);
assertCheck(
  'refuses to reopen a line item whose module no longer exists',
  reopenQuoteLineItem([], quoteWorkspaceContext, { ...staleLineItem, moduleId: 'missing-module' }) === null
);
assertCheck(
  'formats instance names with and without nicknames',
  formatInstanceName('Wall', ' North ') === 'Wall · North' && formatInstanceName('Wall', '  ') === 'Wall'
);

console.log('\n=== Quote Commit (Move) & Duplicate Regression ===');
// linkedQuoteWorkspace: [source (width 5, out.area 15, cost 10), target (linked_width -> source out.area, cost 16)]
const [commitSource, commitTarget] = linkedQuoteWorkspace.workspaceModules;
const committed = commitQuoteWorkspaceModule(
  linkedQuoteWorkspace.workspaceModules,
  quoteWorkspaceContext,
  commitSource.id
);
assertCheck(
  'commits a draft into a line item and moves it out of the workspace',
  committed.ok &&
    committed.lineItem.moduleId === 'source-module' &&
    committed.lineItem.cost === 10 &&
    committed.workspaceModules.length === 1 &&
    committed.workspaceModules[0].id === commitTarget.id
);
assertCheck(
  'keeps dependent drafts at their linked value when the source is committed',
  committed.ok &&
    !committed.workspaceModules[0].fieldLinks?.linked_width &&
    committed.workspaceModules[0].fieldValues.linked_width === 15 &&
    committed.workspaceModules[0].calculatedCost === 16
);

const frozen = freezeLinksToQuoteWorkspaceModule(linkedQuoteWorkspace.workspaceModules, commitSource.id);
assertCheck(
  'freezing leaves the source draft itself untouched',
  frozen[0] === commitSource && frozen[1].fieldValues.linked_width === 15 && !frozen[1].fieldLinks
);

const chainWorkspace = addQuoteWorkspaceModule(
  linkedQuoteWorkspace.workspaceModules,
  quoteWorkspaceContext,
  'target-module'
);
const chainLinked = linkQuoteWorkspaceField(
  chainWorkspace,
  quoteWorkspaceContext,
  chainWorkspace[2].id,
  'linked_width',
  chainWorkspace[1].id,
  'linked_width'
);
assert.ok(chainLinked.valid, chainLinked.error);
const committedChain = commitQuoteWorkspaceModule(
  chainLinked.workspaceModules,
  quoteWorkspaceContext,
  commitSource.id
);
assertCheck(
  'keeps links between remaining drafts when an upstream source is committed',
  committedChain.ok &&
    committedChain.workspaceModules.length === 2 &&
    committedChain.workspaceModules[1].fieldLinks?.linked_width.moduleInstanceId ===
      committedChain.workspaceModules[0].id &&
    committedChain.workspaceModules[1].calculatedCost === 16
);
assertCheck(
  'reports a missing draft without an error message',
  (() => {
    const result = commitQuoteWorkspaceModule(
      linkedQuoteWorkspace.workspaceModules,
      quoteWorkspaceContext,
      'missing-instance'
    );
    return !result.ok && result.error === undefined;
  })()
);

const nicknamedTargetWorkspace = setQuoteWorkspaceModuleNickname(
  linkedQuoteWorkspace.workspaceModules,
  commitTarget.id,
  'East'
);
const duplicated = duplicateQuoteWorkspaceModule(
  nicknamedTargetWorkspace,
  quoteWorkspaceContext,
  commitTarget.id
);
assertCheck(
  'duplicates a draft right after the original with its values, links, and a "(copy)" nickname',
  duplicated.length === 3 &&
    duplicated[1].id === commitTarget.id &&
    duplicated[2].id !== commitTarget.id &&
    duplicated[2].fieldLinks?.linked_width.moduleInstanceId === commitSource.id &&
    duplicated[2].calculatedCost === 16 &&
    duplicated[2].nickname === 'East (copy)'
);
const duplicatedWithoutNickname = duplicateQuoteWorkspaceModule(
  linkedQuoteWorkspace.workspaceModules,
  quoteWorkspaceContext,
  commitSource.id
);
assertCheck(
  'duplicates a draft without a nickname without adding one',
  duplicatedWithoutNickname.length === 3 &&
    duplicatedWithoutNickname[1].moduleId === 'source-module' &&
    !('nickname' in duplicatedWithoutNickname[1]) &&
    duplicatedWithoutNickname[1].fieldValues.width === 5
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
const escapedQuotePrintHtml = buildQuotePrintHtml({
  quote: {
    ...exportQuote,
    name: '<img src=x onerror=alert(1)>',
    lineItems: [
      {
        ...exportQuote.lineItems[0],
        moduleName: '<script>alert(1)</script>',
        fieldSummary: 'Width < 5 & height > 2',
      },
    ],
  },
  formatCurrency: (amount) => `$${amount.toFixed(2)}`,
});
assertCheck(
  'escapes quote print HTML text',
  escapedQuotePrintHtml.includes('&lt;img src=x onerror=alert(1)&gt;') &&
    escapedQuotePrintHtml.includes('&lt;script&gt;alert(1)&lt;/script&gt;') &&
    escapedQuotePrintHtml.includes('Width &lt; 5 &amp; height &gt; 2') &&
    !escapedQuotePrintHtml.includes('<script>alert(1)</script>')
);
const nicknamedExportQuote: Quote = {
  ...exportQuote,
  lineItems: [{ ...exportQuote.lineItems[0], nickname: 'North <wall>' }],
};
assertCheck(
  'includes line item nicknames in JSON export and escaped print HTML',
  buildQuoteExportData({ quote: nicknamedExportQuote, getModule: () => undefined }).quote.lineItems[0]
    .nickname === 'North <wall>' &&
    buildQuotePrintHtml({
      quote: nicknamedExportQuote,
      formatCurrency: (amount) => `$${amount.toFixed(2)}`,
    }).includes('<td>Source · North &lt;wall&gt;</td>')
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

console.log('\n=== Quote Board Regression ===');
const boardQuote = (id: string, overrides: Partial<Quote> = {}): Quote => ({
  id,
  name: `Quote ${id}`,
  workspaceModules: [],
  lineItems: [],
  subtotal: 0,
  markupPercent: 0,
  markupAmount: 0,
  taxRate: 0,
  taxAmount: 0,
  total: 0,
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
  ...overrides,
});
const pristineQuote = boardQuote('pristine', { name: 'New Quote' });
const savedOld = boardQuote('old', { updatedAt: '2026-08-28T10:00:00.000Z' });
const savedNew = boardQuote('new', { updatedAt: '2026-09-18T10:00:00.000Z' });
const openCopyOfOld = {
  ...savedOld,
  name: 'Old, edited',
  lineItems: [lineItems[0]],
  updatedAt: '2026-09-23T10:00:00.000Z',
};

assertCheck(
  'treats an empty, unsaved, unnamed quote as pristine only',
  isPristineQuote(pristineQuote, []) &&
    !isPristineQuote(pristineQuote, [pristineQuote]) &&
    !isPristineQuote({ ...pristineQuote, name: 'Hall B' }, []) &&
    !isPristineQuote({ ...pristineQuote, workspaceModules: [quoteInstances[0]] }, [])
);

const savedList = [savedOld, savedNew];
assertCheck(
  'stashing skips pristine quotes, appends new ones, and replaces saved copies',
  stashQuote(savedList, pristineQuote) === savedList &&
    stashQuote(savedList, null) === savedList &&
    stashQuote(savedList, boardQuote('fresh', { name: 'Fresh' })).length === 3 &&
    stashQuote(savedList, openCopyOfOld).length === 2 &&
    stashQuote(savedList, openCopyOfOld)[0].name === 'Old, edited'
);

const board = getBoardQuotes(savedList, openCopyOfOld);
assertCheck(
  'board shows the open quote live, once, sorted by most recently edited',
  board.map((quote) => quote.id).join(',') === 'old,new' && board[0].name === 'Old, edited'
);
assertCheck(
  'board leaves out a pristine open quote',
  getBoardQuotes(savedList, pristineQuote).map((quote) => quote.id).join(',') === 'new,old'
);

const draftSummary = getQuoteDraftSummary(
  boardQuote('drafts', {
    workspaceModules: [
      { ...quoteInstances[0], calculatedCost: 10.005 },
      { ...quoteInstances[1], calculatedCost: 5 },
    ],
  })
);
assertCheck(
  'summarizes drafts (count and uncounted cost)',
  draftSummary.count === 2 && draftSummary.cost === 15.01,
  JSON.stringify(draftSummary)
);

assertCheck(
  'filters quotes by name, case-insensitively',
  filterQuotesByName(board, '  EDITED ').length === 1 && filterQuotesByName(board, '').length === 2
);

const now = new Date('2026-09-23T12:00:00.000Z');
assertCheck(
  'formats edited times relative, then as a date',
  formatEditedAt('2026-09-23T11:59:40.000Z', now) === 'just now' &&
    formatEditedAt('2026-09-23T11:48:00.000Z', now) === '12 min ago' &&
    formatEditedAt('2026-09-23T09:00:00.000Z', now) === '3 h ago' &&
    formatEditedAt('2026-09-18T09:00:00.000Z', now) === '18 Sep' &&
    formatEditedAt('2025-09-18T09:00:00.000Z', now) === '18 Sep 2025' &&
    formatEditedAt('not a date', now) === ''
);

const estimatedTemplateCost = estimateTemplateCost({
  template: {
    id: 'estimate-template',
    name: 'Estimate',
    // Target's formula is `linked_width + 1`, so each instance costs 1 at its defaults.
    moduleInstances: [
      { moduleId: 'target-module' },
      { moduleId: 'target-module' },
      { moduleId: 'missing-module' },
    ],
    categories: [],
    createdAt: '',
    updatedAt: '',
  },
  modules: quoteModules,
  materials: templateMaterials,
  labor: templateLabor,
  functions: [],
});
assertCheck(
  'estimates a template at applied defaults, skipping missing modules',
  estimatedTemplateCost === 2,
  String(estimatedTemplateCost)
);

console.log('\n=== Draft Status Regression ===');
const sourceDraft = {
  id: 'draft-source',
  moduleId: 'source-module',
  fieldValues: { width: 5 },
  calculatedCost: 0,
};
const sourceStatus = getDraftStatus({
  instance: sourceDraft,
  moduleDef: quoteModules[0],
  resolvedFieldValues: sourceDraft.fieldValues,
  materials: templateMaterials,
  labor: templateLabor,
  functions: [],
});
assertCheck(
  'reports a draft\'s cost and its show-in-quote outputs',
  sourceStatus.cost === 10 &&
    !sourceStatus.error &&
    sourceStatus.outputs.length === 1 &&
    sourceStatus.outputs[0].variableName === 'area' &&
    sourceStatus.outputs[0].display === '15 m' &&
    (sourceStatus.summary ?? '').includes('Area: 15 m'),
  JSON.stringify(sourceStatus)
);

const brokenModule: CalculationModule = {
  ...quoteModules[0],
  id: 'broken-module',
  formula: 'width * missing_material',
  computedOutputs: [],
};
const brokenStatus = getDraftStatus({
  instance: { ...sourceDraft, moduleId: 'broken-module' },
  moduleDef: brokenModule,
  resolvedFieldValues: sourceDraft.fieldValues,
  materials: templateMaterials,
  labor: templateLabor,
  functions: [],
});
assertCheck(
  'flags a draft that cannot calculate, with zero cost',
  !!brokenStatus.error && brokenStatus.cost === 0,
  JSON.stringify(brokenStatus)
);

const requiredModule: CalculationModule = {
  ...quoteModules[1],
  id: 'required-module',
  fields: quoteModules[1].fields.map((field) => ({ ...field, required: true })),
};
const requiredStatus = (fieldValues: Record<string, string | number | boolean>, linked = false) =>
  getDraftStatus({
    instance: {
      id: 'draft-required',
      moduleId: 'required-module',
      fieldValues,
      calculatedCost: 0,
      ...(linked
        ? { fieldLinks: { linked_width: { moduleInstanceId: 'draft-source', fieldVariableName: 'width' } } }
        : {}),
    },
    moduleDef: requiredModule,
    resolvedFieldValues: fieldValues,
    materials: templateMaterials,
    labor: templateLabor,
    functions: [],
  }).missingRequired;
assertCheck(
  'counts only required fields that are empty and unlinked',
  requiredStatus({ linked_width: '', weight: '' }) === 2 &&
    requiredStatus({ linked_width: 3, weight: '' }) === 1 &&
    requiredStatus({ linked_width: '', weight: '' }, true) === 1 &&
    requiredStatus({ linked_width: 3, weight: 0 }) === 0
);
