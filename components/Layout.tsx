'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import { 
  LayoutDashboard, 
  Package, 
  Calculator, 
  FileText,
  Home
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Materials', href: '/materials', icon: Package },
  { name: 'Modules', href: '/modules', icon: LayoutDashboard },
  { name: 'Templates', href: '/templates', icon: FileText },
  { name: 'Quote Builder', href: '/quotes', icon: Calculator },
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-md-surface text-md-on-surface">
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-md-primary focus:text-md-on-primary focus:rounded focus:ring-2 focus:ring-md-primary focus:ring-offset-2"
      >
        Skip to main content
      </a>
      <nav className="bg-md-surface-container border-b border-md-outline sticky top-0 z-50 backdrop-blur-md bg-md-surface-container/98" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-md-primary/10" aria-hidden="true">
                <FileText className="h-5 w-5 text-md-primary" />
              </div>
              <h1 className="text-xl font-bold text-md-on-surface">
                Cost Estimator
              </h1>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-smooth relative',
                        isActive
                          ? 'bg-md-primary text-md-on-primary shadow-sm'
                          : 'text-md-on-surface-variant hover:text-md-on-surface hover-overlay'
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
              <div className="h-6 w-px bg-md-outline" />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

