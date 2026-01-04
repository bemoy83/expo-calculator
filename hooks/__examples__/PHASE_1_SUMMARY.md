# Phase 1: Data Layer - Implementation Summary

## Overview

Phase 1 implements the core data analysis logic for the Template Preview Sidebar. This phase focuses on **read-only analysis** of existing template structure without any UI updates or interactive features.

## What Was Implemented

### 1. Core Hook: `useTemplateLinkAnalysis`

**Location:** `/hooks/use-template-link-analysis.ts`

**Purpose:** Analyzes template structure to identify link topology, opportunities, and statistics.

**Key Features:**
- ✅ Detects link sources (fields/computed outputs that others link to)
- ✅ Identifies link opportunities (unlinked fields with suggested sources)
- ✅ Respects module order hierarchy (earlier modules = primary sources)
- ✅ Supports computed outputs as first-class link sources
- ✅ Smart matching with confidence scoring (name + unit + type)
- ✅ Calculates comprehensive statistics

**Inputs:**
```typescript
useTemplateLinkAnalysis(
  workspaceModules: QuoteModuleInstance[],
  modules: CalculationModule[]
): TemplateLinkAnalysis
```

**Outputs:**
```typescript
interface TemplateLinkAnalysis {
  primaryModule: PrimaryModuleInfo | null;
  linkSources: LinkSource[];
  linkOpportunities: LinkOpportunity[];
  stats: {
    totalModules: number;
    totalFields: number;
    totalComputedOutputs: number;
    linkedFields: number;
    unlinkedFields: number;
    coveragePercent: number;
  };
}
```

### 2. Type Definitions

**New interfaces exported:**
- `LinkSource` - Represents a field/computed output that acts as a link source
- `SuggestedSource` - Represents a suggested link target with confidence
- `LinkOpportunity` - Represents an unlinked field with suggestions
- `PrimaryModuleInfo` - Information about the primary (first) module
- `TemplateLinkAnalysis` - Complete analysis result

### 3. Matching Algorithm

**Confidence Scoring (0-100):**
```
Name Matching:
  Exact match:      +50 points (width = width)
  Similar:          +30 points (qty ≈ quantity)

Unit Matching:
  Same category:    +30 points (ft = ft)
  Same symbol:      +10 points (ft vs ft)
  Both unitless:    +20 points

Type Matching:
  Same type:        +10 points (number = number)

Maximum:          100 points
Minimum to suggest: 30 points
```

**Reason Generation:**
Human-readable explanations like:
- "Matching name • Matching unit (ft) • Compatible type"
- "Similar name • Compatible unit"

### 4. Primary Module Pattern

**Logic:**
- First module in template order = Primary module
- Primary module fields are prioritized as link sources
- Suggestions prioritize linking to primary module first
- Matches construction/estimation workflow (define core → add dependent work)

### 5. Computed Output Support

**Features:**
- Computed outputs detected as potential link sources
- Identified by `out.` prefix in `fieldVariableName`
- Unit compatibility checking works for computed outputs
- Properly labeled in suggestions with "Computed output" tag

### 6. Link Topology Analysis

**Reverse Link Mapping:**
Builds a reverse index to answer "which fields link TO this source?"

Example:
```
Framing.width is linked by:
  - Drywall.width
  - Paint.width
  - Tile.width (suggested, not yet linked)
```

## Example Usage

See: `/hooks/__examples__/use-template-link-analysis.example.tsx`

```typescript
// In your component
const analysis = useTemplateLinkAnalysis(workspaceModules, modules);

// Access data
console.log(analysis.stats.coveragePercent); // 75
console.log(analysis.primaryModule?.name); // "Framing"

// Show link sources
analysis.linkSources.forEach(source => {
  console.log(`${source.moduleName}.${source.fieldVariableName}`);
  console.log(`  Linked by ${source.linkedBy.length} fields`);
});

// Show opportunities
analysis.linkOpportunities.forEach(opp => {
  const best = opp.suggestedSources[0];
  console.log(`${opp.moduleName}.${opp.fieldLabel}`);
  console.log(`  → ${best.fieldLabel} (${best.confidence}%)`);
});
```

## Design Decisions

### ✅ User-Declared Approach
- No auto-detection of "required" fields
- Respects existing link structure
- Visualizes what IS, suggests what COULD BE

### ✅ Module Order = Hierarchy
- First module = Primary (source of truth)
- Only suggest links to EARLIER modules
- Prevents circular references naturally
- Matches user mental model

### ✅ Local Values Preserved
- Link = override, not replacement
- Local values remain stored when linked
- Safe to experiment with links (can unlink without data loss)
- Hook tracks `hasLocalValue` for each link target

### ✅ Computed Outputs as First-Class Citizens
- Can be link sources just like regular fields
- Properly handled in matching algorithm
- Unit compatibility checking works correctly
- Example: `Framing.out.wall_area` → `Drywall.coverage_area`

### ✅ Simple, Deterministic Matching
- No AI/ML required
- Name similarity using common variations
- Unit category matching
- Type compatibility from existing utilities
- Transparent confidence scores

## Integration Points

### Existing Utilities Used:
1. `areTypesCompatible()` from `lib/utils/field-linking.ts`
   - Reused for type compatibility checking
   - Ensures consistency with existing link validation

2. Field/Module type definitions from `lib/types.ts`
   - `Field`, `ComputedOutput`, `CalculationModule`, `QuoteModuleInstance`

3. React `useMemo` for performance
   - Recomputes only when inputs change
   - Efficient for large templates

### Data Sources:
- `workspaceModules` - From `useTemplateEditor` hook
- `modules` - From modules store
- Both already available in template editor context

## Performance Characteristics

**Complexity:**
- O(n × m) where n = modules, m = fields per module
- Negligible for typical templates (< 10 modules, < 10 fields each)
- `useMemo` prevents unnecessary recalculations

**Memory:**
- Builds reverse link map: O(links)
- Stores suggestions: O(opportunities × suggestions)
- Typical: < 100KB for large template

## Testing

### Test Scenario (from example):
```
Template: Room Estimation
├─ Framing (PRIMARY)
│  ├─ width: 10 ft
│  ├─ height: 8 ft
│  ├─ qty: 4
│  └─ out.wall_area: 80 ft² (computed)
├─ Drywall
│  ├─ width → Framing.width (linked)
│  ├─ height → Framing.height (linked)
│  └─ coverage_area → Framing.out.wall_area (linked)
├─ Paint
│  ├─ width → Framing.width (linked)
│  ├─ height → Framing.height (linked)
│  └─ quantity (UNLINKED - opportunity!)
└─ Tile
   └─ width (UNLINKED - opportunity!)

Expected Analysis:
✓ Primary Module: Framing
✓ Coverage: ~60% (5 linked / 9 total)
✓ Link Sources: 3 (width, height, out.wall_area)
✓ Opportunities: 2 (Paint.quantity, Tile.width)
✓ Best suggestion: Tile.width → Framing.width (90%)
```

## Next Steps

### Phase 2: Visualization (Upcoming)
- [ ] Update `TemplatePreviewSidebar` to consume this hook
- [ ] Replace mock data with real analysis
- [ ] Display primary module indicator
- [ ] Show link sources with "linked by" counts
- [ ] Display opportunities with confidence badges
- [ ] Handle empty states

### Phase 3: Interactivity (Future)
- [ ] Wire "Apply link" buttons to `useTemplateEditor.linkField()`
- [ ] Implement batch link actions
- [ ] Add undo/redo support
- [ ] Confirmation dialogs for risky actions

## Files Modified/Created

### Created:
1. `/hooks/use-template-link-analysis.ts` - Main hook (462 lines)
2. `/hooks/__examples__/use-template-link-analysis.example.tsx` - Usage example (313 lines)
3. `/hooks/__examples__/PHASE_1_SUMMARY.md` - This document

### Dependencies:
- `@/lib/types` - Type definitions
- `@/lib/utils/field-linking` - Existing utilities
- `react` - useMemo hook

## Validation Checklist

- [x] TypeScript compiles without errors
- [x] All interfaces properly exported
- [x] JSDoc documentation complete
- [x] Example usage provided
- [x] No external dependencies added
- [x] Follows existing code patterns
- [x] Performance optimized with useMemo
- [x] Handles edge cases (empty templates, no links, etc.)
- [x] Respects module order hierarchy
- [x] Supports computed outputs
- [x] Confidence scoring works correctly
- [x] No breaking changes to existing code

---

**Status:** ✅ Phase 1 Complete - Ready for Phase 2 (Visualization)
