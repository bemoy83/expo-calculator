import { calculateQuoteTotals } from '../calculations/money';
import { buildQuoteLineItem } from '../quotes/line-item-builder';
import { getRestorableTemplateLinks } from '../quotes/template-helpers';
import { recalculateWorkspaceModuleInstances } from '../quotes/workspace-recalculation';
import type { ModuleTemplate, QuoteLineItem } from '../types';
import { canLinkFields, resolveFieldLinksWithMetadata } from '../utils/field-linking';
import { quoteInstances, quoteModules } from './fixtures';
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
