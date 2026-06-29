import {
  createTemplateModuleInstance,
  getDefaultTemplateFieldValues,
  initializeTemplateWorkspaceModules,
  serializeTemplateWorkspace,
} from '../templates/template-instance-helpers';
import {
  analyzeTemplateLinks,
  calculateTemplateLinkConfidence,
  getTemplateLinkMatchReason,
} from '../templates/template-link-analysis';
import {
  addTemplateWorkspaceModule,
  linkTemplateWorkspaceField,
  recalculateTemplateWorkspace,
  removeTemplateWorkspaceModule,
  reorderTemplateWorkspaceModules,
  unlinkTemplateWorkspaceField,
  updateTemplateWorkspaceFieldValue,
  validateTemplateWorkspaceFieldLink,
} from '../templates/template-workspace-actions';
import type { CalculationModule, ModuleTemplate, QuoteModuleInstance, SharedFunction } from '../types';
import { quoteModules, templateLabor, templateMaterials } from './fixtures';
import { assert, assertCheck } from './test-helpers';

console.log('\n=== Template Editor Helper Regression ===');
const templateDefaults = getDefaultTemplateFieldValues(
  [
    { id: 'n', label: 'Number', type: 'number', variableName: 'number_value' },
    { id: 'b', label: 'Boolean', type: 'boolean', variableName: 'enabled' },
    { id: 'd', label: 'Dropdown', type: 'dropdown', variableName: 'choice' },
    { id: 't', label: 'Text', type: 'text', variableName: 'note' },
    { id: 'm', label: 'Material', type: 'material', variableName: 'material', materialCategory: 'wood' },
    { id: 'l', label: 'Labor', type: 'labor', variableName: 'labor', laborCategory: 'install' },
  ],
  templateMaterials,
  templateLabor
);
assert.deepEqual(templateDefaults, {
  number_value: '',
  enabled: false,
  choice: '',
  note: '',
  material: 'wood_a',
  labor: 'installer_a',
});
assertCheck('creates template defaults for all field types', true);

const templateInstance = createTemplateModuleInstance({
  moduleDef: quoteModules[0],
  materials: templateMaterials,
  labor: templateLabor,
});
assertCheck(
  'creates new template module instances with defaults',
  templateInstance.moduleId === 'source-module' &&
    templateInstance.fieldValues.width === '' &&
    templateInstance.calculatedCost === 0
);

const legacyTemplate: ModuleTemplate = {
  id: 'legacy-template',
  name: 'Legacy Template',
  moduleInstances: [
    {
      moduleId: 'source-module',
      fieldValues: { width: 4 },
    },
    {
      id: 'saved-target',
      moduleId: 'target-module',
      fieldValues: { linked_width: 0, weight: 2 },
      fieldLinks: {
        linked_width: {
          moduleInstanceId: '__index_0__',
          fieldVariableName: 'out.area',
        },
      },
    },
  ],
  categories: [],
  createdAt: '',
  updatedAt: '',
};
const initializedTemplateModules = initializeTemplateWorkspaceModules({
  template: legacyTemplate,
  modules: quoteModules,
  materials: templateMaterials,
  labor: templateLabor,
  functions: [],
});
const initializedSource = initializedTemplateModules[0];
const initializedTarget = initializedTemplateModules[1];
assertCheck(
  'initializes templates with saved values and costs',
  initializedSource.fieldValues.width === 4 &&
    initializedSource.fieldValues['out.area'] === 12 &&
    initializedSource.calculatedCost === 8
);
assertCheck(
  'migrates legacy index links to instance IDs',
  initializedTarget.id === 'saved-target' &&
    initializedTarget.fieldLinks?.linked_width.moduleInstanceId === initializedSource.id &&
    initializedTarget.fieldLinks.linked_width.fieldVariableName === 'out.area'
);
assertCheck(
  'recalculates computed-output links in initialized templates',
  initializedTarget.fieldValues.linked_width === 0 &&
    initializedTarget.calculatedCost === 13
);

const brokenTemplateModules = initializeTemplateWorkspaceModules({
  template: {
    ...legacyTemplate,
    moduleInstances: [legacyTemplate.moduleInstances[1]],
  },
  modules: quoteModules,
  materials: templateMaterials,
  labor: templateLabor,
  functions: [],
});
assertCheck(
  'initializes templates with broken links without crashing',
  brokenTemplateModules.length === 1 &&
    !brokenTemplateModules[0].fieldLinks?.linked_width &&
    brokenTemplateModules[0].calculatedCost === 1
);

const serializedTemplateWorkspace = serializeTemplateWorkspace({
  workspaceModules: [{ ...initializedSource, fieldLinks: {} }, initializedTarget],
  modules: [
    { ...quoteModules[0], category: 'source-category' },
    { ...quoteModules[1], category: 'target-category' },
  ],
  name: '  Saved Template  ',
  description: '  Template description  ',
});
assertCheck(
  'serializes template workspaces with categories and non-empty links',
  serializedTemplateWorkspace.name === 'Saved Template' &&
    serializedTemplateWorkspace.description === 'Template description' &&
    serializedTemplateWorkspace.categories.join(',') === 'source-category,target-category' &&
    serializedTemplateWorkspace.moduleInstances[0].fieldLinks === undefined &&
    serializedTemplateWorkspace.moduleInstances[1].fieldLinks?.linked_width.fieldVariableName === 'out.area'
);

const templateWorkspaceContext = {
  modules: quoteModules,
  materials: templateMaterials,
  labor: templateLabor,
  functions: [] as SharedFunction[],
};
const updatedTemplateWorkspace = updateTemplateWorkspaceFieldValue(
  initializedTemplateModules,
  templateWorkspaceContext,
  initializedSource.id,
  'width',
  5
);
assertCheck(
  'updates template workspace fields and recalculates',
  updatedTemplateWorkspace[0].fieldValues.width === 5 &&
    updatedTemplateWorkspace[0].fieldValues['out.area'] === 15 &&
    updatedTemplateWorkspace[0].calculatedCost === 10 &&
    updatedTemplateWorkspace[1].calculatedCost === 16
);

const addedTemplateWorkspace = addTemplateWorkspaceModule(
  initializedTemplateModules,
  templateWorkspaceContext,
  'source-module'
);
assertCheck(
  'adds template workspace modules with defaults and recalculates',
  addedTemplateWorkspace.length === initializedTemplateModules.length + 1 &&
    addedTemplateWorkspace[2].moduleId === 'source-module' &&
    addedTemplateWorkspace[2].fieldValues.width === '' &&
    addedTemplateWorkspace[2].calculatedCost === 0
);

const removedTemplateWorkspace = removeTemplateWorkspaceModule(
  initializedTemplateModules,
  templateWorkspaceContext,
  initializedSource.id
);
assertCheck(
  'removes template workspace modules and cleans broken links',
  removedTemplateWorkspace.length === 1 &&
    removedTemplateWorkspace[0].id === initializedTarget.id &&
    !removedTemplateWorkspace[0].fieldLinks?.linked_width &&
    removedTemplateWorkspace[0].calculatedCost === 1
);

const reorderedTemplateWorkspace = reorderTemplateWorkspaceModules(initializedTemplateModules, 0, 1);
assertCheck(
  'reorders template workspace modules without recalculating',
  reorderedTemplateWorkspace[0].id === initializedTarget.id &&
    reorderedTemplateWorkspace[1].id === initializedSource.id &&
    reorderedTemplateWorkspace[0].calculatedCost === initializedTarget.calculatedCost &&
    reorderedTemplateWorkspace[1].calculatedCost === initializedSource.calculatedCost
);

const unlinkedTemplateWorkspace = unlinkTemplateWorkspaceField(
  initializedTemplateModules,
  templateWorkspaceContext,
  initializedTarget.id,
  'linked_width'
);
assertCheck(
  'unlinks template workspace fields and recalculates',
  !unlinkedTemplateWorkspace[1].fieldLinks?.linked_width &&
    unlinkedTemplateWorkspace[1].calculatedCost === 1
);

const relinkedTemplateWorkspace = linkTemplateWorkspaceField(
  unlinkedTemplateWorkspace,
  templateWorkspaceContext,
  initializedTarget.id,
  'linked_width',
  initializedSource.id,
  'out.area'
);
assertCheck(
  'links template workspace fields and recalculates',
  relinkedTemplateWorkspace.valid &&
    relinkedTemplateWorkspace.workspaceModules[1].fieldLinks?.linked_width.fieldVariableName === 'out.area' &&
    relinkedTemplateWorkspace.workspaceModules[1].calculatedCost === 13
);

const invalidTemplateWorkspaceLink = linkTemplateWorkspaceField(
  initializedTemplateModules,
  templateWorkspaceContext,
  initializedTarget.id,
  'weight',
  initializedSource.id,
  'out.area'
);
assertCheck(
  'rejects invalid template workspace links without changing modules',
  !invalidTemplateWorkspaceLink.valid &&
    !!invalidTemplateWorkspaceLink.error?.includes('length') &&
    invalidTemplateWorkspaceLink.workspaceModules === initializedTemplateModules
);

const directInvalidTemplateValidation = validateTemplateWorkspaceFieldLink(
  initializedTemplateModules,
  templateWorkspaceContext,
  initializedTarget.id,
  'weight',
  initializedSource.id,
  'out.area'
);
assertCheck(
  'validates invalid template workspace links',
  !directInvalidTemplateValidation.valid &&
    !!directInvalidTemplateValidation.error?.includes('length')
);

const recalculatedTemplateWorkspace = recalculateTemplateWorkspace(
  [
    { ...initializedSource, fieldValues: { width: 6 } },
    { ...initializedTarget, fieldValues: { linked_width: 0, weight: 2 } },
  ],
  templateWorkspaceContext
);
assertCheck(
  'recalculates template workspaces directly',
  recalculatedTemplateWorkspace[0].fieldValues['out.area'] === 18 &&
    recalculatedTemplateWorkspace[1].calculatedCost === 19
);

console.log('\n=== Template Link Analysis Regression ===');
const analysisModules: CalculationModule[] = [
  {
    id: 'analysis-source',
    name: 'Analysis Source',
    fields: [
      { id: 'analysis-width', label: 'Width', type: 'number', variableName: 'width', unitCategory: 'length', unitSymbol: 'm' },
      { id: 'analysis-material', label: 'Material', type: 'material', variableName: 'material' },
      { id: 'analysis-enabled', label: 'Enabled', type: 'boolean', variableName: 'enabled' },
    ],
    formula: 'width * 2',
    computedOutputs: [
      {
        id: 'analysis-area',
        label: 'Area',
        variableName: 'area',
        expression: 'width * 3',
        unitCategory: 'length',
        unitSymbol: 'm',
      },
    ],
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'analysis-target',
    name: 'Analysis Target',
    fields: [
      { id: 'analysis-target-width', label: 'Width', type: 'number', variableName: 'width', unitCategory: 'length', unitSymbol: 'm' },
      { id: 'analysis-target-height', label: 'Height', type: 'number', variableName: 'height', unitCategory: 'length', unitSymbol: 'm' },
      { id: 'analysis-target-material', label: 'Material', type: 'material', variableName: 'material' },
      { id: 'analysis-target-enabled', label: 'Enabled', type: 'boolean', variableName: 'enabled' },
    ],
    formula: 'width + height',
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'analysis-third',
    name: 'Analysis Third',
    fields: [
      { id: 'analysis-third-width', label: 'Width', type: 'number', variableName: 'width', unitCategory: 'length', unitSymbol: 'm' },
    ],
    formula: 'width',
    createdAt: '',
    updatedAt: '',
  },
];
const analysisWorkspace: QuoteModuleInstance[] = [
  {
    id: 'analysis-source-instance',
    moduleId: 'analysis-source',
    fieldValues: { width: 2, material: 'wood_a', enabled: true, 'out.area': 6 },
    calculatedCost: 4,
  },
  {
    id: 'analysis-target-instance',
    moduleId: 'analysis-target',
    fieldValues: { width: 0, height: 1, material: 'wood_a', enabled: false },
    fieldLinks: {
      width: { moduleInstanceId: 'analysis-source-instance', fieldVariableName: 'width' },
      height: { moduleInstanceId: 'analysis-source-instance', fieldVariableName: 'out.area' },
    },
    calculatedCost: 7,
  },
  {
    id: 'analysis-third-instance',
    moduleId: 'analysis-third',
    fieldValues: { width: 3 },
    calculatedCost: 3,
  },
];
const linkAnalysis = analyzeTemplateLinks({
  workspaceModules: analysisWorkspace,
  modules: analysisModules,
});
assertCheck(
  'detects template link analysis primary module and stats',
  linkAnalysis.primaryModule?.id === 'analysis-source-instance' &&
    linkAnalysis.primaryModule.fieldsAsSource === 1 &&
    linkAnalysis.primaryModule.computedOutputsAsSource === 1 &&
    linkAnalysis.stats.totalModules === 3 &&
    linkAnalysis.stats.totalFields === 8 &&
    linkAnalysis.stats.totalComputedOutputs === 1 &&
    linkAnalysis.stats.linkedFields === 2 &&
    linkAnalysis.stats.unlinkedFields === 6 &&
    linkAnalysis.stats.coveragePercent === 25
);
const regularSource = linkAnalysis.linkSources.find(
  (source) => source.fieldVariableName === 'width' && !source.isComputedOutput
);
const computedSource = linkAnalysis.linkSources.find((source) => source.fieldVariableName === 'out.area');
assertCheck(
  'detects regular and computed template link sources',
  regularSource?.linkedBy[0].fieldLabel === 'Width' &&
    regularSource.linkedBy[0].hasLocalValue === false &&
    computedSource?.isComputedOutput === true &&
    computedSource.linkedBy[0].fieldLabel === 'Height' &&
    computedSource.unitSymbol === 'm'
);
const thirdWidthOpportunity = linkAnalysis.linkOpportunities.find(
  (opportunity) =>
    opportunity.moduleInstanceId === 'analysis-third-instance' &&
    opportunity.fieldVariableName === 'width'
);
assertCheck(
  'finds template link opportunities only from earlier modules',
  !!thirdWidthOpportunity &&
    thirdWidthOpportunity.suggestedSources.length >= 2 &&
    thirdWidthOpportunity.suggestedSources.every(
      (source) => source.moduleOrder < thirdWidthOpportunity.moduleOrder
    ) &&
    thirdWidthOpportunity.suggestedSources.some(
      (source) => source.fieldVariableName === 'width' && !source.isComputedOutput
    ) &&
    thirdWidthOpportunity.suggestedSources.some(
      (source) => source.fieldVariableName === 'out.area' && source.isComputedOutput
    )
);
assertCheck(
  'skips material fields in template link opportunities',
  !linkAnalysis.linkOpportunities.some((opportunity) => opportunity.fieldVariableName === 'material') &&
    !thirdWidthOpportunity?.suggestedSources.some((source) => source.fieldVariableName === 'material')
);
const exactConfidence = calculateTemplateLinkConfidence(
  analysisModules[0].fields[0],
  analysisModules[2].fields[0],
  'width'
);
const similarConfidence = calculateTemplateLinkConfidence(
  { ...analysisModules[0].fields[0], variableName: 'w' },
  analysisModules[2].fields[0],
  'w'
);
const computedReason = getTemplateLinkMatchReason(
  analysisModules[0].computedOutputs![0],
  analysisModules[2].fields[0],
  'area'
);
assertCheck(
  'scores template link confidence and reasons',
  exactConfidence === 100 &&
    similarConfidence === 80 &&
    computedReason === 'Matching unit (m) • Compatible type'
);
