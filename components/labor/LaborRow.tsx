'use client';

import { CatalogPropertiesCell, CatalogTableRow } from '@/components/shared/catalog/CatalogTableRow';
import { formatCatalogPropertyValue } from '@/lib/catalog/catalog-display';
import { useCurrencyStore } from '@/lib/stores/currency-store';
import type { Labor } from '@/lib/types';

// Name · Variable · Properties · Rate (see LABOR_COLUMNS in app/labor/page.tsx).
export function LaborRow({
  laborItem,
  isSelected,
  disableDrag,
  onOpen,
}: {
  laborItem: Labor;
  isSelected: boolean;
  disableDrag: boolean;
  onOpen: (laborItem: Labor) => void;
}) {
  const formatCurrency = useCurrencyStore((state) => state.formatCurrency);

  return (
    <CatalogTableRow
      id={laborItem.id}
      name={laborItem.name}
      subtitle={laborItem.category}
      isSelected={isSelected}
      disableDrag={disableDrag}
      onOpen={() => onOpen(laborItem)}
      cells={[
        {
          content: <code className="text-xs font-numeric font-medium text-action break-all">{laborItem.variableName}</code>,
          hideOnMobile: true,
        },
        {
          content: (
            <CatalogPropertiesCell
              properties={(laborItem.properties ?? []).map((prop) => ({
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
              {formatCurrency(laborItem.cost)}
              <span className="text-xs font-normal text-ink-muted"> / hr</span>
            </span>
          ),
          align: 'right',
        },
      ]}
    />
  );
}
