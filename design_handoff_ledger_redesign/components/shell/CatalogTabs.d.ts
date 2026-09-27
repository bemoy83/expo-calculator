import * as React from 'react';

/** Underline sub-tabs for Catalog (Materials · Labor · Functions) with counts; sits in PageHeader children. */
export interface CatalogTabsProps {
  items: { id: string; label: string; count?: number }[];
  active: string;
  onSelect?: (id: string) => void;
}

export declare function CatalogTabs(props: CatalogTabsProps): React.JSX.Element;
