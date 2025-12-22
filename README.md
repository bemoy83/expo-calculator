# Event Construction Cost Estimator

A professional web application for building multi-module construction cost estimates with dynamic formula evaluation and reusable calculation modules.

## Features

### Admin Features
- **Materials Manager**: Create and manage materials with prices, categories, units, and variable names
- **Module Manager**: Build reusable calculation modules with:
  - Custom input fields (number, text, dropdown, boolean)
  - Variable name assignment for each field
  - Formula definition using field and material variables
  - Real-time formula validation

### Quote Builder
- Add multiple modules to a single quote
- Add the same module multiple times
- Live calculation updates as values change
- Running subtotal, tax, and final total
- Quote summary panel with line items
- Export quotes as JSON or print/PDF

### Technical Highlights
- Clean architecture with Zustand state management
- Formula evaluation engine with variable substitution
- Variable validation and error handling
- Dark SaaS dashboard UI with modern design
- Responsive layout for all screen sizes

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## Usage Guide

### 1. Set Up Materials

Navigate to the **Materials** page and add materials that you'll reference in formulas:
- Each material needs a unique variable name (e.g., `lumber_price`, `hourly_rate`)
- Materials can be organized by category
- Prices can be updated and will automatically affect all future calculations

### 2. Create Calculation Modules

Go to the **Modules** page to create reusable calculation modules:
- Add custom input fields with different types
- Assign variable names to each field
- Write formulas using field variables and material variables
- Example formula: `width * height * lumber_price + labor_hours * hourly_rate`

### 3. Build Quotes

Use the **Quote Builder** to create client quotes:
- Add modules to your quote
- Fill in field values for each module instance
- Watch costs calculate automatically
- Adjust tax rate as needed
- Export or print the final quote

## Formula Syntax

Formulas support standard mathematical operations:
- Basic: `+`, `-`, `*`, `/`
- Parentheses: `()`
- Functions: `sqrt()`, `max()`, `min()`, `abs()`, etc.
- Constants: `pi`, `e`

Example formulas:
- `length * width * material_price`
- `(base_cost + labor_hours * hourly_rate) * 1.1`
- `sqrt(area) * price_per_unit`

## Project Structure

```
├── app/
│   ├── page.tsx              # Dashboard
│   ├── materials/
│   │   └── page.tsx          # Materials Manager
│   ├── modules/
│   │   └── page.tsx          # Module Manager
│   └── quotes/
│       └── page.tsx          # Quote Builder
├── components/
│   ├── Layout.tsx            # Main layout with navigation
│   └── ui/                   # Reusable UI components
├── lib/
│   ├── stores/               # Zustand state stores
│   ├── formula-evaluator.ts  # Formula evaluation engine
│   ├── types.ts              # TypeScript types
│   └── utils.ts              # Utility functions
└── package.json
```

## Technologies Used

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **mathjs** - Formula evaluation
- **Lucide React** - Icons

## License

MIT


