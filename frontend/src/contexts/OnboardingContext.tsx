'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import type { OnboardingStatus, OnboardingStep } from '@/types';
import { userSettingsService } from '@/services/userSettingsService';
import { useAuth } from './AuthContext';
import posthog from 'posthog-js';

interface OnboardingContextType {
  status: OnboardingStatus | null;
  loading: boolean;
  updateStep: (step: OnboardingStep) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  skipOnboarding: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined
);

export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStatus = useCallback(async () => {
    if (!user?.id) {
      setStatus(null);
      setLoading(false);
      return;
    }

    try {
      const onboardingStatus = await userSettingsService.getOnboardingStatus(
        user.id
      );
      setStatus(onboardingStatus);
    } catch (error) {
      console.error('Failed to load onboarding status:', error);
      // Only reset to null on 404 (resource doesn't exist).
      // Transient errors (429, 5xx, network) should not overwrite existing status.
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('status: 404')) {
        setStatus(null);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const updateStep = useCallback(
    async (step: OnboardingStep) => {
      if (!user?.id) return;

      const previousStatus = status;
      // Optimistically update to prevent tour from re-opening during async call
      setStatus(prev => (prev ? { ...prev, step } : prev));

      try {
        await userSettingsService.updateOnboardingStep(user.id, step);
        const newStatus = await userSettingsService.getOnboardingStatus(
          user.id
        );
        setStatus(newStatus);

        // PostHog: Track step completion
        if (step) {
          posthog.capture('onboarding_step_completed', {
            step,
          });
        }
      } catch (error) {
        // Revert on failure
        setStatus(previousStatus);
        console.error('Failed to update onboarding step:', error);
        throw error;
      }
    },
    [user?.id, status]
  );

  const completeOnboarding = useCallback(async () => {
    if (!user?.id) return;

    const previousStatus = status;
    // Optimistically mark as completed to prevent tour from re-opening
    setStatus(prev =>
      prev ? { ...prev, completed: true, completed_at: new Date() } : prev
    );

    try {
      await userSettingsService.completeOnboarding(user.id);
      const newStatus = await userSettingsService.getOnboardingStatus(user.id);
      setStatus(newStatus);

      // PostHog: Track completion
      posthog.capture('onboarding_completed');
    } catch (error) {
      // Revert on failure
      setStatus(previousStatus);
      console.error('Failed to complete onboarding:', error);
      throw error;
    }
  }, [user?.id, status]);

  const skipOnboarding = useCallback(async () => {
    if (!user?.id) return;

    const previousStatus = status;
    // Optimistically mark as completed to prevent tour from re-opening
    setStatus(prev =>
      prev ? { ...prev, completed: true, completed_at: new Date() } : prev
    );

    try {
      await userSettingsService.completeOnboarding(user.id);
      const newStatus = await userSettingsService.getOnboardingStatus(user.id);
      setStatus(newStatus);

      // PostHog: Track skip
      posthog.capture('onboarding_skipped');
    } catch (error) {
      // Revert on failure
      setStatus(previousStatus);
      console.error('Failed to skip onboarding:', error);
      throw error;
    }
  }, [user?.id, status]);

  const refreshStatus = useCallback(async () => {
    await loadStatus();
  }, [loadStatus]);

  const value = {
    status,
    loading,
    updateStep,
    completeOnboarding,
    skipOnboarding,
    refreshStatus,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
