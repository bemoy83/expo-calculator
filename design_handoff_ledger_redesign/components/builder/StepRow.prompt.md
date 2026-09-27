Builder step row: index, label (+ COST badge), formula preview, value; expanded state shows accent border and holds FormulaWell + option chips.

```jsx
<StepRow index={4} label="Bindingsverk antall" value="30.8" unit="m" expanded note="Shown to staff"><FormulaWell>…</FormulaWell></StepRow>
```

**Repo target:** components/calculator-builder/StepRow.tsx. Port to Tailwind using the recipes in MIGRATION.md; keep every value.
