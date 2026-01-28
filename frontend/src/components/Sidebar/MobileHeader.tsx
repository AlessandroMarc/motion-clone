'use client';

import React from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';

export function MobileHeader(): React.ReactElement {
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 border-b bg-background">
      <div className="flex h-full items-center justify-between px-4">
        <h1 className="text-xl font-heading">Nexto</h1>
        <ThemeToggle />
      </div>
    </header>
  );
}
