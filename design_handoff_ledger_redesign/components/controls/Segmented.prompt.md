Segmented control on a sunken track: Parts/Layout switch, dropdown-as-buttons inputs (cc 40/60), inspector options.

```jsx
<Segmented options={[{value:'parts',label:'Parts'},{value:'layout',label:'Layout'}]} value="parts" />
```

**Repo target:** CalculatorBuilder view tablist; dropdown widget "buttons". Port to Tailwind using the recipes in MIGRATION.md; keep every value.
