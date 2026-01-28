'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { sidebarNavigation } from './navigation';

export function MobileBottomNav(): React.ReactElement {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-center px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none"
      aria-label="Primary navigation"
    >
      <div
        className={cn(
          'pointer-events-auto flex w-full max-w-md items-center justify-between rounded-xl border bg-background/95 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/80',
          'p-2'
        )}
      >
        {sidebarNavigation.map(item => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex min-h-[44px] min-w-[44px] flex-col items-center justify-between gap-0.5 rounded-lg p-2.5 transition-colors touch-manipulation',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
