'use client';

import React from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { DesktopNavContent } from './DesktopNavContent';

export interface DesktopSidebarProps {
  onLinkClick?: () => void;
}

export function DesktopSidebar({
  onLinkClick,
}: DesktopSidebarProps): React.ReactElement {
  return (
    <div className="hidden md:flex h-full w-48 flex-col border-r bg-background">
      <div className="flex h-14 items-center justify-between border-b px-3">
        <h1 className="text-base font-heading">Nexto</h1>
        <ThemeToggle />
      </div>
      <DesktopNavContent onLinkClick={onLinkClick} />
    </div>
  );
}
