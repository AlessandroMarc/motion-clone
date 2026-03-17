'use client';

import React from 'react';
import { m } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { sidebarNavigation, supportNavigation } from './navigation';
import { SidebarUserSection } from './SidebarUserSection';

interface NavItemDef {
  name: string;
  href: string;
  icon: React.ElementType;
}

interface NavItemProps {
  item: NavItemDef;
  isActive: boolean;
  layoutId: string;
  onLinkClick?: () => void;
}

function NavItem({ item, isActive, layoutId, onLinkClick }: NavItemProps) {
  return (
    <Link href={item.href} onClick={onLinkClick} className="relative block">
      {isActive && (
        <m.div
          layoutId={layoutId}
          className="absolute inset-0 rounded-md bg-secondary"
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />
      )}
      <Button
        variant={isActive ? 'secondary' : 'ghost'}
        className={cn(
          'relative w-full justify-start h-9 text-sm',
          isActive && 'bg-transparent text-secondary-foreground'
        )}
      >
        <item.icon className="mr-2 h-4 w-4" />
        {item.name}
      </Button>
    </Link>
  );
}

interface DesktopNavContentProps {
  onLinkClick?: () => void;
}

export function DesktopNavContent({
  onLinkClick,
}: DesktopNavContentProps): React.ReactElement {
  const pathname = usePathname();

  return (
    <>
      <nav className="flex-1 space-y-0.5 p-2">
        {sidebarNavigation.map(item => (
          <NavItem
            key={item.name}
            item={item}
            isActive={pathname === item.href}
            layoutId="sidebar-active"
            onLinkClick={onLinkClick}
          />
        ))}
      </nav>
      <nav className="space-y-0.5 p-2 border-t">
        {supportNavigation.map(item => (
          <NavItem
            key={item.name}
            item={item}
            isActive={pathname === item.href}
            layoutId="sidebar-support-active"
            onLinkClick={onLinkClick}
          />
        ))}
      </nav>
      <SidebarUserSection onAfterSignOut={onLinkClick} />
    </>
  );
}
