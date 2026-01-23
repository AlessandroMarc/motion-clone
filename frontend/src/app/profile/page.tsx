'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/Auth/ProtectedRoute';
import { ProfileSettings } from '@/components/Profile/ProfileSettings';

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-title text-foreground mb-2">Profile Settings</h1>
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
      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-title text-foreground mb-2">Profile Settings</h1>
            <p className="text-sm font-body text-muted-foreground">
              Manage your account preferences and schedule settings
            </p>
          </div>
          <ProfileSettings />
        </div>
      </div>
    </ProtectedRoute>
  );
}
