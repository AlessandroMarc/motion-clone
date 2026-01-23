'use client';

import { useOnboarding as useOnboardingContext } from '@/contexts/OnboardingContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import { useEffect, useCallback } from 'react';
import posthog from 'posthog-js';

/**
 * Hook personalizzato per gestire la logica dell'onboarding
 * Determina se mostrare il tour e gestisce l'avanzamento degli step
 */
export function useOnboarding() {
  const { user } = useAuth();
  const pathname = usePathname();
  const {
    status,
    loading,
    updateStep,
    completeOnboarding,
    skipOnboarding,
    refreshStatus,
  } = useOnboardingContext();

  // Determina se l'onboarding è attivo (non completato e utente autenticato)
  const isOnboardingActive = !loading && user && status && !status.completed;

  // Determina se mostrare il tour per la pagina corrente
  const shouldShowTour = useCallback((): boolean => {
    if (!isOnboardingActive || !status) return false;

    // Mostra il tour solo se siamo nella pagina corretta per lo step corrente
    switch (status.step) {
      case null:
        // Primo step: creare task (pagina tasks)
        return pathname === '/tasks';
      case 'task_created':
        // Secondo step: creare progetto (pagina projects)
        return pathname === '/projects';
      case 'project_created':
        // Terzo step: schedulare (pagina calendar)
        return pathname === '/calendar';
      default:
        return false;
    }
  }, [isOnboardingActive, status, pathname]);

  // Avanza allo step successivo quando un'azione viene completata
  const advanceToNextStep = async (currentAction: 'task' | 'project' | 'schedule') => {
    if (!user || !status || status.completed) return;

    try {
      switch (currentAction) {
        case 'task':
          if (status.step === null) {
            await updateStep('task_created');
            // Naviga alla pagina projects dopo un breve delay
            setTimeout(() => {
              window.location.href = '/projects';
            }, 1000);
          }
          break;
        case 'project':
          if (status.step === 'task_created') {
            await updateStep('project_created');
            // Naviga alla pagina calendar dopo un breve delay
            setTimeout(() => {
              window.location.href = '/calendar';
            }, 1000);
          }
          break;
        case 'schedule':
          if (status.step === 'project_created') {
            await completeOnboarding();
          }
          break;
      }
    } catch (error) {
      console.error('Failed to advance onboarding step:', error);
    }
  };

  // Inizializza l'onboarding per nuovi utenti
  useEffect(() => {
    if (user && status && !status.completed && status.step === null) {
      // Nuovo utente o utente senza onboarding completato, traccia l'inizio dell'onboarding
      // Solo se non è già stato tracciato (started_at è null)
      if (!status.started_at) {
        posthog.capture('onboarding_started');
      }
    }
  }, [user, status]);

  // Debug: onboarding status tracking removed in production
  // Development debugging can be enabled via browser devtools if needed

  return {
    status,
    loading,
    isOnboardingActive,
    shouldShowTour: shouldShowTour(),
    currentStep: status?.step ?? null,
    updateStep,
    advanceToNextStep,
    completeOnboarding,
    skipOnboarding,
    refreshStatus,
  };
}
