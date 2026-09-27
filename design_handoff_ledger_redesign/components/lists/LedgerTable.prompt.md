Ledger table shell: mono uppercase header row + grid template shared with LedgerRow children.

```jsx
<LedgerTable columns={[{label:'Quote'},{label:'Total',align:'right',width:'160px'}]}>…</LedgerTable>
```

**Repo target:** components/shared/catalog/CatalogPageShell.tsx header, QuoteBoard list. Port to Tailwind using the recipes in MIGRATION.md; keep every value.
