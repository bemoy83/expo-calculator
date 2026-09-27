One ledger row; hover/selected lift to surface; hoverCell swaps the last cell (e.g. ⋯ → Delete) on hover.

```jsx
<LedgerRow cells={['Stand A04','8','$12 480.00','⋯']} hoverCell="Delete" />
```

**Repo target:** components/shared/catalog/CatalogTableRow.tsx, QuoteCard → row. Port to Tailwind using the recipes in MIGRATION.md; keep every value.
