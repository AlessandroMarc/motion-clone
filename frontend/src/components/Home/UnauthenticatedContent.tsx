'use client';

import { GoogleSignInButton } from './GoogleSignInButton';

interface UnauthenticatedContentProps {
  onSignIn: () => void;
  isSigningIn: boolean;
}

export function UnauthenticatedContent({
  onSignIn,
  isSigningIn,
}: UnauthenticatedContentProps) {
  return (
    <div className="text-center">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Get Started</h2>
        <p className="text-muted-foreground mb-6">
          Sign in with your Google account to access tasks and projects
        </p>
      </div>
      <GoogleSignInButton onSignIn={onSignIn} isLoading={isSigningIn} />
    </div>
  );
}
