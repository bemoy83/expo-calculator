Full-bleed page header band: eyebrow, 30px title, optional status/description, right-aligned actions, optional sub-tabs slot.

```jsx
<PageHeader eyebrow="7 quotes" title="Quotes" actions={<Button variant="accent">+ New quote</Button>} />
```

**Repo target:** replaces EditorPageHeader + ad-hoc h1 blocks in pages. Port to Tailwind using the recipes in MIGRATION.md; keep every value.
