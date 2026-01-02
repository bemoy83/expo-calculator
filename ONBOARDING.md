# Project Context

## Project Name
**Event Construction Cost Estimator** (expo-calculator)

## Purpose
A professional web application for building multi-module construction cost estimates with dynamic formula evaluation and reusable calculation modules. 

**Target Users:**
- Construction contractors and estimators
- Event planners managing construction/installation costs
- Businesses creating detailed cost quotes for clients

**Problem Solved:**
- Enables creation of reusable calculation modules (e.g., "Wall Installation", "Flooring")
- Supports complex formulas with material prices and field variables
- Generates professional quotes with automatic calculations
- Manages materials catalog with pricing
- Creates templates for common project configurations

## Platform
**Web Application** - Single Page Application (SPA) built with Next.js

## Tech Stack

### Core Framework
- **Next.js 14.2** - React framework with App Router
- **React 18.3** - UI library
- **TypeScript 5.9** - Type safety

### State Management
- **Zustand 4.5** - Lightweight state management with persistence middleware
- **Local Storage** - Data persistence via Zustand persist middleware

### Styling & UI
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **Material Design 3** - Design system compliance
- **next-themes 0.2** - Theme switching (light/dark/system)
- **Lucide React 0.344** - Icon library

### Drag & Drop
- **@dnd-kit/core 6.3** - Core drag-and-drop functionality
- **@dnd-kit/sortable 8.0** - Sortable list implementation
- **@dnd-kit/modifiers 9.0** - Drag modifiers (e.g., restrictToVerticalAxis)
- **@dnd-kit/utilities 3.2** - Utility functions

### Formula Evaluation
- **mathjs 12.3** - Mathematical expression evaluation

### Utilities
- **clsx 2.1** - Conditional className utility
- **tailwind-merge 2.2** - Merge Tailwind classes intelligently

### Development Tools
- **ESLint 8.56** - Code linting (Next.js config)
- **TypeScript** - Static type checking
- **ts-node** - TypeScript execution for tests

## Architecture Overview

### Frontend
**Next.js App Router Architecture:**
- **Pages** (`app/` directory):
  - `/` - Dashboard with overview cards
  - `/materials` - Materials catalog management
  - `/modules` - Calculation module editor
  - `/templates` - Template management (single-page toggle: list ↔ editor)
  - `/quotes` - Quote builder

**Component Structure:**
- **Layout Components** (`components/Layout.tsx`) - Main navigation and layout wrapper
- **UI Components** (`components/ui/`) - Reusable primitives (Button, Card, Input, Select, etc.)
- **Feature Components** (`components/module-editor/`, `components/quotes/`) - Domain-specific components
- **Shared Components** (`components/shared/`) - Cross-feature reusable components

**State Management:**
- **Zustand Stores** (`lib/stores/`):
  - `materials-store.ts` - Materials catalog
  - `modules-store.ts` - Calculation modules
  - `quotes-store.ts` - Quotes and quote builder state
  - `templates-store.ts` - Template definitions
  - `categories-store.ts` - Category management
- All stores use `persist` middleware for localStorage persistence

**Custom Hooks** (`hooks/`):
- `use-field-manager.ts` - Field state management for module editor
- `use-formula-validation.ts` - Formula syntax and variable validation
- `use-formula-evaluator.ts` - Formula evaluation logic
- `use-formula-variables.ts` - Variable extraction and autocomplete
- `use-formula-autocomplete.ts` - Formula editor autocomplete
- `use-preview-cost.ts` - Cost preview calculations
- `use-quote-field-linking.ts` - Field linking logic for quote builder
- `use-sortable-list.ts` - Drag-and-drop list management
- `use-template-editor.ts` - Template editor state management
- `use-theme-importer.ts` - Theme import/export functionality

### Backend
**None** - Client-side only application with localStorage persistence

### Database
**None** - All data stored in browser localStorage via Zustand persist middleware

### Services / Integrations
- **None** - Standalone application, no external APIs

## Current Status

### What's Done

**Core Features:**
✅ Materials catalog with categories, properties, units, and pricing
✅ Calculation module editor with custom fields (number, text, dropdown, boolean, material)
✅ Formula builder with real-time validation and autocomplete
✅ Variable name management and validation
✅ Unit system with category support (length, area, volume, weight, etc.)
✅ Template system for reusable module configurations
✅ Template editor with field linking between module instances
✅ Quote builder with multiple module instances
✅ Live cost calculations with automatic updates
✅ Quote summary with line items, subtotals, tax, and totals
✅ Data import/export (JSON)
✅ Theme import/export (Material Design 3 themes)
✅ Dark/light theme support with system preference detection
✅ Drag-to-reorder for fields and modules
✅ Responsive design for all screen sizes

**UI/UX:**
✅ Material Design 3 compliant color system
✅ Consistent component library
✅ Accessible components (ARIA labels, keyboard navigation)
✅ Smooth animations and transitions
✅ Professional dashboard layout

**Technical:**
✅ TypeScript throughout
✅ Component-based architecture
✅ Reusable hooks pattern
✅ State management with Zustand
✅ Formula evaluation engine
✅ Unit conversion and normalization
✅ Field linking system for templates

### What's Missing

**Features:**
- [ ] User authentication/authorization
- [ ] Multi-user support
- [ ] Cloud sync/backup
- [ ] Print/PDF export for quotes (mentioned but may need enhancement)
- [ ] Email quote delivery
- [ ] Quote history/versioning
- [ ] Material price history/tracking
- [ ] Module versioning
- [ ] Advanced formula functions
- [ ] Formula templates/library
- [ ] Bulk operations (bulk edit materials, etc.)
- [ ] Search/filter functionality
- [ ] Data analytics/reporting

**Technical:**
- [ ] Backend API (if multi-user needed)
- [ ] Database (if persistence beyond localStorage needed)
- [ ] Testing suite (unit tests, integration tests)
- [ ] E2E testing
- [ ] Error boundary components
- [ ] Loading states for async operations
- [ ] Offline support/PWA features

### Known Bugs
- Visual jump when dragging modules upward
- Some hard-coded colors in PDF export (documented in MATERIAL_DESIGN_AUDIT.md)
- Potential: Large datasets may cause performance issues (no pagination/virtualization)

## Design/UX Rules or Branding Constraints

### Material Design 3 Compliance
- **Color System**: Full MD3 color palette implementation
  - Primary, Secondary, Tertiary palettes
  - Surface container hierarchy (lowest → highest)
  - Error, Success, Warning colors
  - Outline and outline-variant
- **Shape System**: MD3 border radius tokens
- **Elevation**: MD3 elevation overlay system (0-24)
- **Typography**: Uses MD3 on-surface/on-primary color roles
- **Theme Support**: Light and dark modes with CSS custom properties

### Design Principles
- **Consistent Spacing**: Uses Tailwind spacing scale
- **Component Variants**: Cards, Buttons, Inputs follow MD3 patterns
- **Accessibility**: ARIA labels, keyboard navigation, focus states
- **Responsive**: Mobile-first approach with breakpoints
- **Visual Feedback**: Hover states, transitions, loading indicators

### UI Patterns
- **Cards**: Primary container for content sections
- **Chips**: Used for tags, categories, field types
- **Elevation**: Depth hierarchy via shadow/elevation classes
- **Rounded Corners**: Uses MD3 shape tokens (extra-small to extra-large)
- **Color Roles**: Always use semantic color tokens (md-primary, md-on-surface, etc.)

## Performance / Security / Compliance Constraints

### Performance
- **Client-Side Only**: No server round-trips, instant interactions
- **LocalStorage Limits**: ~5-10MB typical limit (monitor data size)
- **Large Lists**: No virtualization currently - may need for 100+ items
- **Formula Evaluation**: Uses mathjs - efficient for typical formulas
- **Re-renders**: Uses React.memo and useMemo where appropriate

### Security
- **No Authentication**: Currently single-user, no auth needed
- **XSS Prevention**: React's built-in escaping, no innerHTML usage
- **Data Validation**: TypeScript types + runtime validation for formulas
- **Input Sanitization**: Formula evaluation sanitizes inputs via mathjs

### Compliance
- **No External Data**: No GDPR/privacy concerns (all local)
- **Accessibility**: WCAG compliance via ARIA labels and keyboard navigation

## Coding Style + Standards

### TypeScript
- **Strict Mode**: Enabled (`strict: true` in tsconfig.json)
- **Path Aliases**: `@/*` maps to project root
- **Type Safety**: All components and functions typed
- **Interfaces**: Used for object shapes (not types for unions)

### React Patterns
- **Functional Components**: All components are functional
- **Hooks**: Custom hooks for reusable logic
- **Client Components**: Marked with `'use client'` directive
- **Server Components**: Default (no directive) for static content
- **Hook Rules**: All hooks called unconditionally at top level
- **Hydration**: Use hydration guards (`useState` + `useEffect`) for client-only code

### Component Structure
```typescript
// Standard component pattern
'use client';

import { ... } from '...';

interface ComponentProps {
  // Props typed with interface
}

export function Component({ prop1, prop2 }: ComponentProps) {
  // Hooks first
  const [state, setState] = useState(...);
  
  // Memoized values
  const memoized = useMemo(...);
  
  // Callbacks
  const handleAction = useCallback(...);
  
  // Effects
  useEffect(...);
  
  // Early returns AFTER all hooks
  if (condition) return null;
  
  // Render
  return (...);
}
```

### Naming Conventions
- **Components**: PascalCase (`FieldsManager`, `SortableFieldItem`)
- **Files**: Match component name (`FieldsManager.tsx`)
- **Hooks**: camelCase with `use` prefix (`useFieldManager`, `useFormulaValidation`)
- **Stores**: camelCase with `Store` suffix (`materialsStore`, `modulesStore`)
- **Types/Interfaces**: PascalCase (`Field`, `CalculationModule`, `Quote`)
- **Functions**: camelCase (`handleReorder`, `toggleFieldExpanded`)
- **Constants**: UPPER_SNAKE_CASE or camelCase depending on context

### File Organization
```
app/                    # Next.js pages (routes)
components/             # React components
  ui/                  # Reusable UI primitives
  module-editor/       # Module editor specific
  quotes/              # Quote builder specific
  shared/              # Cross-feature components
hooks/                 # Custom React hooks
lib/                   # Core libraries
  stores/             # Zustand stores
  themes/            # Theme management
  utils/              # Utility functions
  types.ts            # Shared TypeScript types
```

### State Management Patterns
- **Zustand Stores**: One store per domain (materials, modules, quotes, etc.)
- **Persistence**: All stores use `persist` middleware
- **Selectors**: Use object selectors for multiple values to reduce re-renders
- **Actions**: Store actions are pure functions updating state immutably

### Drag & Drop Patterns
- **SortableList**: Reusable wrapper component for sortable lists
- **useSortableList**: Shared hook for drag-and-drop logic
- **Ref Handling**: Use `useCallback` for stable ref callbacks
- **Component Stability**: Always render components (no early returns before hooks)
- **Memoization**: Memoize lookups (e.g., module maps) to prevent re-renders

### Code Quality
- **ESLint**: Next.js ESLint config with React hooks rules
- **TypeScript**: Strict mode, no `any` types
- **Comments**: JSDoc for complex functions, inline comments for non-obvious logic
- **Error Handling**: Try-catch for formula evaluation, validation before operations

### Import Organization
```typescript
// 1. React/Next.js imports
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. Third-party libraries
import { useSortable } from '@dnd-kit/sortable';

// 3. Internal components
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';

// 4. Internal hooks
import { useFieldManager } from '@/hooks/use-field-manager';

// 5. Internal utilities/types
import { Field } from '@/lib/types';
import { generateId } from '@/lib/utils';

// 6. Icons
import { Plus, Trash2 } from 'lucide-react';
```

### Key Architectural Principles
1. **Separation of Concerns**: UI components, business logic (hooks), state (stores)
2. **Reusability**: Shared components and hooks
3. **Type Safety**: TypeScript throughout
4. **Performance**: Memoization, stable references, efficient re-renders
5. **Accessibility**: ARIA labels, keyboard navigation
6. **Consistency**: Follow established patterns (FieldsManager → ModulesManager)
7. **Hydration Safety**: Always guard client-only code
8. **Hook Stability**: Never call hooks conditionally



