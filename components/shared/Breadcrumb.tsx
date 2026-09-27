'use client';

import React from 'react';
import Link from 'next/link';

export interface Crumb {
  label: string;
  href: string;
}

/** `?id=…&category=…` for a browse page, leaving out what's empty. */
export function browseHref(path: string, params: { id?: string; category?: string }): string {
  const query = new URLSearchParams();
  if (params.category) query.set('category', params.category);
  if (params.id) query.set('id', params.id);
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}

// The page's place in the app, in the page header's eyebrow: PARENT / PARENT · state. Parents
// are links back (to the list with the item still selected); the page itself is the title, so
// it isn't repeated. `onNavigate` can stop a link, e.g. to ask about unsaved edits first.
export function Breadcrumb({
  items,
  meta,
  onNavigate,
}: {
  items: Crumb[];
  /** After the crumbs: "Editing · Unsaved", "3 lines · edited 2 h ago" */
  meta?: React.ReactNode;
  onNavigate?: (href: string, event: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="inline">
        {items.map((item, index) => (
          <li key={item.href + index} className="inline">
            {index > 0 && <span aria-hidden="true"> / </span>}
            <Link
              href={item.href}
              onClick={(event) => onNavigate?.(item.href, event)}
              className="rounded hover:text-ink focus:outline-none focus-visible:text-ink focus-visible:underline"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ol>
      {meta && <span> · {meta}</span>}
    </nav>
  );
}
