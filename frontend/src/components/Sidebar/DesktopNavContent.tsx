'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { sidebarNavigation } from './navigation';
import { SidebarUserSection } from './SidebarUserSection';

export interface DesktopNavContentProps {
  onLinkClick?: () => void;
}

export function DesktopNavContent({
  onLinkClick,
}: DesktopNavContentProps): React.ReactElement {
  const pathname = usePathname();

  return (
    <>
      <nav className="flex-1 space-y-0.5 p-2">
        {sidebarNavigation.map(item => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.name} href={item.href} onClick={onLinkClick}>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start h-9 text-sm',
                  isActive && 'bg-secondary text-secondary-foreground'
                )}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.name}
              </Button>
            </Link>
          );
        })}
      </nav>
      <SidebarUserSection onAfterSignOut={onLinkClick} />
    </>
  );
}
