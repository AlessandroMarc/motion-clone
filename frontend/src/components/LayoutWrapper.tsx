'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname();

  // Hide sidebar on landing page
  const isLandingPage = pathname === '/';

  if (isLandingPage) {
    return <main className="flex-1 overflow-auto">{children}</main>;
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto pt-14 pb-24 md:pt-0 md:pb-0">
        {children}
      </main>
    </div>
  );
}
