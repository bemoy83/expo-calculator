# Computed Outputs - Quote Summary Integration Note

## Use Case Clarification

Computed outputs serve two primary purposes:
1. **Linkable sources** for other modules' formulas (already covered in plan)
2. **Display values** in quote summaries/descriptions (needs explicit implementation)

Currently, `fieldSummary` in `QuoteLineItem` only shows regular field values. Users want to see computed outputs like "Paint Area: 125 m²" in the quote summary.

## Implementation Addition

### Update `addLineItem` in `quotes-store.ts`

**Current** (lines 471-477):
```typescript
const fieldSummary = moduleDef.fields
  .slice(0, 3) // Show first 3 fields
  .map((field) => {
    const value = resolved[field.variableName];
    return `${field.label}: ${value}`;
  })
  .join(', ');
```

**Updated** (include computed outputs):
```typescript
// 1. Evaluate computed outputs first (if not already done)
const computedValues = evaluateComputedOutputs(
  moduleDef,
  resolved,
  materials,
  functions
);

// 2. Merge computed values into resolved for summary generation
const resolvedWithComputed = {
  ...resolved,
  ...Object.fromEntries(
    Object.entries(computedValues.computedValues).map(([key, value]) => [
      key.replace('out.', ''), // Remove prefix for display
      value
    ])
  )
};

// 3. Generate summary prioritizing computed outputs, then regular fields
const summaryParts: string[] = [];

// Add computed outputs first (they're often the most important)
if (moduleDef.computedOutputs) {
  moduleDef.computedOutputs.forEach((output) => {
    const value = computedValues.computedValues[`out.${output.variableName}`];
    if (value !== null && value !== undefined) {
      const unitStr = output.unitSymbol ? ` ${output.unitSymbol}` : '';
      summaryParts.push(`${output.label}: ${value}${unitStr}`);
    }
  });
}

// Add regular fields (limit total to 3-4 items)
const remainingSlots = Math.max(0, 4 - summaryParts.length);
if (remainingSlots > 0) {
  moduleDef.fields
    .slice(0, remainingSlots)
    .forEach((field) => {
      const value = resolved[field.variableName];
      if (value !== null && value !== undefined) {
        summaryParts.push(`${field.label}: ${value}`);
      }
    });
}

const fieldSummary = summaryParts.join(', ') || 'No details';
```

**Alternative Approach** (simpler):
```typescript
// Generate summary with computed outputs and fields
const summaryParts: string[] = [];

// Add computed outputs
if (moduleDef.computedOutputs) {
  moduleDef.computedOutputs.forEach((output) => {
    const value = computedValues.computedValues[`out.${output.variableName}`];
    if (value !== null && value !== undefined) {
      const unitStr = output.unitSymbol ? ` ${output.unitSymbol}` : '';
      summaryParts.push(`${output.label}: ${value}${unitStr}`);
    }
  });
}

// Add regular fields (up to 3 total)
const fieldParts = moduleDef.fields
  .slice(0, Math.max(0, 3 - summaryParts.length))
  .map((field) => {
    const value = resolved[field.variableName];
    return value !== null && value !== undefined ? `${field.label}: ${value}` : null;
  })
  .filter(Boolean) as string[];

const fieldSummary = [...summaryParts, ...fieldParts].join(', ') || 'No details';
```

## Display Examples

**Before** (only regular fields):
```
Paint Job: Width: 10, Height: 5, Paint: 2 L/m²
```

**After** (with computed outputs):
```
Paint Job: Paint Area: 50 m², Coverage: 100 m², Width: 10
```

Or if computed outputs are prioritized:
```
Paint Job: Paint Area: 50 m², Coverage: 100 m²
```

## Integration Points

1. **Phase 3** (Evaluation Logic): Ensure `evaluateComputedOutputs` is called before `addLineItem` generates summary
2. **Phase 6** (UI Display): Update `QuoteSummaryCard` to optionally show computed outputs separately (if needed)
3. **New Phase 9**: Update `addLineItem` to include computed outputs in `fieldSummary`

## Storage Consideration

When creating `QuoteLineItem`, should we also store computed output values?

**Option A**: Store in `fieldValues` snapshot (with `out.` prefix)
```typescript
fieldValues: {
  width: 10,
  height: 5,
  'out.area': 50, // Computed output snapshot
}
```

**Option B**: Store separately in new `computedOutputs` field
```typescript
computedOutputs: {
  area: 50,
  volume: 250,
}
```

**Recommendation**: Option A (store in `fieldValues` with `out.` prefix) for consistency and simplicity.

## Updated Plan Phase

Add to **Phase 3** or create **Phase 9**:

**Phase 9: Quote Summary Integration**
- Update `addLineItem` to evaluate computed outputs
- Include computed outputs in `fieldSummary` generation
- Prioritize computed outputs in summary (they're often the key metrics)
- Format with units: `"Paint Area: 50 m²"`
- Store computed outputs in `fieldValues` snapshot (with `out.` prefix)


