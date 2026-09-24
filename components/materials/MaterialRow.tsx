'use client';

import {
  CatalogPropertiesCell,
  CatalogTableRow,
  useCatalogLayout,
} from '@/components/shared/catalog/CatalogTableRow';
import { formatCatalogPropertyValue } from '@/lib/catalog/catalog-display';
import { useCurrencyStore } from '@/lib/stores/currency-store';
import type { Material } from '@/lib/types';

// Name · Variable · Properties · Price · Unit (see MATERIAL_COLUMNS in app/materials/page.tsx).
export function MaterialRow({
  material,
  isSelected,
  disableDrag,
  onOpen,
}: {
  material: Material;
  isSelected: boolean;
  disableDrag: boolean;
  onOpen: (material: Material) => void;
}) {
  const formatCurrency = useCurrencyStore((state) => state.formatCurrency);
  const layout = useCatalogLayout();
  const detail = material.sku ? `SKU ${material.sku}` : material.supplier || '—';

  return (
    <CatalogTableRow
      id={material.id}
      name={material.name}
      subtitle={`${material.category} · ${detail}`}
      isSelected={isSelected}
      disableDrag={disableDrag}
      onOpen={() => onOpen(material)}
      cells={[
        {
          content: <code className="text-xs font-numeric font-medium text-action break-all">{material.variableName}</code>,
          hideOnMobile: true,
        },
        {
          content: (
            <CatalogPropertiesCell
              properties={(material.properties ?? []).map((prop) => ({
                id: prop.id,
                name: prop.name,
                display: formatCatalogPropertyValue(prop),
              }))}
            />
          ),
          hideOnMobile: true,
        },
        {
          content: (
            <span className="text-sm font-numeric font-medium text-ink whitespace-nowrap">
              {formatCurrency(material.price)}
              <span className={`${layout.narrowOnly} text-xs font-normal text-ink-muted`}> / {material.unit}</span>
            </span>
          ),
          align: 'right',
        },
        {
          content: <span className="text-xs font-numeric text-ink-body">{material.unit}</span>,
          align: 'right',
          hideOnMobile: true,
        },
      ]}
    />
  );
}
