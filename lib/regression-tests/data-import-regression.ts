import './memory-local-storage';
import { useCategoriesStore } from '../stores/categories-store';
import { useFunctionsStore } from '../stores/functions-store';
import { useLaborStore } from '../stores/labor-store';
import { useMaterialsStore } from '../stores/materials-store';
import { useModulesStore } from '../stores/modules-store';
import { useTemplatesStore } from '../stores/templates-store';
import { applyTemplateToQuoteWorkspace } from '../quotes/template-application';
import type { CalculationModule, ModuleTemplate } from '../types';
import { EXPORT_VERSION, exportAllData, type ExportedData } from '../utils/data-export';
import { importData, validateImportedData } from '../utils/data-import';
import { buildModuleIdMap, remapTemplateModules } from '../utils/data-import-remap';
import { quoteModules, sharedFunctions, templateLabor, templateMaterials } from './fixtures';
import { assert, assertCheck } from './test-helpers';

console.log('\n=== Data Export/Import Regression ===');

const [sourceModule, targetModule] = quoteModules;
const sourceToTargetLink = {
  linked_width: { moduleInstanceId: 'inst-src', fieldVariableName: 'width' },
};
const legacyLink = {
  linked_width: { moduleInstanceId: '__index_0__', fieldVariableName: 'width' },
};

const seedTemplates: ModuleTemplate[] = [
  {
    id: 'tpl-chain',
    name: 'Chain',
    moduleInstances: [
      { id: 'inst-src', moduleId: sourceModule.id, fieldValues: { width: 4 } },
      { id: 'inst-tgt', moduleId: targetModule.id, fieldLinks: sourceToTargetLink },
    ],
    categories: [],
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'tpl-legacy',
    name: 'Legacy chain',
    moduleInstances: [
      { moduleId: sourceModule.id },
      { moduleId: targetModule.id, fieldLinks: legacyLink },
    ],
    categories: [],
    createdAt: '',
    updatedAt: '',
  },
];

function seedStores(overrides: {
  modules?: CalculationModule[];
  templates?: ModuleTemplate[];
  withLabor?: boolean;
} = {}) {
  useModulesStore.setState({ modules: overrides.modules ?? quoteModules });
  useMaterialsStore.setState({ materials: templateMaterials });
  useLaborStore.setState({ labor: overrides.withLabor === false ? [] : templateLabor });
  useCategoriesStore.setState({ customCategories: ['Custom'] });
  useFunctionsStore.setState({ functions: sharedFunctions });
  useTemplatesStore.setState({ templates: overrides.templates ?? seedTemplates });
}

function moduleName(id: string) {
  return useModulesStore.getState().modules.find((m) => m.id === id)?.name;
}

function templateNamed(name: string) {
  const template = useTemplatesStore.getState().templates.find((t) => t.name === name);
  assert.ok(template, `template "${name}" exists`);
  return template;
}

function applyTemplate(template: ModuleTemplate) {
  const state = {
    modules: useModulesStore.getState().modules,
    materials: useMaterialsStore.getState().materials,
    labor: useLaborStore.getState().labor,
    functions: useFunctionsStore.getState().functions,
  };
  return applyTemplateToQuoteWorkspace({
    template,
    workspaceModules: [],
    ...state,
    getModule: (id) => state.modules.find((m) => m.id === id),
  });
}

// --- Export includes templates ---
seedStores();
const exported = JSON.parse(JSON.stringify(exportAllData())) as ExportedData;
assertCheck('export uses the bumped version', exported.version === EXPORT_VERSION && EXPORT_VERSION === '1.1.0');
assertCheck('export includes templates', exported.templates?.length === 2);
assertCheck('export validates', validateImportedData(exported));

// --- Replace: templates come back pointing at the new module IDs, links intact ---
const oldModuleIds = new Set(quoteModules.map((m) => m.id));
const replaceResult = importData(exported, { mode: 'replace' });
assertCheck('replace import succeeds without warnings', replaceResult.success && !replaceResult.warnings);
assertCheck('replace imports both templates', replaceResult.templatesAdded === 2 && useTemplatesStore.getState().templates.length === 2);
assertCheck(
  'replace gives modules new IDs',
  useModulesStore.getState().modules.every((m) => !oldModuleIds.has(m.id))
);
{
  const chain = templateNamed('Chain');
  assert.deepEqual(chain.moduleInstances.map((i) => moduleName(i.moduleId)), ['Source', 'Target']);
  assert.deepEqual(chain.moduleInstances.map((i) => i.id), ['inst-src', 'inst-tgt']);
  assert.deepEqual(chain.moduleInstances[1].fieldLinks, sourceToTargetLink);
  assert.deepEqual(chain.moduleInstances[0].fieldValues, { width: 4 });
  const legacy = templateNamed('Legacy chain');
  assert.deepEqual(legacy.moduleInstances.map((i) => moduleName(i.moduleId)), ['Source', 'Target']);
  assert.deepEqual(legacy.moduleInstances[1].fieldLinks, legacyLink);
  assertCheck('replace remaps module IDs and keeps instance IDs, links, and values', true);

  [chain, legacy].forEach((template) => {
    const applied = applyTemplate(template);
    const [src, tgt] = applied.workspaceModules;
    assertCheck(
      `imported "${template.name}" applies with its link restored`,
      applied.warnings.length === 0 &&
        applied.appliedModules === 2 &&
        tgt.fieldLinks?.linked_width?.moduleInstanceId === src.id
    );
  });
}

// --- Replace doesn't duplicate labor ---
assertCheck('replace import keeps one copy of labor', useLaborStore.getState().labor.length === templateLabor.length);
importData(exported, { mode: 'replace' });
assertCheck(
  'replacing again still keeps one copy of everything',
  useLaborStore.getState().labor.length === templateLabor.length &&
    useModulesStore.getState().modules.length === quoteModules.length &&
    useTemplatesStore.getState().templates.length === seedTemplates.length
);

// --- Merge: skipped modules map to the existing module with the same name ---
seedStores({
  modules: [{ ...sourceModule, id: 'existing-source', name: 'SOURCE' }],
  templates: [{ ...seedTemplates[0], id: 'existing-chain', name: 'chain', moduleInstances: [] }],
  withLabor: false,
});
const mergeResult = importData(exported, { mode: 'merge' });
assertCheck('merge succeeds without warnings', mergeResult.success && !mergeResult.warnings);
assertCheck('merge skips the module whose name exists', mergeResult.modulesAdded === 1);
assertCheck('merge skips the template whose name exists (case-insensitive)', mergeResult.templatesAdded === 1);
{
  const legacy = templateNamed('Legacy chain');
  const newTarget = useModulesStore.getState().modules.find((m) => m.name === 'Target');
  assertCheck(
    'merge maps the skipped module to the existing one and the added one to its new ID',
    legacy.moduleInstances[0].moduleId === 'existing-source' &&
      legacy.moduleInstances[1].moduleId === newTarget?.id
  );
}
const secondMerge = importData(exported, { mode: 'merge' });
assertCheck(
  'merging the same file again adds nothing',
  secondMerge.success &&
    secondMerge.modulesAdded === 0 &&
    secondMerge.laborAdded === 0 &&
    secondMerge.templatesAdded === 0
);

// --- Templates with unmappable modules are imported with a warning ---
seedStores();
const withGhost: ExportedData = {
  ...exported,
  templates: [
    {
      ...seedTemplates[0],
      name: 'Ghost chain',
      moduleInstances: [
        { id: 'inst-src', moduleId: sourceModule.id },
        { id: 'inst-ghost', moduleId: 'ghost-module' },
      ],
    },
  ],
};
const ghostResult = importData(withGhost, { mode: 'replace' });
{
  const ghost = templateNamed('Ghost chain');
  assertCheck(
    'template with a missing module is imported, keeping its old module ID',
    ghostResult.success && ghostResult.templatesAdded === 1 && ghost.moduleInstances[1].moduleId === 'ghost-module'
  );
  assertCheck(
    'missing module produces a warning naming the template and module',
    ghostResult.warnings?.length === 1 &&
      ghostResult.warnings[0].includes('"Ghost chain"') &&
      ghostResult.warnings[0].includes('"ghost-module"')
  );
}
{
  const { missingModules } = remapTemplateModules(
    seedTemplates[0],
    new Map([[sourceModule.id, 'new-source']]),
    new Map([[targetModule.id, 'Target']])
  );
  assert.deepEqual(missingModules, ['Target']);
  assertCheck('missing modules are named from the import file when it knows them', true);
}

// --- Old files (1.0.0: no templates, labor, or functions) still import ---
const oldFile: ExportedData = {
  version: '1.0.0',
  exportedAt: exported.exportedAt,
  modules: exported.modules,
  materials: exported.materials,
  customCategories: exported.customCategories,
};
assertCheck('old-format file validates', validateImportedData(oldFile));
seedStores();
const oldReplace = importData(oldFile, { mode: 'replace' });
assertCheck('old-format replace succeeds', oldReplace.success && oldReplace.modulesAdded === 2 && oldReplace.templatesAdded === 0);
assertCheck(
  'old-format replace keeps labor, functions, and templates the file lacks',
  useLaborStore.getState().labor.length === templateLabor.length &&
    useFunctionsStore.getState().functions.length === sharedFunctions.length &&
    useTemplatesStore.getState().templates.length === seedTemplates.length
);
{
  const chain = templateNamed('Chain');
  assert.deepEqual(chain.moduleInstances.map((i) => moduleName(i.moduleId)), ['Source', 'Target']);
  assert.deepEqual(chain.moduleInstances[1].fieldLinks, sourceToTargetLink);
  assertCheck(
    'kept templates follow their modules by name, with a note that they were kept',
    oldReplace.warnings?.length === 1 && oldReplace.warnings[0].includes('2 existing templates were kept')
  );
}
seedStores();
const oldMerge = importData(oldFile, { mode: 'merge' });
assertCheck(
  'old-format merge leaves templates alone',
  oldMerge.success && oldMerge.templatesAdded === 0 && useTemplatesStore.getState().templates[0].moduleInstances[0].moduleId === sourceModule.id
);

// --- Pure helpers and validation ---
{
  const map = buildModuleIdMap(
    [
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Beta' },
      { id: 'c', name: 'Gamma' },
    ],
    [
      { id: 'existing-a', name: 'alpha' },
      { id: 'existing-b', name: 'BETA' },
    ],
    new Map([['a', 'new-a']])
  );
  assert.deepEqual(Object.fromEntries(map), { a: 'new-a', b: 'existing-b' });
  assertCheck('module ID map prefers added modules, then existing names, and omits unknowns', true);
}
assertCheck(
  'template instance without a module ID is rejected',
  !validateImportedData({ ...exported, templates: [{ ...seedTemplates[0], moduleInstances: [{ id: 'x' }] }] })
);
