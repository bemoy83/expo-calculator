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
  { name: 'Quote Builder', href: '/quotes', icon: Calculator },
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="bg-card border-b border-border shadow-elevated sticky top-0 z-50 backdrop-blur-md bg-card/98">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10">
                <FileText className="h-5 w-5 text-accent" />
              </div>
              <h1 className="text-xl font-bold text-foreground">
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
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-smooth',
                        isActive
                          ? 'bg-accent text-accent-foreground shadow-soft'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
              <div className="h-6 w-px bg-border" />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

