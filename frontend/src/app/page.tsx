'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApiConnection } from '@/hooks/useApiConnection';
import {
  ConnectionError,
  WelcomeHeader,
  AuthenticatedContent,
  UnauthenticatedContent,
  LoadingState,
} from '@/components/Home';

export default function Home() {
  const { apiMessage, isApiConnected } = useApiConnection();
  const { user, loading, signInWithGoogle } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await signInWithGoogle();
    } catch (error) {
      console.error('Failed to sign in:', error);
    } finally {
      setIsSigningIn(false);
    }
  };

  if (!isApiConnected) {
    return <ConnectionError />;
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        <WelcomeHeader apiMessage={apiMessage} />

        {loading ? (
          <LoadingState />
        ) : user ? (
          <AuthenticatedContent user={user} />
        ) : (
          <UnauthenticatedContent
            onSignIn={handleGoogleSignIn}
            isSigningIn={isSigningIn}
          />
        )}
      </div>
    </div>
  );
}
