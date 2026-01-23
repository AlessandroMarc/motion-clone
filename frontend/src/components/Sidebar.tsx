'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {

  CheckSquare,
  FolderOpen,
  Calendar,
  LogOut,
  User,
  Menu,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { logger } from '@/lib/logger';

const navigation = [
  {
    name: 'Calendar',
    href: '/calendar',
    icon: Calendar,
  },  
  {
    name: 'Tasks',
    href: '/tasks',
    icon: CheckSquare,
  },
  {
    name: 'Projects',
    href: '/projects',
    icon: FolderOpen,
  },
  {
    name: 'Profile',
    href: '/profile',
    icon: User,
  },
];

function NavigationContent({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      onLinkClick?.();
    } catch (error) {
      logger.error('Failed to sign out:', error);
    }
  };

  return (
    <>
      <nav className="flex-1 space-y-0.5 p-2">
        {navigation.map(item => {
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

      {/* User Profile Section */}
      <div className="border-t p-2">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : user ? (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  {user.user_metadata?.full_name || user.email}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="w-full justify-start text-muted-foreground hover:text-foreground h-8 text-xs"
            >
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Sign out
            </Button>
          </div>
        ) : (
          <div className="text-center text-xs text-muted-foreground">
            Not signed in
          </div>
        )}
      </div>
    </>
  );
}

export function Sidebar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  // Mobile header with hamburger menu
  if (isMobile) {
    return (
      <>
        <header className="md:hidden fixed top-0 left-0 right-0 z-50 h-16 border-b bg-background">
          <div className="flex h-full items-center justify-between px-4">
            <h1 className="text-xl font-semibold">Nexto</h1>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(true)}
                className="h-11 w-11 min-h-[44px] min-w-[44px]"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </div>
          </div>
        </header>
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="border-b p-6">
              <SheetTitle>Nexto</SheetTitle>
            </SheetHeader>
            <div className="flex h-full flex-col">
              <NavigationContent onLinkClick={() => setMobileMenuOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop sidebar
  return (
    <div className="hidden md:flex h-full w-48 flex-col border-r bg-background">
      <div className="flex h-14 items-center justify-between border-b px-3">
        <h1 className="text-base font-semibold">Nexto</h1>
        <ThemeToggle />
      </div>
      <NavigationContent />
    </div>
  );
}
