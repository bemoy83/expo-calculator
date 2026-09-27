52px app top bar: brand mark, the three top-level tabs, right slot for Settings/avatar.

```jsx
<TopBar tabs={[{id:'calculators',label:'Calculators'},{id:'quotes',label:'Quotes'},{id:'catalog',label:'Catalog'}]} active="quotes" right={<span>Settings</span>} />
```

**Repo target:** new components/TopBar.tsx (replaces AppSidebar in Layout.tsx). Port to Tailwind using the recipes in MIGRATION.md; keep every value.
