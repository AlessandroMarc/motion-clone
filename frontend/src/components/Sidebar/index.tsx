'use client';

import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileHeader } from './MobileHeader';
import { MobileBottomNav } from './MobileBottomNav';
import { DesktopSidebar } from './DesktopSidebar';

export function Sidebar(): React.ReactElement {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <>
        <MobileHeader />
        <MobileBottomNav />
      </>
    );
  }

  return <DesktopSidebar />;
}

export { sidebarNavigation } from './navigation';
export type { NavItem } from './navigation';
