'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/lib/logger';

export interface SidebarUserSectionProps {
  onAfterSignOut?: () => void;
}

export function SidebarUserSection({
  onAfterSignOut,
}: SidebarUserSectionProps): React.ReactElement {
  const { user, loading, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      onAfterSignOut?.();
    } catch (error) {
      logger.error('Failed to sign out', error);
    }
  };

  return (
    <div className="border-t p-2">
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : user ? (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
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
  );
}
