Underline sub-tabs for Catalog (Materials · Labor · Functions) with counts; sits in PageHeader children.

```jsx
<CatalogTabs items={[{id:'materials',label:'Materials',count:24},{id:'labor',label:'Labor',count:9}]} active="materials" />
```

**Repo target:** new components/shared/catalog/CatalogTabs.tsx. Port to Tailwind using the recipes in MIGRATION.md; keep every value.
