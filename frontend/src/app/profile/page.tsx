'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/Auth/ProtectedRoute';
import { ProfileSettings } from '@/components/Profile/ProfileSettings';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  const { signOut } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      logger.error('Failed to sign out:', error);
    }
  };

  if (!mounted) {
    return (
      <div className="flex-1 px-4 py-4 md:px-8 md:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-title text-foreground mb-2">
              Profile Settings
            </h1>
            <p className="text-sm font-body text-muted-foreground">
              Manage your account preferences and schedule settings
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex-1 px-4 py-4 md:px-8 md:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-title text-foreground mb-2">
              Profile Settings
            </h1>
            <p className="text-sm font-body text-muted-foreground">
              Manage your account preferences and schedule settings
            </p>
          </div>
          <ProfileSettings />
          <div className="mt-4 md:mt-8">
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="w-full justify-center gap-2 md:w-auto"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
