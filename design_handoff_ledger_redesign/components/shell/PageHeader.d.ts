import * as React from 'react';

/** Full-bleed page header band: eyebrow, 30px title, optional status/description, right-aligned actions, optional sub-tabs slot. */
export interface PageHeaderProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Status dot next to the title (builder: "1 step has an error") */
  status?: { tone: 'ok' | 'error'; label: string };
  /** Underline the title as editable (builder) */
  editing?: boolean;
  actions?: React.ReactNode;
  /** Sub-navigation under the title, e.g. <CatalogTabs/>; switches to zero bottom padding */
  children?: React.ReactNode;
}

export declare function PageHeader(props: PageHeaderProps): React.JSX.Element;
