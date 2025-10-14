'use client';

import { User } from '@supabase/supabase-js';
import { NavigationCards } from './NavigationCards';

interface AuthenticatedContentProps {
  user: User;
}

export function AuthenticatedContent({ user }: AuthenticatedContentProps) {
  return (
    <div className="text-center">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">
          Welcome back, {user.user_metadata?.full_name || user.email}!
        </h2>
        <p className="text-muted-foreground mb-6">
          Ready to manage your tasks and projects?
        </p>
      </div>
      <NavigationCards />
    </div>
  );
}
