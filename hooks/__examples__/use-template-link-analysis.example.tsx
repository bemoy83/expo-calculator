/**
 * Example Usage: useTemplateLinkAnalysis Hook
 *
 * This file demonstrates how the template link analysis hook works
 * with sample data representing a typical room estimation template.
 */

import { useTemplateLinkAnalysis } from "../use-template-link-analysis";
import { CalculationModule, QuoteModuleInstance } from "@/lib/types";

// Example: Room Estimation Template
// Module 1: Framing (PRIMARY - source of dimensions)
// Module 2: Drywall (links to Framing dimensions)
// Module 3: Paint (links to Framing dimensions)
// Module 4: Tile (has some unlinked fields)

export function TemplateLinkAnalysisExample() {
  // Mock module definitions
  const modules: CalculationModule[] = [
    {
      id: "framing-module",
      name: "Framing",
      category: "Structure",
      fields: [
        {
          id: "f1",
          label: "Width",
          type: "number",
          variableName: "width",
          unitCategory: "length",
          unitSymbol: "ft",
        },
        {
          id: "f2",
          label: "Height",
          type: "number",
          variableName: "height",
          unitCategory: "length",
          unitSymbol: "ft",
        },
        {
          id: "f3",
          label: "Quantity",
          type: "number",
          variableName: "qty",
        },
      ],
      computedOutputs: [
        {
          id: "co1",
          label: "Wall Area",
          variableName: "wall_area",
          expression: "width * height",
          unitCategory: "area",
          unitSymbol: "ft2",
        },
      ],
      formula: "width * height * qty * 5.5",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "drywall-module",
      name: "Drywall",
      category: "Finish",
      fields: [
        {
          id: "d1",
          label: "Width",
          type: "number",
          variableName: "width",
          unitCategory: "length",
          unitSymbol: "ft",
        },
        {
          id: "d2",
          label: "Height",
          type: "number",
          variableName: "height",
          unitCategory: "length",
          unitSymbol: "ft",
        },
        {
          id: "d3",
          label: "Coverage Area",
          type: "number",
          variableName: "coverage_area",
          unitCategory: "area",
          unitSymbol: "ft2",
        },
      ],
      formula: "width * height * 3.5",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "paint-module",
      name: "Paint",
      category: "Finish",
      fields: [
        {
          id: "p1",
          label: "Width",
          type: "number",
          variableName: "width",
          unitCategory: "length",
          unitSymbol: "ft",
        },
        {
          id: "p2",
          label: "Height",
          type: "number",
          variableName: "height",
          unitCategory: "length",
          unitSymbol: "ft",
        },
        {
          id: "p3",
          label: "Quantity",
          type: "number",
          variableName: "quantity",
        },
      ],
      formula: "width * height * 2.0",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "tile-module",
      name: "Tile",
      category: "Finish",
      fields: [
        {
          id: "t1",
          label: "Width",
          type: "number",
          variableName: "width",
          unitCategory: "length",
          unitSymbol: "ft",
        },
        {
          id: "t2",
          label: "Tile Size",
          type: "number",
          variableName: "tile_size",
          unitCategory: "length",
          unitSymbol: "in",
        },
      ],
      formula: "width * 10",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  // Mock workspace modules (template instances with links)
  const workspaceModules: QuoteModuleInstance[] = [
    // Instance 1: Framing (PRIMARY)
    {
      id: "framing-1",
      moduleId: "framing-module",
      fieldValues: {
        width: 10,
        height: 8,
        qty: 4,
      },
      fieldLinks: {}, // No links - this is the source
      calculatedCost: 1760,
    },
    // Instance 2: Drywall (links to Framing)
    {
      id: "drywall-1",
      moduleId: "drywall-module",
      fieldValues: {
        width: 10, // Has local value
        height: 8, // Has local value
        coverage_area: 0, // No local value
      },
      fieldLinks: {
        width: { moduleInstanceId: "framing-1", fieldVariableName: "width" },
        height: { moduleInstanceId: "framing-1", fieldVariableName: "height" },
        coverage_area: { moduleInstanceId: "framing-1", fieldVariableName: "out.wall_area" },
      },
      calculatedCost: 280,
    },
    // Instance 3: Paint (partially linked)
    {
      id: "paint-1",
      moduleId: "paint-module",
      fieldValues: {
        width: 10,
        height: 8,
        quantity: 0, // Unlinked, no local value
      },
      fieldLinks: {
        width: { moduleInstanceId: "framing-1", fieldVariableName: "width" },
        height: { moduleInstanceId: "framing-1", fieldVariableName: "height" },
        // quantity is NOT linked (opportunity!)
      },
      calculatedCost: 160,
    },
    // Instance 4: Tile (unlinked)
    {
      id: "tile-1",
      moduleId: "tile-module",
      fieldValues: {
        width: 5, // Different value - unlinked
        tile_size: 12,
      },
      fieldLinks: {}, // No links (opportunities exist!)
      calculatedCost: 50,
    },
  ];

  // USE THE HOOK
  const analysis = useTemplateLinkAnalysis(workspaceModules, modules);

  return (
    <div className="p-8 space-y-8 max-w-4xl">
      <h1 className="text-2xl font-bold">Template Link Analysis Example</h1>

      {/* Statistics */}
      <section className="p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Statistics</h2>
        <pre className="text-sm">
          {JSON.stringify(analysis.stats, null, 2)}
        </pre>
      </section>

      {/* Primary Module */}
      <section className="p-4 bg-blue-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Primary Module</h2>
        <pre className="text-sm">
          {JSON.stringify(analysis.primaryModule, null, 2)}
        </pre>
        <p className="mt-2 text-sm text-gray-600">
          The first module acts as the source of truth. It has{" "}
          {analysis.primaryModule?.fieldsAsSource} fields and{" "}
          {analysis.primaryModule?.computedOutputsAsSource} computed outputs
          being used as link sources.
        </p>
      </section>

      {/* Link Sources */}
      <section className="p-4 bg-green-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">
          Link Sources ({analysis.linkSources.length})
        </h2>
        <p className="text-sm text-gray-600 mb-3">
          Fields and computed outputs that other modules link to
        </p>
        {analysis.linkSources.map((source, idx) => (
          <div key={idx} className="mb-4 p-3 bg-white rounded border">
            <div className="font-mono text-sm font-medium">
              {source.moduleName}.{source.fieldVariableName}
              {source.isComputedOutput && (
                <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                  Computed
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Linked by {source.linkedBy.length} field(s)
            </div>
            <ul className="mt-2 space-y-1">
              {source.linkedBy.map((link, i) => (
                <li key={i} className="text-xs text-gray-600">
                  • {link.moduleName}.{link.fieldLabel}
                  {link.hasLocalValue && (
                    <span className="ml-1 text-orange-600">(has local value)</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* Link Opportunities */}
      <section className="p-4 bg-amber-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">
          Link Opportunities ({analysis.linkOpportunities.length})
        </h2>
        <p className="text-sm text-gray-600 mb-3">
          Unlinked fields with suggested sources
        </p>
        {analysis.linkOpportunities.map((opp, idx) => (
          <div key={idx} className="mb-4 p-3 bg-white rounded border">
            <div className="font-mono text-sm font-medium">
              {opp.moduleName}.{opp.fieldLabel}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {opp.hasLocalValue ? (
                <span className="text-orange-600">Has local value</span>
              ) : (
                <span className="text-red-600">No local value</span>
              )}
            </div>
            <div className="mt-3 space-y-2">
              <div className="text-xs font-semibold text-gray-700">
                Suggested sources:
              </div>
              {opp.suggestedSources.map((suggestion, i) => (
                <div
                  key={i}
                  className="text-xs p-2 bg-gray-50 rounded border border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono">
                      {suggestion.moduleName}.{suggestion.fieldLabel}
                    </span>
                    <span className="font-semibold text-green-600">
                      {suggestion.confidence}%
                    </span>
                  </div>
                  <div className="text-gray-500 mt-1">{suggestion.reason}</div>
                  {suggestion.isComputedOutput && (
                    <div className="mt-1 text-purple-600">Computed output</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Expected Results */}
      <section className="p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Expected Results</h2>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li>Primary Module: Framing (first in list)</li>
          <li>Coverage: ~60% (5 linked out of ~9 total fields)</li>
          <li>Link Sources: 3 (Framing.width, Framing.height, Framing.out.wall_area)</li>
          <li>Opportunities: 2 (Paint.quantity, Tile.width)</li>
          <li>
            Paint.quantity should suggest Framing.qty with ~70% confidence
            (similar names)
          </li>
          <li>
            Tile.width should suggest Framing.width with ~90% confidence
            (exact name match)
          </li>
        </ul>
      </section>
    </div>
  );
}
