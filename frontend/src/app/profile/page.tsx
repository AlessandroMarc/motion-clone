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
          <h1 className="text-2xl md:text-3xl font-heading mb-6 md:mb-8">Profile Settings</h1>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-heading mb-6 md:mb-8">Profile Settings</h1>
          <ProfileSettings />
        </div>
      </div>
    </ProtectedRoute>
  );
}
